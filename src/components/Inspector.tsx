import { useMemo } from "react";
import { registry } from "../graph/registry";
import { Graph, GraphNode, NodeParams, ParamDefinition, ShapeContext } from "../graph/schema";
import { useGraphStore } from "../state/useGraphStore";

interface InspectorProps {
  shapeContext: ShapeContext;
}

const renderField = (
  node: GraphNode,
  key: string,
  definition: ParamDefinition,
  onChange: (value: unknown) => void
) => {
  const value = node.params[key];
  switch (definition.type) {
    case "number":
      return (
        <input
          type="number"
          className="w-full rounded bg-slate-800 px-2 py-1"
          value={Number(value)}
          onChange={(event) => onChange(Number(event.target.value))}
          step={definition.step ?? 1}
          min={definition.min}
          max={definition.max}
        />
      );
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case "select":
      return (
        <select
          className="w-full rounded bg-slate-800 px-2 py-1"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        >
          {definition.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "number-array": {
      const display = Array.isArray(value) ? (value as (string | number)[]).join(",") : String(value ?? "");
      return (
        <input
          type="text"
          className="w-full rounded bg-slate-800 px-2 py-1"
          value={display}
          placeholder={definition.placeholder}
          onChange={(event) => {
            const parts = event.target.value
              .split(",")
              .map((part) => part.trim())
              .filter(Boolean)
              .map((part) => Number(part));
            onChange(parts);
          }}
        />
      );
    }
    case "text":
    case "string":
      return (
        <input
          type="text"
          className="w-full rounded bg-slate-800 px-2 py-1"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default:
      return null;
  }
};

export const Inspector = ({ shapeContext }: InspectorProps) => {
  const {
    graph,
    selectedNodeId,
    updateNodeParams,
    updateTraining,
    updateInputSpec
  } = useGraphStore((state) => ({
    graph: state.graph,
    selectedNodeId: state.selectedNodeId,
    updateNodeParams: state.updateNodeParams,
    updateTraining: state.updateTraining,
    updateInputSpec: state.updateInputSpec
  }));

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId),
    [graph.nodes, selectedNodeId]
  );

  const nodeEntry = selectedNode ? registry[selectedNode.kind] : undefined;
  const nodeResult = selectedNode ? shapeContext.results[selectedNode.id] : undefined;

  return (
    <aside className="w-80 border-l border-slate-800 bg-slate-900 p-4 text-sm">
      {selectedNode && nodeEntry ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{selectedNode.label}</h2>
            <p className="text-xs text-slate-300">{nodeEntry.description}</p>
          </div>
          <form className="space-y-3">
            {Object.entries(nodeEntry.params).map(([key, definition]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">{definition.label}</label>
                {renderField(selectedNode, key, definition, (value) =>
                  updateNodeParams(selectedNode.id, { [key]: value } as Partial<NodeParams>)
                )}
                {definition.helperText && (
                  <p className="text-[10px] text-slate-400">{definition.helperText}</p>
                )}
              </div>
            ))}
          </form>
          {nodeResult?.messages.length ? (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
              {nodeResult.messages.map((message, index) => (
                <div key={index}>{message}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Training setup</h2>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs text-slate-300">
                Task
                <select
                  className="rounded bg-slate-800 px-2 py-1"
                  value={graph.training.task}
                  onChange={(event) => updateTraining({ task: event.target.value as Graph["training"]["task"] })}
                >
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                </select>
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                Num classes
                <input
                  type="number"
                  className="w-24 rounded bg-slate-800 px-2 py-1"
                  value={graph.training.num_classes ?? 1}
                  onChange={(event) => updateTraining({ num_classes: Number(event.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                Loss
                <select
                  className="rounded bg-slate-800 px-2 py-1"
                  value={graph.training.loss}
                  onChange={(event) => updateTraining({ loss: event.target.value as Graph["training"]["loss"] })}
                >
                  <option value="CrossEntropyLoss">CrossEntropyLoss</option>
                  <option value="MSELoss">MSELoss</option>
                </select>
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                Optimizer
                <select
                  className="rounded bg-slate-800 px-2 py-1"
                  value={graph.training.optimizer}
                  onChange={(event) => updateTraining({ optimizer: event.target.value as Graph["training"]["optimizer"] })}
                >
                  <option value="Adam">Adam</option>
                  <option value="SGD">SGD</option>
                </select>
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                Learning rate
                <input
                  type="number"
                  className="w-24 rounded bg-slate-800 px-2 py-1"
                  value={graph.training.learning_rate}
                  step={0.0001}
                  onChange={(event) => updateTraining({ learning_rate: Number(event.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                Batch size
                <input
                  type="number"
                  className="w-24 rounded bg-slate-800 px-2 py-1"
                  value={graph.training.batch_size}
                  onChange={(event) => updateTraining({ batch_size: Number(event.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                Epochs
                <input
                  type="number"
                  className="w-24 rounded bg-slate-800 px-2 py-1"
                  value={graph.training.epochs}
                  onChange={(event) => updateTraining({ epochs: Number(event.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                Mixed precision
                <input
                  type="checkbox"
                  checked={graph.training.mixed_precision}
                  onChange={(event) => updateTraining({ mixed_precision: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                Device pref
                <select
                  className="rounded bg-slate-800 px-2 py-1"
                  value={graph.training.device_pref}
                  onChange={(event) => updateTraining({ device_pref: event.target.value as Graph["training"]["device_pref"] })}
                >
                  <option value="auto">Auto</option>
                  <option value="cpu">CPU</option>
                  <option value="cuda">CUDA</option>
                </select>
              </label>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Input spec</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs text-slate-300">
                Shape
                <input
                  type="text"
                  className="w-32 rounded bg-slate-800 px-2 py-1"
                  value={graph.inputSpec.shape.join(",")}
                  onChange={(event) => {
                    const shape = event.target.value
                      .split(",")
                      .map((part) => part.trim())
                      .filter(Boolean)
                      .map((part) => Number(part));
                    updateInputSpec({ shape });
                  }}
                />
              </label>
              <label className="flex items-center justify-between text-xs text-slate-300">
                DType
                <select
                  className="rounded bg-slate-800 px-2 py-1"
                  value={graph.inputSpec.dtype}
                  onChange={(event) => updateInputSpec({ dtype: event.target.value as Graph["inputSpec"]["dtype"] })}
                >
                  <option value="float32">float32</option>
                  <option value="float16">float16</option>
                  <option value="bfloat16">bfloat16</option>
                  <option value="int64">int64</option>
                  <option value="int32">int32</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Inspector;
