import { Graph } from "../graph/schema";

const KEY_PREFIX = "dragndropai";

export const saveGraph = (key: string, graph: Graph) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEY_PREFIX}:${key}`, JSON.stringify(graph));
  } catch (error) {
    console.warn("Failed to save graph", error);
  }
};

export const loadGraph = (key: string): Graph | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    const data = localStorage.getItem(`${KEY_PREFIX}:${key}`);
    return data ? (JSON.parse(data) as Graph) : undefined;
  } catch (error) {
    console.warn("Failed to load graph", error);
    return undefined;
  }
};

export const listGraphs = (): string[] => {
  if (typeof window === "undefined") return [];
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(KEY_PREFIX))
    .map((key) => key.split(":")[1] ?? key);
};
