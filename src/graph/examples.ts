import { Graph } from "./schema";
import { getDefaultParams } from "./registry";

const baseTraining = {
  task: "classification" as const,
  num_classes: 10,
  loss: "CrossEntropyLoss" as const,
  optimizer: "Adam" as const,
  learning_rate: 1e-3,
  batch_size: 32,
  epochs: 10,
  mixed_precision: false,
  device_pref: "auto" as const
};

export const createEmptyGraph = (): Graph => ({
  nodes: [
    {
      id: "input",
      kind: "Input",
      label: "Input",
      params: { ...getDefaultParams("Input"), shape: [1, 3, 224, 224] }
    },
    {
      id: "output",
      kind: "Output",
      label: "Output",
      params: {}
    }
  ],
  edges: [
    {
      id: "input-output",
      from: "input",
      to: "output"
    }
  ],
  training: { ...baseTraining },
  inputSpec: {
    shape: [1, 3, 224, 224],
    dtype: "float32"
  }
});

const id = (() => {
  let idx = 0;
  return (prefix: string) => `${prefix}-${idx++}`;
})();

const node = (kind: Parameters<typeof getDefaultParams>[0], label: string, params?: Record<string, unknown>) => ({
  id: id(kind.toLowerCase()),
  kind,
  label,
  params: { ...getDefaultParams(kind), ...params }
});

const edge = (from: string, to: string) => ({
  id: `${from}-${to}`,
  from,
  to
});

export const exampleGraphs: Record<string, Graph> = {
  "MLP (MNIST-like)": {
    nodes: [
      node("Input", "Input", { shape: [1, 784] }),
      node("Flatten", "Flatten"),
      node("Linear", "Linear 1", { in_features: 784, out_features: 256 }),
      node("ReLU", "ReLU 1"),
      node("Dropout", "Dropout", { p: 0.2 }),
      node("Linear", "Linear 2", { in_features: 256, out_features: 10 }),
      node("Output", "Output")
    ],
    edges: [
      edge("input-0", "flatten-1"),
      edge("flatten-1", "linear-2"),
      edge("linear-2", "relu-3"),
      edge("relu-3", "dropout-4"),
      edge("dropout-4", "linear-5"),
      edge("linear-5", "output-6")
    ],
    training: { ...baseTraining, batch_size: 64 },
    inputSpec: {
      shape: [1, 1, 28, 28],
      dtype: "float32"
    }
  },
  "Simple CNN (224x224)": {
    nodes: [
      node("Input", "Image", { shape: [1, 3, 224, 224] }),
      node("Conv2d", "Conv7x7", { in_channels: 3, out_channels: 64, kernel_size: 7, stride: 2, padding: 3 }),
      node("BatchNorm2d", "BN1", { num_features: 64 }),
      node("ReLU", "ReLU"),
      node("MaxPool2d", "MaxPool", { kernel_size: 3, stride: 2, padding: 1 }),
      node("Conv2d", "Conv3x3", { in_channels: 64, out_channels: 128, kernel_size: 3, padding: 1 }),
      node("ReLU", "ReLU 2"),
      node("Flatten", "Flatten"),
      node("Linear", "Classifier", { in_features: 128 * 56 * 56, out_features: 1000 }),
      node("Output", "Output")
    ],
    edges: [
      edge("input-7", "conv2d-8"),
      edge("conv2d-8", "batchnorm2d-9"),
      edge("batchnorm2d-9", "relu-10"),
      edge("relu-10", "maxpool2d-11"),
      edge("maxpool2d-11", "conv2d-12"),
      edge("conv2d-12", "relu-13"),
      edge("relu-13", "flatten-14"),
      edge("flatten-14", "linear-15"),
      edge("linear-15", "output-16")
    ],
    training: { ...baseTraining, batch_size: 16 },
    inputSpec: {
      shape: [1, 3, 224, 224],
      dtype: "float32"
    }
  },
  "Residual block chain": {
    nodes: [
      node("Input", "Image", { shape: [1, 64, 56, 56] }),
      node("ResidualBlock", "ResBlock1", { in_channels: 64, out_channels: 64 }),
      node("ResidualBlock", "ResBlock2", { in_channels: 64, out_channels: 128, stride: 2, use_projection: true }),
      node("ReLU", "Post-ReLU"),
      node("AdaptiveAvgPool2d", "Adaptive Pool", { output_size: 1 }),
      node("Flatten", "Flatten"),
      node("Linear", "Classifier", { in_features: 128, out_features: 10 }),
      node("Output", "Output")
    ],
    edges: [
      edge("input-17", "residualblock-18"),
      edge("residualblock-18", "residualblock-19"),
      edge("residualblock-19", "relu-20"),
      edge("relu-20", "adaptiveavgpool2d-21"),
      edge("adaptiveavgpool2d-21", "flatten-22"),
      edge("flatten-22", "linear-23"),
      edge("linear-23", "output-24")
    ],
    training: { ...baseTraining, epochs: 30 },
    inputSpec: {
      shape: [1, 64, 56, 56],
      dtype: "float32"
    }
  },
  "LSTM text classifier": {
    nodes: [
      node("Input", "Tokens", { shape: [1, 128] }),
      node("Embeddings", "Embedding", { num_embeddings: 20000, embedding_dim: 256 }),
      node("LSTM", "LSTM", { input_size: 256, hidden_size: 128, batch_first: true }),
      node("Flatten", "Flatten"),
      node("Linear", "Classifier", { in_features: 128 * 128, out_features: 2 }),
      node("Output", "Output")
    ],
    edges: [
      edge("input-25", "embeddings-26"),
      edge("embeddings-26", "lstm-27"),
      edge("lstm-27", "flatten-28"),
      edge("flatten-28", "linear-29"),
      edge("linear-29", "output-30")
    ],
    training: { ...baseTraining, num_classes: 2, epochs: 5 },
    inputSpec: {
      shape: [1, 128],
      dtype: "int64"
    }
  }
};
