import { Graph, GraphEdge, GraphNode } from "../graph/schema";
import { evaluateGraph } from "../graph/shapeEngine";
import {
  classNameForKind,
  formatPythonValue,
  indent,
  serializeGraph,
  timestampComment
} from "./emitUtils";

interface CodegenArtifacts {
  code: string;
  errors: string[];
  warnings: string[];
}

const topoSort = (nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] => {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });
  edges.forEach((edge) => {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    adjacency.get(edge.from)?.push(edge.to);
  });
  const queue = nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0);
  const ordered: GraphNode[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    ordered.push(node);
    adjacency.get(node.id)?.forEach((target) => {
      const next = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, next);
      if (next === 0) {
        const targetNode = nodes.find((candidate) => candidate.id === target);
        if (targetNode) {
          queue.push(targetNode);
        }
      }
    });
  }
  return ordered;
};

const pythonifyParams = (params: Record<string, unknown>) =>
  Object.entries(params)
    .map(([key, value]) => `${key}=${formatPythonValue(value)}`)
    .join(", ");

export const emitPyTorch = (graph: Graph): CodegenArtifacts => {
  const shapeContext = evaluateGraph(graph);
  const errors = Object.values(shapeContext.results)
    .filter((result) => result.status === "error")
    .flatMap((result) => result.messages.map((message) => `${result.nodeId}: ${message}`));
  if (shapeContext.hasErrors || errors.length > 0) {
    return {
      code: "",
      errors: errors.length ? errors : ["Graph contains errors. Fix issues before exporting."],
      warnings: []
    };
  }

  const nodes = topoSort(graph.nodes, graph.edges);
  const modules: string[] = [];
  const forwardLines: string[] = [];
  const tensorNames = new Map<string, string>();
  const inputNodes = nodes.filter((node) => node.kind === "Input");
  inputNodes.forEach((node, index) => {
    tensorNames.set(node.id, index === 0 ? "x" : `x_${index}`);
  });

  const incoming = new Map<string, GraphEdge[]>();
  graph.edges.forEach((edge) => {
    const list = incoming.get(edge.to) ?? [];
    list.push(edge);
    incoming.set(edge.to, list);
  });

  const needsResidual = nodes.some((node) => node.kind === "ResidualBlock");

  nodes.forEach((node) => {
    if (node.kind === "Input") {
      forwardLines.push(`# ${node.label}`);
      return;
    }
    const edges = incoming.get(node.id) ?? [];
    const upstream = edges.map((edge) => tensorNames.get(edge.from) ?? "x");
    const safeName = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
    const moduleName = `self.${safeName}`;
    switch (node.kind) {
      case "Output": {
        const assigned = upstream.length <= 1 ? upstream[0] ?? "x" : `(${upstream.join(", ")})`;
        tensorNames.set(node.id, assigned);
        break;
      }
      case "Add": {
        const expr = upstream.join(" + ");
        forwardLines.push(`${safeName} = ${expr}`);
        tensorNames.set(node.id, safeName);
        break;
      }
      case "Concat": {
        forwardLines.push(
          `${safeName} = torch.cat([${upstream.join(", ")}], dim=${node.params.dim ?? 1})`
        );
        tensorNames.set(node.id, safeName);
        break;
      }
      case "ResidualBlock": {
        modules.push(`${moduleName} = ResidualBlock(${pythonifyParams(node.params)})`);
        forwardLines.push(`${safeName} = ${moduleName}(${upstream[0] ?? "x"})`);
        tensorNames.set(node.id, safeName);
        break;
      }
      default: {
        const className = classNameForKind(node.kind);
        if (className && className !== "None") {
          modules.push(`${moduleName} = ${className}(${pythonifyParams(node.params)})`);
        }
        const callTarget = className === "None" ? upstream[0] ?? "x" : `${moduleName}(${upstream[0] ?? "x"})`;
        forwardLines.push(`${safeName} = ${callTarget}`);
        tensorNames.set(node.id, safeName);
      }
    }
  });

  const outputNodes = nodes.filter((node) => node.kind === "Output");
  let returnStatement = "return x";
  if (outputNodes.length === 1) {
    const assigned = tensorNames.get(outputNodes[0].id) ?? "x";
    returnStatement = `return ${assigned}`;
  } else if (outputNodes.length > 1) {
    const outputs = outputNodes.map((node) => tensorNames.get(node.id) ?? "x").join(", ");
    returnStatement = `return (${outputs})`;
  }

  const moduleLines = Array.from(new Set(modules));
  const initBody = moduleLines.length ? moduleLines.join("\n") : "pass";

  const inputAssignments = inputNodes.length > 1
    ? inputNodes
        .map((node, index) => `${tensorNames.get(node.id)} = inputs[${index}]`)
        .join("\n")
    : "";

  const forwardBody = [inputAssignments, ...forwardLines, returnStatement]
    .filter(Boolean)
    .join("\n");

  const residualClass = needsResidual
    ? `
class ResidualBlock(nn.Module):
${indent(
        `def __init__(self, in_channels, out_channels, stride=1, use_projection=False):
${indent(
          `super().__init__()
self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False)
self.bn1 = nn.BatchNorm2d(out_channels)
self.relu = nn.ReLU(inplace=True)
self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False)
self.bn2 = nn.BatchNorm2d(out_channels)
self.use_projection = use_projection
if use_projection:
${indent(
            `self.proj = nn.Sequential(
${indent(
              `nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
nn.BatchNorm2d(out_channels)
`,
              3
            )}
          )
else:
${indent("self.proj = nn.Identity()", 3)}
`,
          2
        )}

def forward(self, x):
${indent(
        `identity = x
if self.use_projection:
${indent("identity = self.proj(x)", 2)}
out = self.conv1(x)
out = self.bn1(out)
out = self.relu(out)
out = self.conv2(out)
out = self.bn2(out)
out = out + identity
return self.relu(out)
`,
        2
      )}
`
    : "";

  const header = `"""
PyTorch model generated from Drag & Drop IDE
${timestampComment()}
Serialized graph:
${serializeGraph(graph)}
"""`;

  const modelClass = `
class VisualNet(nn.Module):
${indent(
      `def __init__(self):
${indent(`super().__init__()\n${initBody}`, 2)}

def forward(self, ${inputNodes.length > 1 ? "*inputs" : "x"}):
${indent(forwardBody, 2)}
`,
      1
    )}`;

  const training = graph.training;
  const optimizerLine =
    training.optimizer === "Adam"
      ? "optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)"
      : "optimizer = torch.optim.SGD(model.parameters(), lr=args.lr, momentum=0.9)";

  const lossLine =
    training.loss === "CrossEntropyLoss"
      ? "criterion = nn.CrossEntropyLoss()"
      : "criterion = nn.MSELoss()";

  const scalerLine = training.mixed_precision
    ? "scaler = torch.cuda.amp.GradScaler()"
    : "scaler = None";

  const autocastStart = training.mixed_precision ? "with torch.cuda.amp.autocast():" : "";
  const backwardLines = training.mixed_precision
    ? [
        `${autocastStart}`,
        indent("outputs = model(inputs)\nloss = criterion(outputs, targets)", 1),
        "scaler.scale(loss).backward()",
        "scaler.step(optimizer)",
        "scaler.update()"
      ]
    : [
        "outputs = model(inputs)",
        "loss = criterion(outputs, targets)",
        "loss.backward()",
        "optimizer.step()"
      ];

  const trainLoop = `
def train_one_epoch(model, dataloader, criterion, optimizer, device, scaler=None):
${indent(
      `model.train()
for inputs, targets in dataloader:
${indent(
        `inputs = inputs.to(device)
targets = targets.to(device)
optimizer.zero_grad()
${backwardLines.join("\n")}
`,
        2
      )}
`,
      1
    )}

def evaluate(model, dataloader, criterion, device):
${indent(
      `model.eval()
loss_total = 0.0
with torch.no_grad():
${indent(
        `for inputs, targets in dataloader:
${indent(
          `inputs = inputs.to(device)
targets = targets.to(device)
outputs = model(inputs)
loss_total += criterion(outputs, targets).item()
`,
          3
        )}
return loss_total / max(1, len(dataloader))
`,
        2
      )}
`,
      1
    )}`;

  const numClasses = graph.training.num_classes ?? 1;
  const dummyTarget = graph.training.task === "classification"
    ? `torch.zeros(${numClasses}, dtype=torch.long)`
    : `torch.randn(${numClasses})`;

  const mainFunction = `
def main():
${indent(
      `import argparse
parser = argparse.ArgumentParser(description="VisualNet training stub")
parser.add_argument("--epochs", type=int, default=${training.epochs})
parser.add_argument("--batch-size", type=int, default=${training.batch_size})
parser.add_argument("--lr", type=float, default=${training.learning_rate})
parser.add_argument("--device", type=str, default="${training.device_pref}")
args = parser.parse_args()

preferred_device = args.device
if preferred_device == "cuda" and torch.cuda.is_available():
${indent("device = torch.device('cuda')", 2)}
elif preferred_device == "cpu":
${indent("device = torch.device('cpu')", 2)}
else:
${indent("device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')", 2)}

model = VisualNet().to(device)
${lossLine}
${optimizerLine}
${scalerLine}

class DummyDataset(Dataset):
${indent(
        `def __len__(self):
${indent("return 4", 2)}

def __getitem__(self, index):
${indent(
          `dummy_input = torch.randn(${graph.inputSpec.shape.join(", ")})
dummy_target = ${dummyTarget}
return dummy_input, dummy_target
`,
          2
        )}
`,
        1
      )}

dataloader = DataLoader(DummyDataset(), batch_size=args.batch_size)
for epoch in range(args.epochs):
${indent(
        `train_one_epoch(model, dataloader, criterion, optimizer, device, scaler)
val_loss = evaluate(model, dataloader, criterion, device)
print(f"Epoch {epoch + 1}: val_loss={val_loss:.4f}")
`,
        2
      )}

if __name__ == "__main__":
${indent("main()", 1)}
`,
      1
    )}`;

  const code = `import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

${header}
${residualClass}
${modelClass}
${trainLoop}
${mainFunction}`;

  return {
    code,
    errors: [],
    warnings: Object.values(shapeContext.results)
      .filter((result) => result.messages.length && result.status === "warning")
      .flatMap((result) => result.messages.map((message) => `${result.nodeId}: ${message}`))
  };
};
