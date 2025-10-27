import { Graph, GraphEdge, GraphNode, NodeStatus, Shape, ShapeContext, ShapeResult } from "./schema";
import { registry } from "./registry";

type TopoResult = {
  ordered: GraphNode[];
  cycles: string[];
};

const topoSort = (nodes: GraphNode[], edges: GraphEdge[]): TopoResult => {
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    outgoing.set(node.id, []);
  });
  edges.forEach((edge) => {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    outgoing.get(edge.from)?.push(edge.to);
  });
  const queue: GraphNode[] = nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0);
  const ordered: GraphNode[] = [];
  const visited = new Set<string>();
  while (queue.length) {
    const node = queue.shift()!;
    ordered.push(node);
    visited.add(node.id);
    outgoing.get(node.id)?.forEach((target) => {
      const current = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, current);
      if (current === 0) {
        const targetNode = nodes.find((n) => n.id === target);
        if (targetNode) {
          queue.push(targetNode);
        }
      }
    });
  }
  const cycles = nodes.filter((node) => !visited.has(node.id)).map((node) => node.id);
  return { ordered, cycles };
};

const resultFor = (partial: Partial<ShapeResult>): ShapeResult => ({
  nodeId: partial.nodeId!,
  dtype: partial.dtype,
  shape: partial.shape,
  status: partial.status ?? "pending",
  messages: partial.messages ?? []
});

const stringifyShape = (shape?: Shape) => {
  if (!shape) return "?";
  return `[${shape.map((dim) => (dim === -1 ? "B" : dim)).join(",")}]`;
};

export const evaluateGraph = (graph: Graph): ShapeContext => {
  const { ordered, cycles } = topoSort(graph.nodes, graph.edges);
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, GraphEdge[]>();
  graph.edges.forEach((edge) => {
    const list = incoming.get(edge.to) ?? [];
    list.push(edge);
    incoming.set(edge.to, list);
  });
  const results: Record<string, ShapeResult> = {};
  const trace: string[] = [];
  let hasErrors = false;

  if (cycles.length) {
    cycles.forEach((id) => {
      const node = nodeMap.get(id);
      if (!node) return;
      results[id] = resultFor({
        nodeId: id,
        status: "error",
        messages: ["Cycle detected"]
      });
      hasErrors = true;
    });
  }

  ordered.forEach((node) => {
    const entry = registry[node.kind];
    if (!entry) {
      results[node.id] = resultFor({
        nodeId: node.id,
        status: "error",
        messages: ["Unknown node kind"]
      });
      hasErrors = true;
      return;
    }
    const edges = incoming.get(node.id) ?? [];
    const inputShapes: Shape[] = edges
      .map((edge) => results[edge.from]?.shape)
      .filter((shape): shape is Shape => Array.isArray(shape));
    const missingInputs = edges.filter((edge) => !results[edge.from]);
    const messages: string[] = [];
    let status: NodeStatus = "valid";
    if (missingInputs.length > 0) {
      messages.push("Waiting for upstream nodes");
      status = "warning";
    }
    if (inputShapes.length < entry.minInputs) {
      messages.push(`Requires at least ${entry.minInputs} input(s)`);
      status = "error";
    }
    if (entry.maxInputs && inputShapes.length > entry.maxInputs) {
      messages.push(`Supports up to ${entry.maxInputs} inputs`);
      status = "error";
    }
    let shape: Shape | undefined;
    try {
      const paramAccessor = <T>(key: string): T => node.params[key] as T;
      shape = entry.inferShape(inputShapes, node, { getParam: paramAccessor });
    } catch (error) {
      status = "error";
      messages.push(error instanceof Error ? error.message : "Shape inference failure");
    }
    if (!shape && node.kind === "Input") {
      shape = graph.inputSpec.shape;
    }
    const validations = entry.validate ? entry.validate(inputShapes, node) : [];
    validations.forEach((validation) => {
      messages.push(validation.message);
      if (validation.level === "error") {
        status = "error";
      } else if (status !== "error") {
        status = "warning";
      }
    });
    if (node.kind === "Input" && (!Array.isArray(shape) || shape.length === 0)) {
      shape = graph.inputSpec.shape;
    }
    if (!Array.isArray(shape)) {
      status = "error";
      messages.push("Shape inference returned invalid result");
    }
    if (status === "error") {
      hasErrors = true;
    }
    const traceLabel = `${node.label} ${stringifyShape(shape as Shape)}`;
    if (node.kind !== "Input") {
      const sources = edges
        .map((edge) => nodeMap.get(edge.from)?.label ?? edge.from)
        .join(", ");
      trace.push(`${sources} → ${traceLabel}`);
    } else {
      trace.push(`Input ${traceLabel}`);
    }
    results[node.id] = resultFor({
      nodeId: node.id,
      shape: shape as Shape,
      status,
      messages
    });
  });

  return { results, trace, hasErrors };
};
