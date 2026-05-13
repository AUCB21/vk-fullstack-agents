"use client";

import { useState } from "react";
import { Settings, Pencil, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/lib/builder/builder-context";
import { NodeIcon } from "./node-icon";

export function Inspector() {
  const { selectedNode } = useBuilder();
  const [tab, setTab] = useState<"config" | "prompt" | "runs">("config");

  if (!selectedNode) {
    return (
      <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-elev)]">
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[12.5px] text-[var(--text-subtle)]">
          Selecciona un nodo para ver su configuracion.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--bg-elev)]">
      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-[var(--border)] px-3 pt-2.5">
        {([
          { key: "config", icon: Settings, label: "Config" },
          { key: "prompt", icon: Pencil, label: "Prompt" },
          { key: "runs", icon: Layers, label: "Runs", count: 12 },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "mb-[-1px] inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-[12px] transition-colors",
              tab === t.key
                ? "border-[var(--dm-accent)] text-[var(--foreground)]"
                : "border-transparent text-[var(--text-subtle)] hover:text-[var(--foreground)]",
            )}
          >
            <t.icon className="size-3" />
            {t.label}
            {"count" in t && (
              <span className="rounded-full bg-[var(--surface)] px-[5px] py-[1px] font-mono text-[10px] text-[var(--text-subtle)]">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3.5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div
            data-kind={selectedNode.kind}
            className="node-icon-wrap grid size-8 shrink-0 place-items-center rounded-lg"
          >
            <NodeIcon name={selectedNode.icon} className="size-4" />
          </div>
          <div>
            <div className="text-[14px] font-medium text-[var(--foreground)]">{selectedNode.name}</div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-[var(--text-subtle)]">
              {selectedNode.meta} · {selectedNode.id.slice(0, 8)}
            </div>
          </div>
        </div>

        {tab === "config" && <ConfigTab />}
        {tab === "prompt" && <PromptTab />}
        {tab === "runs" && <RunsTab />}
      </div>
    </aside>
  );
}

function ConfigTab() {
  const { selectedNode, updateNodeConfig } = useBuilder();
  if (!selectedNode) return null;

  const config = selectedNode.config ?? {};
  const isLLM = selectedNode.kind === "llm";
  const temperature = (config.temperature as number) ?? 0.2;
  const stream = (config.stream as boolean) ?? true;

  return (
    <>
      {isLLM && (
        <Section label="Modelo">
          <div className="flex flex-col gap-2">
            <select
              value={(config.model as string) ?? "claude-sonnet-4"}
              onChange={(e) => updateNodeConfig(selectedNode.id, { model: e.target.value })}
              className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-[7px] text-[12.5px] text-[var(--foreground)] outline-none focus:border-[oklch(from_var(--dm-accent)_l_c_h_/_0.5)] focus:shadow-[0_0_0_3px_var(--dm-accent-ring)]"
            >
              <option value="claude-sonnet-4">claude-sonnet-4</option>
              <option value="claude-haiku-4-5">claude-haiku-4.5</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
            </select>

            <div>
              <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                <span>Temperature</span>
                <span className="font-mono text-[10px] text-[var(--text-subtle)]">creatividad</span>
              </div>
              <div className="grid grid-cols-[1fr_44px] items-center gap-2.5">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => updateNodeConfig(selectedNode.id, { temperature: parseFloat(e.target.value) })}
                  className="builder-slider"
                />
                <span className="text-right font-mono text-[11.5px] tabular-nums text-[var(--foreground)]">
                  {temperature.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                <span>Max tokens</span>
                <span className="font-mono text-[10px] text-[var(--text-subtle)]">por respuesta</span>
              </div>
              <input
                type="number"
                defaultValue={(config.maxTokens as number) ?? 2048}
                onBlur={(e) => updateNodeConfig(selectedNode.id, { maxTokens: parseInt(e.target.value) || 2048 })}
                className="w-full rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-[7px] text-[12.5px] text-[var(--foreground)] outline-none focus:border-[oklch(from_var(--dm-accent)_l_c_h_/_0.5)] focus:shadow-[0_0_0_3px_var(--dm-accent-ring)]"
              />
            </div>
          </div>
        </Section>
      )}

      <Section label="Comportamiento">
        <Toggle
          label="Stream output"
          desc="Tokens llegan incrementalmente"
          on={stream}
          onToggle={() => updateNodeConfig(selectedNode.id, { stream: !stream })}
        />
        <Toggle label="Citar registros SAP" desc="Envolver DocNum / ItemCode" on={true} onToggle={() => {}} />
        <Toggle label="Auto-aprobar escrituras" desc="Off = requiere revision humana" on={false} onToggle={() => {}} />
      </Section>

      {/* Node rows (read-only display) */}
      <Section label="Propiedades">
        <div className="flex flex-col gap-1.5">
          {selectedNode.rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-2">
              <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.04em] text-[var(--text-subtle)]">
                {r.key}
              </span>
              <span className={cn("min-w-0 flex-1 truncate text-[12px] text-[var(--foreground)]", r.mono && "font-mono text-[11px]")}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function PromptTab() {
  const { selectedNode } = useBuilder();
  if (!selectedNode) return null;

  return (
    <>
      <Section label="System prompt">
        <textarea
          className="min-h-[120px] w-full resize-y rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-[7px] font-mono text-[11.5px] leading-[1.55] text-[var(--foreground)] outline-none focus:border-[oklch(from_var(--dm-accent)_l_c_h_/_0.5)] focus:shadow-[0_0_0_3px_var(--dm-accent-ring)]"
          defaultValue={`You are the ${selectedNode.name} for {{tenant.name}}.

Use the attached tools to answer questions.
When citing items, wrap the ItemCode like {{ItemCode}}.

Never post writes without explicit user confirmation.
Today: {{now}}.`}
        />
      </Section>
      <Section label="Variables disponibles">
        <div className="flex flex-wrap gap-1.5">
          {["{{tenant.name}}", "{{user.email}}", "{{now}}", "{{input}}"].map((v) => (
            <span
              key={v}
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)]"
            >
              {v}
            </span>
          ))}
        </div>
      </Section>
    </>
  );
}

function RunsTab() {
  const runs = [
    { id: "r-3401", when: "2m ago", ms: "412ms", ok: true, q: "Show items below reorder" },
    { id: "r-3400", when: "5m ago", ms: "684ms", ok: true, q: "Inventory health snapshot" },
    { id: "r-3399", when: "12m ago", ms: "1.2s", ok: true, q: "Where is A0017 stocked?" },
    { id: "r-3398", when: "1h ago", ms: "—", ok: false, q: "Draft PO for vendor V10145" },
  ];

  return (
    <Section label="Ejecuciones recientes">
      <div className="flex flex-col gap-2">
        {runs.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-2"
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                background: r.ok ? "var(--status-ok)" : "var(--status-err)",
              }}
            />
            <div className="min-w-0">
              <div className="truncate text-[12px] text-[var(--foreground)]">{r.q}</div>
              <div className="font-mono text-[10.5px] text-[var(--text-subtle)]">
                {r.id} · {r.when}
              </div>
            </div>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">{r.ms}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function Toggle({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 cursor-pointer"
      onClick={onToggle}
    >
      <div>
        <div className="text-[12px] text-[var(--foreground)]">{label}</div>
        <div className="text-[11px] text-[var(--text-subtle)]">{desc}</div>
      </div>
      <div className={cn("builder-toggle-sw", on && "on")} />
    </div>
  );
}
