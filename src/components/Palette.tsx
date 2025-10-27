import { useMemo, useState } from "react";
import { registry, orderedKinds } from "../graph/registry";
import { NodeKind } from "../graph/schema";

export const Palette = () => {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    return orderedKinds.filter((kind) => {
      const entry = registry[kind];
      const term = `${entry.displayName ?? kind} ${entry.description}`.toLowerCase();
      return term.includes(query.toLowerCase());
    });
  }, [query]);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, kind: NodeKind) => {
    event.dataTransfer.setData("application/reactflow", kind);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-3">
        <input
          className="w-full rounded bg-slate-800 px-2 py-1 text-sm"
          placeholder="Search layers…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-2 text-sm">
          {filtered.map((kind) => {
            const entry = registry[kind];
            return (
              <li key={kind}>
                <div
                  draggable
                  onDragStart={(event) => handleDragStart(event, kind)}
                  className="rounded border border-slate-700 bg-slate-800 p-2 transition hover:border-slate-500 hover:bg-slate-700"
                  title={entry.description}
                >
                  <div className="font-medium">{entry.displayName ?? kind}</div>
                  <div className="text-xs text-slate-300">{entry.description}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default Palette;
