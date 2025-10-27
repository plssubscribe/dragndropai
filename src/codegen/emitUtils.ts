export const indent = (code: string, level = 1) => {
  const pad = "  ".repeat(level);
  return code
    .split("\n")
    .map((line) => (line ? pad + line : line))
    .join("\n");
};

export const timestampComment = () => {
  const now = new Date();
  return `# Generated on ${now.toISOString()}`;
};

export const serializeGraph = (graph: unknown) => {
  try {
    return JSON.stringify(graph, null, 2);
  } catch (error) {
    return "{}";
  }
};

export const snakeCase = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();

export const classNameForKind = (kind: string) => {
  switch (kind) {
    case "ReLU":
      return "nn.ReLU";
    case "LeakyReLU":
      return "nn.LeakyReLU";
    case "Sigmoid":
      return "nn.Sigmoid";
    case "Tanh":
      return "nn.Tanh";
    case "BatchNorm1d":
      return "nn.BatchNorm1d";
    case "BatchNorm2d":
      return "nn.BatchNorm2d";
    case "Dropout":
      return "nn.Dropout";
    case "Flatten":
      return "nn.Flatten";
    case "Conv2d":
      return "nn.Conv2d";
    case "MaxPool2d":
      return "nn.MaxPool2d";
    case "AvgPool2d":
      return "nn.AvgPool2d";
    case "AdaptiveAvgPool2d":
      return "nn.AdaptiveAvgPool2d";
    case "Linear":
      return "nn.Linear";
    case "Add":
    case "Concat":
      return "None";
    case "ResidualBlock":
      return "ResidualBlock";
    case "Embeddings":
      return "nn.Embedding";
    case "LSTM":
      return "nn.LSTM";
    case "GRU":
      return "nn.GRU";
    case "Input":
    case "Output":
      return "None";
    default:
      return "nn.Identity";
  }
};

export const formatPythonValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatPythonValue(item)).join(", ")}]`;
  }
  if (typeof value === "string") {
    return `'${value}'`;
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  return String(value);
};
