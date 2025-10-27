import { useMemo } from "react";
import { emitPyTorch } from "../codegen/emitPyTorch";
import { Graph, ShapeContext } from "../graph/schema";
import { validateGraph } from "../graph/validate";

interface ConsoleProps {
  graph: Graph;
  shapeContext: ShapeContext;
}

export const Console = ({ graph, shapeContext }: ConsoleProps) => {
  const issues = useMemo(() => validateGraph(graph), [graph]);
  const codeArtifacts = useMemo(() => emitPyTorch(graph), [graph]);

  return (
    <section className="h-60 border-t border-slate-800 bg-slate-950 p-4 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Console</h3>
        {codeArtifacts.errors.length ? (
          <span className="text-rose-400">Export disabled</span>
        ) : (
          <span className="text-emerald-400">Export ready</span>
        )}
      </div>
      <div className="grid h-full grid-cols-2 gap-4">
        <div className="space-y-2 overflow-y-auto rounded border border-slate-800 p-2">
          <h4 className="font-semibold text-slate-200">Shape trace</h4>
          <ul className="space-y-1">
            {shapeContext.trace.map((entry, index) => (
              <li key={index} className="text-slate-300">
                {entry}
              </li>
            ))}
          </ul>
          <h4 className="pt-2 font-semibold text-slate-200">Issues</h4>
          <ul className="space-y-1">
            {issues.map((issue, index) => (
              <li key={index} className={issue.level === "error" ? "text-rose-400" : "text-amber-300"}>
                [{issue.level}] {issue.message}
              </li>
            ))}
            {Object.entries(shapeContext.results).map(([nodeId, result]) =>
              result.messages.map((message, index) => (
                <li key={`${nodeId}-${index}`} className={result.status === "error" ? "text-rose-400" : "text-amber-300"}>
                  [{result.status}] {nodeId}: {message}
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="flex h-full flex-col overflow-hidden rounded border border-slate-800">
          <div className="border-b border-slate-800 bg-slate-900 p-2 font-semibold text-slate-200">
            PyTorch preview
          </div>
          <pre className="flex-1 overflow-auto bg-slate-950 p-2 text-[10px] text-slate-200">
            {codeArtifacts.errors.length
              ? codeArtifacts.errors.join("\n")
              : codeArtifacts.code.slice(0, 4000)}
          </pre>
        </div>
      </div>
    </section>
  );
};

export default Console;
