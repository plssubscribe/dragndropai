export type DType = "float32" | "float16" | "bfloat16" | "int64" | "int32";
export type Shape = number[];

export type NodeKind =
  | "Input"
  | "Output"
  | "Linear"
  | "ReLU"
  | "LeakyReLU"
  | "Sigmoid"
  | "Tanh"
  | "BatchNorm1d"
  | "BatchNorm2d"
  | "Dropout"
  | "Flatten"
  | "Conv2d"
  | "MaxPool2d"
  | "AvgPool2d"
  | "AdaptiveAvgPool2d"
  | "Add"
  | "Concat"
  | "ResidualBlock"
  | "Embeddings"
  | "LSTM"
  | "GRU";

export type ParamValue = number | string | boolean | number[] | string[];

export interface NodeParams {
  [key: string]: ParamValue;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  params: NodeParams;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  port?: string;
}

export interface TrainingConfig {
  task: "classification" | "regression";
  num_classes?: number;
  loss: "CrossEntropyLoss" | "MSELoss";
  optimizer: "Adam" | "SGD";
  learning_rate: number;
  batch_size: number;
  epochs: number;
  mixed_precision: boolean;
  device_pref: "auto" | "cpu" | "cuda";
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  training: TrainingConfig;
  inputSpec: {
    shape: Shape;
    dtype: DType;
  };
}

export type NodeStatus = "pending" | "valid" | "warning" | "error";

export interface ShapeResult {
  nodeId: string;
  shape?: Shape;
  dtype?: DType;
  status: NodeStatus;
  messages: string[];
}

export interface ShapeContext {
  results: Record<string, ShapeResult>;
  trace: string[];
  hasErrors: boolean;
}

export interface ParamDefinition {
  label: string;
  type: "number" | "boolean" | "select" | "text" | "number-array" | "string";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: { label: string; value: string | number }[];
  default: ParamValue;
  required?: boolean;
  helperText?: string;
}

export type ShapeApplyFn = (
  inputShapes: Shape[],
  node: GraphNode,
  context: { getParam<T extends ParamValue>(key: string): T }
) => Shape | undefined;

export interface NodeRegistryItem {
  kind: NodeKind;
  description: string;
  category: string;
  params: Record<string, ParamDefinition>;
  minInputs: number;
  maxInputs?: number;
  outputs: number;
  inferShape: ShapeApplyFn;
  validate?: (
    inputShapes: Shape[],
    node: GraphNode
  ) => { level: "warning" | "error"; message: string }[];
  displayName?: string;
}

export type NodeRegistry = Record<NodeKind, NodeRegistryItem>;
