"use client";

import { memo, useState, useRef, useEffect } from "react";
import { ChevronLeft, Search, Settings, X } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/lib/builder/builder-context";
import { NODE_LIBRARY, KIND_GROUP_LABELS, KIND_GROUP_ORDER } from "@/lib/builder/node-library";
import { NodeIcon } from "./node-icon";
import type { NodeTemplate } from "@/lib/builder/builder-types";

// Curated icons offered in the agent settings modal (all exist in NodeIcon's map)
const AGENT_ICONS = [
  "Package", "Bot", "Sparkles", "ShoppingCart", "MessageSquare",
  "Layers", "Table", "GitBranch", "Send", "Search",
];

function LibraryItem({ item }: { item: NodeTemplate }) {
  const { addNode, state } = useBuilder();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib-${item.id}`,
    data: { type: "library-item", templateId: item.id },
  });

  // Double-click → drop the node in the center of the visible canvas
  function handleDoubleClick() {
    const z = state.zoom / 100;
    const canvasEl = document.getElementById("builder-canvas");
    let x = 240;
    let y = 160;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      x = rect.width / 2 / z - state.panX - 120;
      y = rect.height / 2 / z - state.panY - 40;
    }
    // Stagger repeated creations so they don't stack exactly on top of each other
    const offset = (state.nodes.length % 6) * 26;
    addNode(item, Math.max(0, x + offset), Math.max(0, y + offset));
  }

  return (
    <div
      ref={setNodeRef}
      data-kind={item.kind}
      onDoubleClick={handleDoubleClick}
      title="Doble click para agregar al canvas"
      className={cn(
        "flex items-center gap-[9px] rounded-[6px] px-[10px] py-[7px] mx-2 cursor-grab transition-colors hover:bg-[var(--surface)]",
        isDragging && "opacity-40 cursor-grabbing",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="lib-icon-wrap grid size-6 shrink-0 place-items-center rounded-[6px]">
        <NodeIcon name={item.icon} className="size-[13px]" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[12.5px] text-[var(--foreground)]">{item.name}</span>
        <span className="block text-[10.5px] text-[var(--text-subtle)]">{item.desc}</span>
      </div>
      <span className="ml-auto size-3 shrink-0 text-[var(--text-subtle)] opacity-0 group-hover:opacity-70">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M5 12h14M5 6h14M5 18h14" />
        </svg>
      </span>
    </div>
  );
}

function BuilderSidebarInner() {
  const { agentName, agentIcon, agentVersion, saveStatus, state } = useBuilder();
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = NODE_LIBRARY.filter(
    (i) =>
      !query ||
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      i.desc.toLowerCase().includes(query.toLowerCase()),
  );

  const grouped: Record<string, NodeTemplate[]> = {};
  for (const item of filtered) {
    (grouped[item.kind] ??= []).push(item);
  }

  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elev)]">
      {/* Header */}
      <div className="flex h-[52px] shrink-0 items-center gap-[10px] border-b border-[var(--border)] px-4">
        <div
          className="grid size-7 shrink-0 place-items-center rounded-[7px]"
          style={{ background: "linear-gradient(135deg, var(--dm-accent), oklch(0.45 0.12 var(--accent-h)))" }}
        >
          <span className="text-[13px] font-semibold leading-none text-white">VK</span>
        </div>
        <span className="text-[14px] font-semibold text-[var(--foreground)]">Agent Builder</span>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--text-subtle)]" title="Auto-guardado">
          <span
            className="size-1.5 rounded-full"
            style={{
              background: saveStatus === "saved" ? "var(--status-ok)" : saveStatus === "saving" ? "var(--status-warn)" : "var(--text-subtle)",
              boxShadow: saveStatus === "saved" ? "0 0 4px var(--status-ok)" : "none",
            }}
          />
          {saveStatus === "saved" ? "Guardado" : saveStatus === "saving" ? "Guardando..." : "Sin guardar"}
        </div>
      </div>

      {/* Scrollable body — back link, search, node library */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Back link */}
        <a
          href="/chat"
          className="flex shrink-0 items-center gap-2 px-4 py-2.5 text-[13px] text-[var(--text-muted)] no-underline hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="size-3.5" style={{ transform: "rotate(0deg)" }} />
          Volver a agentes
        </a>

        {/* Search */}
        <div className="relative mx-[10px] mb-2 shrink-0">
          <Search className="pointer-events-none absolute left-[9px] top-1/2 size-3 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nodos..."
            className="w-full rounded-[7px] border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-7 pr-7 text-[12.5px] text-[var(--foreground)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[oklch(from_var(--dm-accent)_l_c_h_/_0.5)] focus:shadow-[0_0_0_3px_var(--dm-accent-ring)]"
          />
          <span className="pointer-events-none absolute right-[7px] top-1/2 -translate-y-1/2 rounded-[3px] border border-[var(--border)] px-1 font-mono text-[10px] text-[var(--text-subtle)]">
            /
          </span>
        </div>

        {/* Node library */}
        <div className="pb-3">
          {KIND_GROUP_ORDER.map((kind) =>
            grouped[kind] && grouped[kind].length > 0 ? (
              <div key={kind}>
                <div className="px-4 pb-1 pt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
                  {KIND_GROUP_LABELS[kind]}
                </div>
                {grouped[kind].map((item) => (
                  <LibraryItem key={item.id} item={item} />
                ))}
              </div>
            ) : null,
          )}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-[var(--text-subtle)]">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-[10px] border-t border-[var(--border)] px-3 py-[10px]">
        <div
          className="grid size-7 shrink-0 place-items-center rounded-full text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.55 0.18 310), oklch(0.45 0.16 280))" }}
        >
          <NodeIcon name={agentIcon} className="size-[15px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-[var(--foreground)]">{agentName}</div>
          <div className="text-[10.5px] text-[var(--text-subtle)]">
            draft · {agentVersion} · {state.nodes.length} nodos
          </div>
        </div>
        <button
          className="text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
          title="Configuracion"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="size-[15px]" />
        </button>
      </div>

      {settingsOpen && <AgentSettingsModal onClose={() => setSettingsOpen(false)} />}
    </aside>
  );
}

export const BuilderSidebar = memo(BuilderSidebarInner);

function AgentSettingsModal({ onClose }: { onClose: () => void }) {
  const { agentName, agentIcon, saveMeta } = useBuilder();
  const [name, setName] = useState(agentName);
  const [icon, setIcon] = useState(agentIcon);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleSave() {
    const trimmed = name.trim() || "Nuevo agente";
    saveMeta(trimmed, icon);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0_0_0_/_0.45)] p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[360px] flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Configuracion del agente</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-subtle)] hover:text-[var(--foreground)]"
            title="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
            Nombre
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
            className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-[7px] text-[12.5px] text-[var(--foreground)] outline-none focus:border-[oklch(from_var(--dm-accent)_l_c_h_/_0.5)] focus:shadow-[0_0_0_3px_var(--dm-accent-ring)]"
          />
        </div>

        {/* Icon picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
            Icono
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {AGENT_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                title={ic}
                className={cn(
                  "grid aspect-square place-items-center rounded-[7px] border transition-colors",
                  icon === ic
                    ? "border-[var(--dm-accent)] bg-[oklch(from_var(--dm-accent)_l_c_h_/_0.15)] text-[var(--dm-accent)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface)]",
                )}
              >
                <NodeIcon name={ic} className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-[var(--dm-accent)] px-3 py-1.5 text-[12px] font-medium text-[var(--dm-accent-fg)] hover:brightness-105"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
