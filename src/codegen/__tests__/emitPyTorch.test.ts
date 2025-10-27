import { describe, expect, it } from "vitest";
import { emitPyTorch } from "../emitPyTorch";
import { Graph } from "../../graph/schema";

const sampleGraph: Graph = {
  nodes: [
    { id: "input", kind: "Input", label: "Input", params: { shape: [1, 3, 32, 32], dtype: "float32" } },
    {
      id: "conv",
      kind: "Conv2d",
      label: "Conv",
      params: { in_channels: 3, out_channels: 8, kernel_size: 3, stride: 1, padding: 1, bias: true }
    },
    { id: "relu", kind: "ReLU", label: "ReLU", params: {} },
    { id: "flat", kind: "Flatten", label: "Flatten", params: { start_dim: 1, end_dim: -1 } },
    { id: "fc", kind: "Linear", label: "Linear", params: { in_features: 8 * 32 * 32, out_features: 10, bias: true } },
    { id: "output", kind: "Output", label: "Output", params: {} }
  ],
  edges: [
    { id: "e1", from: "input", to: "conv" },
    { id: "e2", from: "conv", to: "relu" },
    { id: "e3", from: "relu", to: "flat" },
    { id: "e4", from: "flat", to: "fc" },
    { id: "e5", from: "fc", to: "output" }
  ],
  training: {
    task: "classification",
    num_classes: 10,
    loss: "CrossEntropyLoss",
    optimizer: "Adam",
    learning_rate: 0.001,
    batch_size: 16,
    epochs: 5,
    mixed_precision: false,
    device_pref: "auto"
  },
  inputSpec: {
    shape: [1, 3, 32, 32],
    dtype: "float32"
  }
};

describe("emitPyTorch", () => {
  it("generates executable class", () => {
    const artifacts = emitPyTorch(sampleGraph);
    expect(artifacts.errors).toHaveLength(0);
    expect(artifacts.code).toContain("class VisualNet(nn.Module)");
    expect(artifacts.code).toContain("def main():");
  });
});
