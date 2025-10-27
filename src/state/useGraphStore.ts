import { create } from "zustand";
import { Graph, GraphEdge, GraphNode, NodeKind, NodeParams } from "../graph/schema";
import { createEmptyGraph, exampleGraphs } from "../graph/examples";
import { getDefaultParams } from "../graph/registry";
import { saveGraph, loadGraph } from "../lib/localStorage";

export interface NodePosition {
  x: number;
  y: number;
}

const cloneGraph = (graph: Graph): Graph => JSON.parse(JSON.stringify(graph));

const makeId = (() => {
  let counter = 0;
  return (prefix: string) => `${prefix}-${++counter}`;
})();

interface HistoryState {
  past: Graph[];
  future: Graph[];
}

interface GraphStore {
  graph: Graph;
  positions: Record<string, NodePosition>;
  selectedNodeId?: string;
  history: HistoryState;
  setSelectedNode: (id?: string) => void;
  setNodePosition: (id: string, position: NodePosition) => void;
  addNode: (kind: NodeKind, position?: NodePosition) => GraphNode;
  updateNodeParams: (id: string, params: Partial<NodeParams>) => void;
  connectNodes: (from: string, to: string) => GraphEdge | undefined;
  removeNode: (id: string) => void;
  removeEdge: (id: string) => void;
  setGraph: (graph: Graph) => void;
  newGraph: () => void;
  loadExample: (name: string) => void;
  saveToLocal: (name?: string) => void;
  loadFromLocal: (name?: string) => void;
  importGraph: (graph: Graph) => void;
  updateTraining: (updates: Partial<Graph["training"]>) => void;
  updateInputSpec: (updates: Partial<Graph["inputSpec"]>) => void;
  undo: () => void;
  redo: () => void;
}

const pushHistory = (state: GraphStore): HistoryState => ({
  past: [...state.history.past, cloneGraph(state.graph)],
  future: []
});

export const useGraphStore = create<GraphStore>((set, get) => ({
  graph: createEmptyGraph(),
  positions: {},
  selectedNodeId: undefined,
  history: { past: [], future: [] },
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setNodePosition: (id, position) =>
    set((state) => ({
      positions: {
        ...state.positions,
        [id]: position
      }
    })),
  addNode: (kind, position) => {
    const id = makeId(kind.toLowerCase());
    const node: GraphNode = {
      id,
      kind,
      label: kind,
      params: getDefaultParams(kind)
    };
    set((state) => {
      const history = pushHistory(state);
      return {
        graph: {
          ...state.graph,
          nodes: [...state.graph.nodes, node]
        },
        positions: position
          ? { ...state.positions, [id]: position }
          : state.positions,
        selectedNodeId: id,
        history
      };
    });
    return node;
  },
  updateNodeParams: (id, params) =>
    set((state) => {
      const history = pushHistory(state);
      const nodes = state.graph.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              params: {
                ...node.params,
                ...params
              }
            }
          : node
      );
      return {
        graph: {
          ...state.graph,
          nodes
        },
        history
      };
    }),
  connectNodes: (from, to) => {
    const edge: GraphEdge = {
      id: makeId("edge"),
      from,
      to
    };
    set((state) => {
      const history = pushHistory(state);
      return {
        graph: {
          ...state.graph,
          edges: [...state.graph.edges, edge]
        },
        history
      };
    });
    return edge;
  },
  removeNode: (id) =>
    set((state) => {
      const history = pushHistory(state);
      const nodes = state.graph.nodes.filter((node) => node.id !== id);
      const edges = state.graph.edges.filter((edge) => edge.from !== id && edge.to !== id);
      const { [id]: _, ...rest } = state.positions;
      return {
        graph: { ...state.graph, nodes, edges },
        positions: rest,
        selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId,
        history
      };
    }),
  removeEdge: (id) =>
    set((state) => {
      const history = pushHistory(state);
      return {
        graph: {
          ...state.graph,
          edges: state.graph.edges.filter((edge) => edge.id !== id)
        },
        history
      };
    }),
  setGraph: (graph) => set({ graph, positions: {}, selectedNodeId: undefined, history: { past: [], future: [] } }),
  newGraph: () => set({ graph: createEmptyGraph(), positions: {}, selectedNodeId: undefined, history: { past: [], future: [] } }),
  loadExample: (name) => {
    const example = exampleGraphs[name];
    if (!example) return;
    set({ graph: cloneGraph(example), positions: {}, selectedNodeId: undefined, history: { past: [], future: [] } });
  },
  saveToLocal: (name = "autosave") => {
    saveGraph(name, get().graph);
  },
  loadFromLocal: (name = "autosave") => {
    const stored = loadGraph(name);
    if (stored) {
      set({ graph: stored, positions: {}, selectedNodeId: undefined, history: { past: [], future: [] } });
    }
  },
  importGraph: (graph) => set({ graph: cloneGraph(graph), positions: {}, selectedNodeId: undefined, history: { past: [], future: [] } }),
  updateTraining: (updates) =>
    set((state) => ({
      graph: {
        ...state.graph,
        training: {
          ...state.graph.training,
          ...updates
        }
      }
    })),
  updateInputSpec: (updates) =>
    set((state) => ({
      graph: {
        ...state.graph,
        inputSpec: {
          ...state.graph.inputSpec,
          ...updates
        }
      }
    })),
  undo: () => {
    const state = get();
    if (!state.history.past.length) return;
    const past = [...state.history.past];
    const previous = past.pop()!;
    const future = [cloneGraph(state.graph), ...state.history.future];
    set({
      graph: previous,
      positions: {},
      selectedNodeId: undefined,
      history: { past, future }
    });
  },
  redo: () => {
    const state = get();
    if (!state.history.future.length) return;
    const [next, ...rest] = state.history.future;
    const past = [...state.history.past, cloneGraph(state.graph)];
    set({
      graph: next,
      positions: {},
      selectedNodeId: undefined,
      history: { past, future: rest }
    });
  }
}));
