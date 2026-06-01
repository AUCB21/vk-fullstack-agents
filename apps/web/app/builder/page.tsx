"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Package,
  Trash2,
  ChevronLeft,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listAgentConfigs,
  deleteAgentConfig,
  generateId,
} from "@/lib/builder/builder-storage";
import type { AgentConfig } from "@/lib/builder/builder-types";
import { NodeIcon } from "@/components/builder/node-icon";
import "./builder.css";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}sem`;
}

export default function BuilderListPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setAgents(listAgentConfigs());
    const saved = localStorage.getItem("vk-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("vk-theme", next);
    const el = document.documentElement;
    el.classList.add("theme-transitioning");
    el.classList.remove("theme-light");
    if (next === "light") el.classList.add("theme-light");
    setTimeout(() => el.classList.remove("theme-transitioning"), 250);
  }

  function handleNew() {
    const id = generateId();
    router.push(`/builder/${id}`);
  }

  function handleDelete(id: string) {
    deleteAgentConfig(id);
    setAgents(listAgentConfigs());
    setConfirmId(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] px-6">
        <a
          href="/chat"
          className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] no-underline hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="size-3.5" />
          Volver al chat
        </a>

        <div className="ml-4 flex items-center gap-2.5">
          <div
            className="grid size-7 shrink-0 place-items-center rounded-[7px]"
            style={{
              background: "linear-gradient(135deg, var(--dm-accent), oklch(0.45 0.12 var(--accent-h)))",
            }}
          >
            <span className="text-[13px] font-semibold leading-none text-white">VK</span>
          </div>
          <span className="text-[15px] font-semibold">Agent Builder</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="grid size-8 place-items-center rounded-[7px] text-[var(--text-subtle)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1.5 rounded-[7px] bg-[var(--dm-accent)] px-3 py-[6px] text-[12.5px] font-medium text-[var(--dm-accent-fg)] transition-[filter,transform] duration-150 hover:brightness-105 hover:-translate-y-px"
          >
            <Plus className="size-3.5" />
            Nuevo agente
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-[960px]">
          <h1 className="mb-1 text-[20px] font-semibold">Mis agentes</h1>
          <p className="mb-6 text-[13px] text-[var(--text-muted)]">
            Crea y edita agentes con el editor visual de nodos.
          </p>

          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20">
              <Package className="mb-3 size-8 text-[var(--text-subtle)]" />
              <p className="mb-1 text-[14px] font-medium text-[var(--text-muted)]">
                Sin agentes todavia
              </p>
              <p className="mb-5 text-[12.5px] text-[var(--text-subtle)]">
                Crea tu primer agente para comenzar
              </p>
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-1.5 rounded-[7px] bg-[var(--dm-accent)] px-3.5 py-[7px] text-[13px] font-medium text-[var(--dm-accent-fg)] transition-[filter,transform] duration-150 hover:brightness-105 hover:-translate-y-px"
              >
                <Plus className="size-3.5" />
                Nuevo agente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* New agent card */}
              <button
                onClick={handleNew}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-10 text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
              >
                <Plus className="size-5" />
                <span className="text-[13px]">Nuevo agente</span>
              </button>

              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="group relative flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 transition-colors hover:border-[var(--border-strong)]"
                >
                  {/* Delete / confirm */}
                  {confirmId === agent.id ? (
                    <div className="absolute inset-x-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-[var(--status-err)]/30 bg-[var(--status-err)]/10 px-3 py-2">
                      <span className="flex-1 text-[12px] text-[var(--status-err)]">Eliminar agente?</span>
                      <button
                        onClick={() => handleDelete(agent.id)}
                        className="rounded-[5px] bg-[var(--status-err)] px-2.5 py-1 text-[11px] font-medium text-white"
                      >
                        Si
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="rounded-[5px] border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-muted)]"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmId(agent.id);
                      }}
                      className="absolute right-3 top-3 hidden size-6 items-center justify-center rounded-md text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover:flex"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => router.push(`/builder/${agent.id}`)}
                    className="flex flex-col gap-3 text-left"
                  >
                    {/* Icon + name */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="grid size-9 shrink-0 place-items-center rounded-lg"
                        style={{
                          background: "oklch(from var(--dm-accent) l c h / 0.18)",
                          color: "var(--dm-accent)",
                        }}
                      >
                        <NodeIcon name={agent.icon} className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium">{agent.name}</div>
                        <div className="font-mono text-[10.5px] text-[var(--text-subtle)]">
                          {agent.version} · {agent.status}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-[11.5px] text-[var(--text-muted)]">
                      <span>{agent.nodes.length} nodos</span>
                      <span>{agent.wires.length} conexiones</span>
                    </div>

                    {/* Timestamp */}
                    <div className="font-mono text-[10.5px] text-[var(--text-subtle)]">
                      Editado {timeAgo(agent.updatedAt)}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
