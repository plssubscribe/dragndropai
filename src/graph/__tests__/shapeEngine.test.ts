import { describe, expect, it } from "vitest";
import { evaluateGraph } from "../shapeEngine";
import { Graph } from "../schema";

const buildGraph = (overrides: Partial<Graph>): Graph => ({
  nodes: [],
  edges: [],
  training: {
    task: "classification",
    num_classes: 10,
    loss: "CrossEntropyLoss",
    optimizer: "Adam",
    learning_rate: 0.001,
    batch_size: 32,
    epochs: 1,
    mixed_precision: false,
    device_pref: "auto"
  },
  inputSpec: {
    shape: [1, 3, 224, 224],
    dtype: "float32"
  },
  ...overrides
});

describe("shapeEngine", () => {
  it("infers conv/pool/flatten/linear pipeline", () => {
    const graph = buildGraph({
      nodes: [
        { id: "input", kind: "Input", label: "Input", params: { shape: [1, 3, 32, 32], dtype: "float32" } },
        {
          id: "conv",
          kind: "Conv2d",
          label: "Conv",
          params: { in_channels: 3, out_channels: 16, kernel_size: 3, stride: 1, padding: 1, bias: true }
        },
        {
          id: "pool",
          kind: "MaxPool2d",
          label: "Pool",
          params: { kernel_size: 2, stride: 2, padding: 0 }
        },
        { id: "flatten", kind: "Flatten", label: "Flatten", params: { start_dim: 1, end_dim: -1 } },
        {
          id: "linear",
          kind: "Linear",
          label: "Linear",
          params: { in_features: 16 * 16 * 16, out_features: 10, bias: true }
        },
        { id: "output", kind: "Output", label: "Output", params: {} }
      ],
      edges: [
        { id: "e1", from: "input", to: "conv" },
        { id: "e2", from: "conv", to: "pool" },
        { id: "e3", from: "pool", to: "flatten" },
        { id: "e4", from: "flatten", to: "linear" },
        { id: "e5", from: "linear", to: "output" }
      ]
    });
    const context = evaluateGraph(graph);
    expect(context.results.linear.shape).toEqual([1, 10]);
    expect(context.results.pool.shape).toEqual([1, 16, 16, 16]);
    expect(context.hasErrors).toBe(false);
  });

  it("detects concat dimension mismatch", () => {
    const graph = buildGraph({
      nodes: [
        { id: "input", kind: "Input", label: "Input", params: { shape: [1, 4], dtype: "float32" } },
        { id: "a", kind: "Linear", label: "A", params: { in_features: 4, out_features: 4, bias: true } },
        { id: "b", kind: "Linear", label: "B", params: { in_features: 4, out_features: 6, bias: true } },
        { id: "concat", kind: "Concat", label: "Concat", params: { dim: 1 } },
        { id: "output", kind: "Output", label: "Output", params: {} }
      ],
      edges: [
        { id: "e1", from: "input", to: "a" },
        { id: "e2", from: "input", to: "b" },
        { id: "e3", from: "a", to: "concat" },
        { id: "e4", from: "b", to: "concat" },
        { id: "e5", from: "concat", to: "output" }
      ]
    });
    const context = evaluateGraph(graph);
    const concatResult = context.results.concat;
    expect(concatResult.status).toBe("warning");
  });

  it("handles residual block output shape", () => {
    const graph = buildGraph({
      nodes: [
        { id: "input", kind: "Input", label: "Input", params: { shape: [1, 64, 56, 56], dtype: "float32" } },
        {
          id: "res",
          kind: "ResidualBlock",
          label: "Residual",
          params: { in_channels: 64, out_channels: 128, stride: 2, use_projection: true }
        },
        { id: "output", kind: "Output", label: "Output", params: {} }
      ],
      edges: [
        { id: "e1", from: "input", to: "res" },
        { id: "e2", from: "res", to: "output" }
      ]
    });
    const context = evaluateGraph(graph);
    expect(context.results.res.shape).toEqual([1, 128, 28, 28]);
  });
});
