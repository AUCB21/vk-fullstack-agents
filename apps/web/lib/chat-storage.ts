/**
 * localStorage-based chat session persistence.
 * No dependencies — pure functions over localStorage.
 */

import type { Message } from "./chat-context";

const STORAGE_KEY = "vk-chat-sessions";
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB hardcoded limit

export type ChatSession = {
  id: string;
  title: string;
  agent: string;
  model: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

function cleanMessages(messages: Message[]): Message[] {
  return messages.filter((m) => {
    if (m.role === "live-assistant" && m.status === "streaming") return false;
    return true;
  });
}

export function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

export function getSession(id: string): ChatSession | null {
  const sessions = loadSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export function saveSession(session: ChatSession): void {
  const sessions = loadSessions();
  const cleaned: ChatSession = {
    ...session,
    messages: cleanMessages(session.messages),
  };

  const idx = sessions.findIndex((s) => s.id === cleaned.id);
  if (idx >= 0) {
    sessions[idx] = cleaned;
  } else {
    sessions.unshift(cleaned);
  }

  enforceLimit(sessions);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // localStorage full — remove oldest and retry
    if (sessions.length > 1) {
      sessions.pop();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }
}

export function deleteSession(id: string): void {
  const sessions = loadSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function enforceLimit(sessions: ChatSession[]): void {
  let serialized = JSON.stringify(sessions);
  while (
    new Blob([serialized]).size > MAX_SIZE_BYTES &&
    sessions.length > 1
  ) {
    sessions.pop(); // remove oldest (last, since newest are first)
    serialized = JSON.stringify(sessions);
  }
}

export function generateTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first || first.role !== "user") return "New chat";
  const text = first.content;
  return text.length > 60 ? text.slice(0, 57) + "..." : text;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}
