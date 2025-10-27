import { GraphNode, NodeRegistry, Shape } from "./schema";

const toTuple = (value: number | number[] | string | string[], fallback: number): [number, number] => {
  if (Array.isArray(value)) {
    return [Number(value[0] ?? fallback), Number(value[1] ?? fallback)];
  }
  const num = Number(value ?? fallback);
  return [num, num];
};

const conv2dOutput = (input: number, kernel: number, stride: number, padding: number, dilation = 1) => {
  return Math.floor((input + 2 * padding - dilation * (kernel - 1) - 1) / stride + 1);
};

const flattenShape = (shape: Shape, start = 1, end = -1): Shape => {
  if (shape.length === 0) return shape;
  const resolvedEnd = end < 0 ? shape.length + end : end;
  const prefix = shape.slice(0, start);
  const middle = shape.slice(start, resolvedEnd + 1);
  const suffix = shape.slice(resolvedEnd + 1);
  const flattened = middle.reduce((acc, dim) => (acc < 0 || dim < 0 ? -1 : acc * dim), 1);
  return [...prefix, flattened, ...suffix];
};

const identityShape = (shape: Shape) => [...shape];

const poolingShape = (inputShape: Shape, node: GraphNode, kernelKey: string, strideKey: string, paddingKey: string) => {
  if (inputShape.length !== 4) {
    return inputShape;
  }
  const kernel = toTuple(node.params[kernelKey] as number | number[] | string | string[], 1);
  const stride = toTuple(
    (node.params[strideKey] ?? kernel) as number | number[] | string | string[],
    kernel[0]
  );
  const padding = toTuple(node.params[paddingKey] as number | number[] | string | string[], 0);
  const [kernelH, kernelW] = kernel;
  const [strideH, strideW] = stride;
  const [padH, padW] = padding;
  const [b, c, h, w] = inputShape;
  return [b, c, conv2dOutput(h, kernelH, strideH, padH), conv2dOutput(w, kernelW, strideW, padW)];
};

export const registry: NodeRegistry = {
  Input: {
    kind: "Input",
    description: "Model input specification.",
    category: "IO",
    params: {
      shape: {
        label: "Shape",
        type: "number-array",
        default: [1, 3, 224, 224],
        required: true,
        helperText: "Use -1 for dynamic batch dimension"
      },
      dtype: {
        label: "DType",
        type: "select",
        default: "float32",
        options: [
          { label: "float32", value: "float32" },
          { label: "float16", value: "float16" },
          { label: "bfloat16", value: "bfloat16" },
          { label: "int64", value: "int64" },
          { label: "int32", value: "int32" }
        ]
      }
    },
    minInputs: 0,
    outputs: 1,
    inferShape: (_, node) => node.params.shape as number[]
  },
  Output: {
    kind: "Output",
    description: "Graph output placeholder.",
    category: "IO",
    params: {},
    minInputs: 1,
    outputs: 0,
    inferShape: (inputs) => inputs[0]
  },
  Linear: {
    kind: "Linear",
    description: "Fully-connected layer",
    category: "Core",
    params: {
      in_features: {
        label: "In Features",
        type: "number",
        default: 128,
        required: true
      },
      out_features: {
        label: "Out Features",
        type: "number",
        default: 64,
        required: true
      },
      bias: {
        label: "Bias",
        type: "boolean",
        default: true
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => {
      const input = inputs[0] ?? [];
      if (input.length < 2) return input;
      const batch = input[0];
      return [batch, Number(node.params.out_features)];
    },
    validate: (inputs, node) => {
      const issues: { level: "warning" | "error"; message: string }[] = [];
      const input = inputs[0];
      if (!input) return issues;
      const expected = Number(node.params.in_features);
      const lastDim = input[input.length - 1];
      if (expected !== lastDim && expected >= 0 && lastDim >= 0) {
        issues.push({ level: "error", message: `Expected in_features=${expected} but received ${lastDim}` });
      }
      return issues;
    }
  },
  ReLU: {
    kind: "ReLU",
    description: "ReLU activation",
    category: "Activation",
    params: {},
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs) => identityShape(inputs[0])
  },
  LeakyReLU: {
    kind: "LeakyReLU",
    description: "Leaky ReLU activation",
    category: "Activation",
    params: {
      negative_slope: {
        label: "Negative Slope",
        type: "number",
        default: 0.01,
        min: 0,
        step: 0.01
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs) => identityShape(inputs[0])
  },
  Sigmoid: {
    kind: "Sigmoid",
    description: "Sigmoid activation",
    category: "Activation",
    params: {},
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs) => identityShape(inputs[0])
  },
  Tanh: {
    kind: "Tanh",
    description: "Tanh activation",
    category: "Activation",
    params: {},
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs) => identityShape(inputs[0])
  },
  BatchNorm1d: {
    kind: "BatchNorm1d",
    description: "1D BatchNorm",
    category: "Normalization",
    params: {
      num_features: {
        label: "Num Features",
        type: "number",
        default: 64,
        required: true
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs) => identityShape(inputs[0])
  },
  BatchNorm2d: {
    kind: "BatchNorm2d",
    description: "2D BatchNorm",
    category: "Normalization",
    params: {
      num_features: {
        label: "Num Features",
        type: "number",
        default: 64,
        required: true
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs) => identityShape(inputs[0])
  },
  Dropout: {
    kind: "Dropout",
    description: "Dropout layer",
    category: "Regularization",
    params: {
      p: {
        label: "Dropout P",
        type: "number",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs) => identityShape(inputs[0])
  },
  Flatten: {
    kind: "Flatten",
    description: "Flatten tensor",
    category: "Utility",
    params: {
      start_dim: {
        label: "Start Dim",
        type: "number",
        default: 1
      },
      end_dim: {
        label: "End Dim",
        type: "number",
        default: -1
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => {
      const [input] = inputs;
      if (!input) return input;
      return flattenShape(
        input,
        Number(node.params.start_dim ?? 1),
        Number(node.params.end_dim ?? -1)
      );
    }
  },
  Conv2d: {
    kind: "Conv2d",
    description: "2D Convolution",
    category: "Convolution",
    params: {
      in_channels: {
        label: "In Channels",
        type: "number",
        default: 3,
        required: true
      },
      out_channels: {
        label: "Out Channels",
        type: "number",
        default: 64,
        required: true
      },
      kernel_size: {
        label: "Kernel Size",
        type: "number",
        default: 3,
        helperText: "Int or tuple"
      },
      stride: {
        label: "Stride",
        type: "number",
        default: 1
      },
      padding: {
        label: "Padding",
        type: "number",
        default: 0
      },
      bias: {
        label: "Bias",
        type: "boolean",
        default: true
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => {
      const input = inputs[0];
      if (!input || input.length !== 4) return input;
      const [batch, _in, height, width] = input;
      const [kernelH, kernelW] = toTuple(node.params.kernel_size as number | number[] | string | string[], 3);
      const [strideH, strideW] = toTuple(
        (node.params.stride ?? node.params.kernel_size) as number | number[] | string | string[],
        1
      );
      const [padH, padW] = toTuple(node.params.padding as number | number[] | string | string[], 0);
      return [
        batch,
        Number(node.params.out_channels),
        conv2dOutput(height, kernelH, strideH, padH),
        conv2dOutput(width, kernelW, strideW, padW)
      ];
    },
    validate: (inputs, node) => {
      const issues: { level: "warning" | "error"; message: string }[] = [];
      const input = inputs[0];
      if (!input) return issues;
      if (input.length !== 4) {
        issues.push({ level: "error", message: "Conv2d expects input of shape [B,C,H,W]" });
        return issues;
      }
      const channels = input[1];
      const expected = Number(node.params.in_channels);
      if (channels !== expected && channels >= 0 && expected >= 0) {
        issues.push({ level: "error", message: `Conv2d expected in_channels=${expected} but received ${channels}` });
      }
      return issues;
    }
  },
  MaxPool2d: {
    kind: "MaxPool2d",
    description: "2D Max pooling",
    category: "Pooling",
    params: {
      kernel_size: {
        label: "Kernel",
        type: "number",
        default: 2
      },
      stride: {
        label: "Stride",
        type: "number",
        default: 2
      },
      padding: {
        label: "Padding",
        type: "number",
        default: 0
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => poolingShape(inputs[0], node, "kernel_size", "stride", "padding")
  },
  AvgPool2d: {
    kind: "AvgPool2d",
    description: "2D Average pooling",
    category: "Pooling",
    params: {
      kernel_size: {
        label: "Kernel",
        type: "number",
        default: 2
      },
      stride: {
        label: "Stride",
        type: "number",
        default: 2
      },
      padding: {
        label: "Padding",
        type: "number",
        default: 0
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => poolingShape(inputs[0], node, "kernel_size", "stride", "padding")
  },
  AdaptiveAvgPool2d: {
    kind: "AdaptiveAvgPool2d",
    description: "Adaptive Avg Pool",
    category: "Pooling",
    params: {
      output_size: {
        label: "Output Size",
        type: "number",
        default: 1,
        helperText: "Int or tuple"
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => {
      const input = inputs[0];
      if (!input || input.length !== 4) return input;
      const [batch, channels] = input;
      const output = node.params.output_size;
      if (Array.isArray(output)) {
        return [batch, channels, Number(output[0] ?? 1), Number(output[1] ?? 1)];
      }
      const size = Number(output ?? 1);
      return [batch, channels, size, size];
    }
  },
  Add: {
    kind: "Add",
    description: "Element-wise add",
    category: "Graph",
    params: {},
    minInputs: 2,
    maxInputs: 8,
    outputs: 1,
    inferShape: (inputs) => inputs[0],
    validate: (inputs) => {
      const issues: { level: "warning" | "error"; message: string }[] = [];
      const reference = JSON.stringify(inputs[0] ?? []);
      inputs.forEach((shape, idx) => {
        if (JSON.stringify(shape ?? []) !== reference) {
          issues.push({ level: "error", message: `Input ${idx + 1} shape mismatch for Add` });
        }
      });
      return issues;
    }
  },
  Concat: {
    kind: "Concat",
    description: "Concatenate tensors",
    category: "Graph",
    params: {
      dim: {
        label: "Concat Dim",
        type: "number",
        default: 1
      }
    },
    minInputs: 2,
    maxInputs: 8,
    outputs: 1,
    inferShape: (inputs, node) => {
      const dim = Number(node.params.dim ?? 1);
      const base = inputs[0];
      if (!base) return base;
      const result = [...base];
      let sum = base[dim] ?? 0;
      for (let i = 1; i < inputs.length; i += 1) {
        const shape = inputs[i];
        if (!shape) continue;
        sum += shape[dim] ?? 0;
      }
      result[dim] = sum;
      return result;
    },
    validate: (inputs, node) => {
      const dim = Number(node.params.dim ?? 1);
      const issues: { level: "warning" | "error"; message: string }[] = [];
      const reference = inputs[0];
      if (!reference) return issues;
      inputs.slice(1).forEach((shape, idx) => {
        shape?.forEach((value, axis) => {
          if (axis === dim) return;
          if (reference[axis] !== value && reference[axis] >= 0 && value >= 0) {
            issues.push({
              level: "error",
              message: `Concat input ${idx + 2} mismatch on dim ${axis}`
            });
          }
        });
      });
      return issues;
    }
  },
  ResidualBlock: {
    kind: "ResidualBlock",
    description: "Conv-BN-ReLU x2 residual block",
    category: "Composite",
    params: {
      in_channels: {
        label: "In Channels",
        type: "number",
        default: 64
      },
      out_channels: {
        label: "Out Channels",
        type: "number",
        default: 64
      },
      stride: {
        label: "Stride",
        type: "number",
        default: 1
      },
      use_projection: {
        label: "Projection",
        type: "boolean",
        default: false,
        helperText: "Use 1x1 conv shortcut"
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => {
      const input = inputs[0];
      if (!input || input.length !== 4) return input;
      const [batch, _in, h, w] = input;
      const stride = Number(node.params.stride ?? 1);
      const kernel = 3;
      const padding = 1;
      const outHeight = conv2dOutput(h, kernel, stride, padding);
      const outWidth = conv2dOutput(w, kernel, stride, padding);
      return [batch, Number(node.params.out_channels), outHeight, outWidth];
    },
    validate: (inputs, node) => {
      const input = inputs[0];
      const issues: { level: "warning" | "error"; message: string }[] = [];
      if (!input) return issues;
      const inChannels = input[1];
      const expected = Number(node.params.in_channels ?? inChannels);
      if (inChannels !== expected && inChannels >= 0 && expected >= 0) {
        issues.push({
          level: "warning",
          message: `Residual expects in_channels ${expected} but received ${inChannels}`
        });
      }
      return issues;
    }
  },
  Embeddings: {
    kind: "Embeddings",
    description: "nn.Embedding layer",
    category: "Sequence",
    params: {
      num_embeddings: {
        label: "Vocab Size",
        type: "number",
        default: 1000
      },
      embedding_dim: {
        label: "Embedding Dim",
        type: "number",
        default: 128
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => {
      const input = inputs[0];
      if (!input) return input;
      if (input.length === 1) {
        return [input[0], Number(node.params.embedding_dim)];
      }
      if (input.length === 2) {
        return [input[0], input[1], Number(node.params.embedding_dim)];
      }
      return [...input, Number(node.params.embedding_dim)];
    }
  },
  LSTM: {
    kind: "LSTM",
    description: "LSTM block",
    category: "Sequence",
    params: {
      input_size: {
        label: "Input Size",
        type: "number",
        default: 128
      },
      hidden_size: {
        label: "Hidden Size",
        type: "number",
        default: 256
      },
      num_layers: {
        label: "Layers",
        type: "number",
        default: 1
      },
      bidirectional: {
        label: "Bidirectional",
        type: "boolean",
        default: false
      },
      batch_first: {
        label: "Batch First",
        type: "boolean",
        default: true
      },
      dropout: {
        label: "Dropout",
        type: "number",
        default: 0,
        step: 0.1,
        min: 0,
        max: 1
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => {
      const input = inputs[0];
      if (!input) return input;
      const batchFirst = Boolean(node.params.batch_first ?? true);
      const hidden = Number(node.params.hidden_size ?? 256);
      const bidirectional = Boolean(node.params.bidirectional);
      const factor = bidirectional ? 2 : 1;
      if (batchFirst) {
        const [batch, seq] = input;
        return [batch, seq, hidden * factor];
      }
      const [seq, batch] = input;
      return [seq, batch, hidden * factor];
    },
    validate: (inputs, node) => {
      const issues: { level: "warning" | "error"; message: string }[] = [];
      const input = inputs[0];
      if (!input) return issues;
      const batchFirst = Boolean(node.params.batch_first ?? true);
      const featureDim = batchFirst ? input[2] : input[2];
      const expected = Number(node.params.input_size ?? featureDim);
      if (featureDim !== expected && featureDim >= 0 && expected >= 0) {
        issues.push({ level: "error", message: `Expected LSTM input_size ${expected} but received ${featureDim}` });
      }
      return issues;
    }
  },
  GRU: {
    kind: "GRU",
    description: "GRU block",
    category: "Sequence",
    params: {
      input_size: {
        label: "Input Size",
        type: "number",
        default: 128
      },
      hidden_size: {
        label: "Hidden Size",
        type: "number",
        default: 256
      },
      num_layers: {
        label: "Layers",
        type: "number",
        default: 1
      },
      bidirectional: {
        label: "Bidirectional",
        type: "boolean",
        default: false
      },
      batch_first: {
        label: "Batch First",
        type: "boolean",
        default: true
      },
      dropout: {
        label: "Dropout",
        type: "number",
        default: 0,
        step: 0.1,
        min: 0,
        max: 1
      }
    },
    minInputs: 1,
    outputs: 1,
    inferShape: (inputs, node) => {
      const input = inputs[0];
      if (!input) return input;
      const batchFirst = Boolean(node.params.batch_first ?? true);
      const hidden = Number(node.params.hidden_size ?? 256);
      const bidirectional = Boolean(node.params.bidirectional);
      const factor = bidirectional ? 2 : 1;
      if (batchFirst) {
        const [batch, seq] = input;
        return [batch, seq, hidden * factor];
      }
      const [seq, batch] = input;
      return [seq, batch, hidden * factor];
    }
  }
};

export const orderedKinds = Object.keys(registry) as (keyof typeof registry)[];

export const getDefaultParams = (kind: keyof typeof registry) => {
  const entry = registry[kind];
  return Object.fromEntries(
    Object.entries(entry.params).map(([key, value]) => [key, value.default])
  );
};
