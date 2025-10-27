import { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  OnConnect,
  ReactFlowInstance
} from "react-flow-renderer";
import { registry } from "../graph/registry";
import { NodeKind, ShapeContext } from "../graph/schema";
import { useGraphStore } from "../state/useGraphStore";

interface CanvasProps {
  shapeContext: ShapeContext;
}

const statusColor = (status: string) => {
  switch (status) {
    case "valid":
      return "border-emerald-400";
    case "warning":
      return "border-amber-400";
    case "error":
      return "border-rose-500";
    default:
      return "border-slate-700";
  }
};

export const Canvas = ({ shapeContext }: CanvasProps) => {
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const {
    graph,
    positions,
    setNodePosition,
    connectNodes,
    addNode,
    removeEdge,
    removeNode,
    setSelectedNode
  } = useGraphStore((state) => ({
    graph: state.graph,
    positions: state.positions,
    setNodePosition: state.setNodePosition,
    connectNodes: state.connectNodes,
    addNode: state.addNode,
    removeEdge: state.removeEdge,
    removeNode: state.removeNode,
    setSelectedNode: state.setSelectedNode
  }));

  const nodes = useMemo<Node[]>(() => {
    return graph.nodes.map((node) => {
      const result = shapeContext.results[node.id];
      const shape = result?.shape ? `→ ${result.shape.join("×")}` : "";
      const position = positions[node.id] ?? { x: 0, y: 0 };
      return {
        id: node.id,
        data: {
          label: (
            <div className={`rounded border ${statusColor(result?.status ?? "pending")} bg-slate-800 px-3 py-2 text-sm`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{node.label}</span>
                <span className="text-xs text-slate-300">{result?.status === "valid" ? "✅" : result?.status === "warning" ? "⚠️" : result?.status === "error" ? "❌" : "•"}</span>
              </div>
              {shape && <div className="mt-1 text-xs text-slate-400">{shape}</div>}
            </div>
          )
        },
        position,
        draggable: true
      } as Node;
    });
  }, [graph.nodes, positions, shapeContext.results]);

  const edges = useMemo<Edge[]>(() => {
    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      animated: false,
      style: { stroke: "#94a3b8" }
    }));
  }, [graph.edges]);

  const onConnect = useCallback<OnConnect>(
    (connection) => {
      if (connection.source && connection.target) {
        connectNodes(connection.source, connection.target);
      }
    },
    [connectNodes]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData("application/reactflow") as NodeKind;
      if (!kind) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const projected = instance?.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      });
      const node = addNode(kind, projected ?? { x: 0, y: 0 });
      const entry = registry[kind];
      if (entry?.minInputs === 0) {
        setSelectedNode(node.id);
      }
    },
    [addNode, setSelectedNode, instance]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="flex-1">
      <ReactFlowProvider>
        <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          changes.forEach((change) => {
            if (change.type === "position" && change.position) {
              setNodePosition(change.id, change.position);
            }
            if (change.type === "remove") {
              removeNode(change.id);
            }
          });
        }}
        onEdgesChange={(changes) => {
          changes.forEach((change) => {
            if (change.type === "remove") {
              removeEdge(change.id);
            }
          });
        }}
        onConnect={onConnect}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => setSelectedNode(node.id)}
        className="bg-slate-950"
        onInit={setInstance}
      >
        <MiniMap className="bg-slate-900" />
        <Controls />
        <Background gap={16} color="#1e293b" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

export default Canvas;
