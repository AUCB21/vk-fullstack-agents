// Agent Builder — core type definitions

export type NodeKind = "trigger" | "llm" | "tool" | "memory" | "condition" | "output";

export type NodeRow = {
  key: string;
  value: string;
  mono?: boolean;
};

export type BuilderNode = {
  id: string;
  kind: NodeKind;
  icon: string;
  name: string;
  meta: string;
  x: number;
  y: number;
  rows: NodeRow[];
  status: "ok" | "warn" | "idle";
  selected?: boolean;
  config?: Record<string, unknown>;
};

export type Wire = {
  id: string;
  from: string;
  to: string;
  flow?: boolean;
};

export type AgentConfig = {
  id: string;
  name: string;
  icon: string;
  version: string;
  status: "draft" | "published";
  nodes: BuilderNode[];
  wires: Wire[];
  createdAt: number;
  updatedAt: number;
};

export type NodeTemplate = {
  id: string;
  kind: NodeKind;
  icon: string;
  name: string;
  desc: string;
  defaultRows: NodeRow[];
  defaultConfig?: Record<string, unknown>;
};

export const KIND_LABELS: Record<NodeKind, string> = {
  trigger: "TRIGGER",
  llm: "LLM",
  tool: "TOOL",
  memory: "MEMORY",
  condition: "LOGIC",
  output: "OUTPUT",
};
