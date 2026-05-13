"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Search, Settings } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/lib/builder/builder-context";
import { NODE_LIBRARY, KIND_GROUP_LABELS, KIND_GROUP_ORDER } from "@/lib/builder/node-library";
import { NodeIcon } from "./node-icon";
import type { NodeTemplate } from "@/lib/builder/builder-types";

function LibraryItem({ item }: { item: NodeTemplate }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib-${item.id}`,
    data: { type: "library-item", templateId: item.id },
  });

  return (
    <div
      ref={setNodeRef}
      data-kind={item.kind}
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

export function BuilderSidebar() {
  const { agentName, agentVersion, saveStatus, state } = useBuilder();
  const [query, setQuery] = useState("");
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

      {/* Back link */}
      <a
        href="/chat"
        className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-[var(--text-muted)] no-underline hover:text-[var(--foreground)]"
      >
        <ChevronLeft className="size-3.5" style={{ transform: "rotate(0deg)" }} />
        Volver a agentes
      </a>

      {/* Search */}
      <div className="relative mx-[10px] mb-2">
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
      <div className="flex-1 overflow-y-auto pb-3">
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

      {/* Footer */}
      <div className="flex items-center gap-[10px] border-t border-[var(--border)] px-3 py-[10px]">
        <div
          className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.55 0.18 310), oklch(0.45 0.16 280))" }}
        >
          {agentName[0]?.toUpperCase() ?? "A"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-[var(--foreground)]">{agentName}</div>
          <div className="text-[10.5px] text-[var(--text-subtle)]">
            draft · {agentVersion} · {state.nodes.length} nodos
          </div>
        </div>
        <button className="text-[var(--text-subtle)] hover:text-[var(--text-muted)]" title="Configuracion">
          <Settings className="size-[15px]" />
        </button>
      </div>
    </aside>
  );
}
