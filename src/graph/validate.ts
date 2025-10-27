import { Graph } from "./schema";

export interface GraphIssue {
  level: "info" | "warning" | "error";
  message: string;
}

export const validateGraph = (graph: Graph): GraphIssue[] => {
  const issues: GraphIssue[] = [];
  if (!graph.nodes.some((node) => node.kind === "Input")) {
    issues.push({ level: "error", message: "Graph needs at least one Input node" });
  }
  if (!graph.nodes.some((node) => node.kind === "Output")) {
    issues.push({ level: "error", message: "Graph needs at least one Output node" });
  }
  const connected = new Set(graph.edges.map((edge) => edge.from));
  graph.nodes
    .filter((node) => node.kind !== "Input")
    .forEach((node) => {
      if (!connected.has(node.id)) {
        issues.push({
          level: "warning",
          message: `${node.label} is not connected to any downstream node`
        });
      }
    });
  const duplicates = new Set<string>();
  graph.edges.forEach((edge) => {
    const key = `${edge.from}->${edge.to}`;
    if (duplicates.has(key)) {
      issues.push({
        level: "warning",
        message: `Multiple edges detected between ${edge.from} and ${edge.to}`
      });
    } else {
      duplicates.add(key);
    }
  });
  return issues;
};
