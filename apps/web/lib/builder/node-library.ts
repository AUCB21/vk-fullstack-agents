import type { NodeTemplate } from "./builder-types";

export const NODE_LIBRARY: NodeTemplate[] = [
  // Triggers
  {
    id: "trigger-chat",
    kind: "trigger",
    icon: "MessageSquare",
    name: "Chat message",
    desc: "El usuario envia un mensaje",
    defaultRows: [
      { key: "event", value: "user.message" },
      { key: "agent", value: "—" },
    ],
  },
  {
    id: "trigger-sched",
    kind: "trigger",
    icon: "RefreshCw",
    name: "Schedule",
    desc: "Ejecutar en un cron",
    defaultRows: [
      { key: "cron", value: "0 9 * * 1-5", mono: true },
      { key: "timezone", value: "America/Buenos_Aires" },
    ],
  },
  {
    id: "trigger-webhook",
    kind: "trigger",
    icon: "ExternalLink",
    name: "Webhook",
    desc: "HTTP trigger",
    defaultRows: [
      { key: "method", value: "POST" },
      { key: "path", value: "/webhook/agent", mono: true },
    ],
  },

  // LLM
  {
    id: "llm-chat",
    kind: "llm",
    icon: "Bot",
    name: "LLM completion",
    desc: "Claude / Gemini / local",
    defaultRows: [
      { key: "model", value: "claude-sonnet-4" },
      { key: "temp", value: "0.2" },
    ],
    defaultConfig: { model: "claude-sonnet-4", temperature: 0.2, maxTokens: 2048, stream: true },
  },
  {
    id: "llm-classify",
    kind: "llm",
    icon: "Sparkles",
    name: "Classifier",
    desc: "Rutear por intencion",
    defaultRows: [
      { key: "model", value: "gemini-3.1-flash-lite" },
      { key: "labels", value: "stock · order · lookup", mono: true },
    ],
    defaultConfig: { model: "gemini-3.1-flash-lite", temperature: 0, maxTokens: 256 },
  },

  // Tools
  {
    id: "tool-sap-items",
    kind: "tool",
    icon: "Package",
    name: "SAP B1 — Items",
    desc: "Leer OITM",
    defaultRows: [
      { key: "verb", value: "GET /Items", mono: true },
      { key: "filter", value: "OnHand lt MinStock", mono: true },
    ],
  },
  {
    id: "tool-sap-orders",
    kind: "tool",
    icon: "ShoppingCart",
    name: "SAP B1 — Orders",
    desc: "ORDR / OPOR",
    defaultRows: [
      { key: "verb", value: "GET /Orders", mono: true },
      { key: "filter", value: "", mono: true },
    ],
  },
  {
    id: "tool-sap-bp",
    kind: "tool",
    icon: "Layers",
    name: "SAP B1 — BPs",
    desc: "OCRD",
    defaultRows: [
      { key: "verb", value: "GET /BusinessPartners", mono: true },
      { key: "filter", value: "", mono: true },
    ],
  },
  {
    id: "tool-http",
    kind: "tool",
    icon: "ExternalLink",
    name: "HTTP request",
    desc: "REST / OData",
    defaultRows: [
      { key: "method", value: "GET" },
      { key: "url", value: "https://...", mono: true },
    ],
  },
  {
    id: "tool-sql",
    kind: "tool",
    icon: "Table",
    name: "SQL query",
    desc: "Ejecutar un SELECT",
    defaultRows: [
      { key: "query", value: "SELECT ...", mono: true },
      { key: "db", value: "sap_hana" },
    ],
  },

  // Memory
  {
    id: "memory-vec",
    kind: "memory",
    icon: "Layers",
    name: "Vector store",
    desc: "Memoria a largo plazo",
    defaultRows: [
      { key: "store", value: "pinecone" },
      { key: "topK", value: "8" },
    ],
  },
  {
    id: "memory-conv",
    kind: "memory",
    icon: "MessageSquare",
    name: "Conversation",
    desc: "Ultimos N turnos",
    defaultRows: [
      { key: "turns", value: "10" },
      { key: "strategy", value: "sliding window" },
    ],
  },

  // Logic
  {
    id: "cond-route",
    kind: "condition",
    icon: "GitBranch",
    name: "Branch",
    desc: "If / else routing",
    defaultRows: [
      { key: "condition", value: "intent == 'stock'", mono: true },
      { key: "branches", value: "2" },
    ],
  },

  // Outputs
  {
    id: "out-reply",
    kind: "output",
    icon: "Send",
    name: "Reply to user",
    desc: "Stream respuesta",
    defaultRows: [
      { key: "stream", value: "enabled" },
      { key: "format", value: "markdown + cite" },
    ],
  },
  {
    id: "out-post",
    kind: "output",
    icon: "CheckCircle",
    name: "Post to SAP",
    desc: "Requiere aprobacion",
    defaultRows: [
      { key: "approval", value: "required" },
      { key: "target", value: "Service Layer", mono: true },
    ],
  },
];

export const KIND_GROUP_LABELS: Record<string, string> = {
  trigger: "Triggers",
  llm: "LLM",
  tool: "Tools",
  memory: "Memory",
  condition: "Logic",
  output: "Outputs",
};

export const KIND_GROUP_ORDER = ["trigger", "llm", "tool", "memory", "condition", "output"];

export const INITIAL_NODES_DEMO = [
  { id: "n1", kind: "trigger" as const, icon: "MessageSquare", name: "Chat message", x: 60, y: 110, meta: "TRIGGER",
    rows: [{ key: "event", value: "user.message" }, { key: "agent", value: "Inventory" }], status: "ok" as const },
  { id: "n2", kind: "llm" as const, icon: "Sparkles", name: "Intent classifier", x: 360, y: 60, meta: "LLM",
    rows: [{ key: "model", value: "gemini-3.1-flash-lite" }, { key: "labels", value: "stock · order · lookup", mono: true }], status: "ok" as const },
  { id: "n3", kind: "tool" as const, icon: "Package", name: "SAP B1 — Items", x: 680, y: 40, meta: "TOOL",
    rows: [{ key: "verb", value: "GET /Items", mono: true }, { key: "filter", value: "OnHand lt MinStock", mono: true }], status: "ok" as const },
  { id: "n4", kind: "llm" as const, icon: "Bot", name: "Reasoning LLM", x: 360, y: 230, meta: "LLM",
    rows: [{ key: "model", value: "claude-sonnet-4" }, { key: "tools", value: "3 attached" }, { key: "memory", value: "vector + conv" }], status: "ok" as const },
  { id: "n5", kind: "memory" as const, icon: "Layers", name: "Knowledge base", x: 60, y: 320, meta: "MEMORY",
    rows: [{ key: "store", value: "pinecone" }, { key: "topK", value: "8" }], status: "ok" as const },
  { id: "n6", kind: "output" as const, icon: "Send", name: "Reply to user", x: 980, y: 230, meta: "OUTPUT",
    rows: [{ key: "stream", value: "enabled" }, { key: "format", value: "markdown + cite" }], status: "idle" as const },
];

export const INITIAL_WIRES_DEMO = [
  { id: "w1", from: "n1", to: "n2" },
  { id: "w2", from: "n2", to: "n3" },
  { id: "w3", from: "n2", to: "n4" },
  { id: "w4", from: "n3", to: "n4", flow: true },
  { id: "w5", from: "n5", to: "n4" },
  { id: "w6", from: "n4", to: "n6", flow: true },
];
