import { useState } from "react";
import { exampleGraphs } from "../graph/examples";
import { Graph } from "../graph/schema";
import { emitPyTorch } from "../codegen/emitPyTorch";
import { downloadTextFile } from "../lib/download";
import { useGraphStore } from "../state/useGraphStore";

const exampleNames = Object.keys(exampleGraphs);

export const Topbar = () => {
  const {
    graph,
    newGraph,
    saveToLocal,
    loadFromLocal,
    loadExample,
    importGraph,
    undo,
    redo
  } = useGraphStore((state) => ({
    graph: state.graph,
    newGraph: state.newGraph,
    saveToLocal: state.saveToLocal,
    loadFromLocal: state.loadFromLocal,
    loadExample: state.loadExample,
    importGraph: state.importGraph,
    undo: state.undo,
    redo: state.redo
  }));
  const [selectedExample, setSelectedExample] = useState<string>("");

  const handleExportJSON = () => {
    downloadTextFile("graph.json", JSON.stringify(graph, null, 2));
  };

  const handleExportPyTorch = () => {
    const { code, errors } = emitPyTorch(graph);
    if (errors.length) {
      alert(`Cannot export due to errors:\n${errors.join("\n")}`);
      return;
    }
    downloadTextFile("visual_net.py", code);
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as Graph;
      importGraph(parsed);
    } catch (error) {
      alert(`Invalid JSON: ${error}`);
    }
  };

  return (
    <header className="flex items-center justify-between bg-slate-900 px-4 py-2 shadow">
      <div className="flex items-center gap-2">
        <button className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 transition" onClick={newGraph}>
          New
        </button>
        <button className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 transition" onClick={() => saveToLocal()}>
          Save
        </button>
        <button className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 transition" onClick={() => loadFromLocal()}>
          Load
        </button>
        <label className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 transition cursor-pointer">
          Import JSON
          <input type="file" className="hidden" accept="application/json" onChange={handleImportJSON} />
        </label>
        <button className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 transition" onClick={handleExportJSON}>
          Export JSON
        </button>
        <button className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 transition" onClick={handleExportPyTorch}>
          Export PyTorch
        </button>
        <select
          value={selectedExample}
          onChange={(event) => {
            const value = event.target.value;
            setSelectedExample(value);
            if (value) {
              loadExample(value);
            }
          }}
          className="rounded bg-slate-800 px-2 py-1 text-sm"
        >
          <option value="">Examples…</option>
          {exampleNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 transition" onClick={undo}>
          Undo
        </button>
        <button className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700 transition" onClick={redo}>
          Redo
        </button>
      </div>
    </header>
  );
};

export default Topbar;
