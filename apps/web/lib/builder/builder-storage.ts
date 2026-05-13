import type { AgentConfig } from "./builder-types";

const STORAGE_PREFIX = "vk-agent-";
const INDEX_KEY = "vk-agent-index";

function getIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

export function saveAgentConfig(config: AgentConfig): void {
  const data = { ...config, updatedAt: Date.now() };
  localStorage.setItem(STORAGE_PREFIX + config.id, JSON.stringify(data));

  const index = getIndex();
  if (!index.includes(config.id)) {
    index.unshift(config.id);
    setIndex(index);
  }
}

export function loadAgentConfig(id: string): AgentConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as AgentConfig;
  } catch {
    return null;
  }
}

export function listAgentConfigs(): AgentConfig[] {
  const index = getIndex();
  const configs: AgentConfig[] = [];
  for (const id of index) {
    const config = loadAgentConfig(id);
    if (config) configs.push(config);
  }
  return configs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteAgentConfig(id: string): void {
  localStorage.removeItem(STORAGE_PREFIX + id);
  const index = getIndex().filter((i) => i !== id);
  setIndex(index);
}

export function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
