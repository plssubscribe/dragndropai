import { useMemo } from "react";
import Canvas from "./components/Canvas";
import Console from "./components/Console";
import Inspector from "./components/Inspector";
import Palette from "./components/Palette";
import Topbar from "./components/Topbar";
import { evaluateGraph } from "./graph/shapeEngine";
import { useGraphStore } from "./state/useGraphStore";

const App = () => {
  const graph = useGraphStore((state) => state.graph);
  const shapeContext = useMemo(() => evaluateGraph(graph), [graph]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Palette />
        <Canvas shapeContext={shapeContext} />
        <Inspector shapeContext={shapeContext} />
      </div>
      <Console graph={graph} shapeContext={shapeContext} />
    </div>
  );
};

export default App;
