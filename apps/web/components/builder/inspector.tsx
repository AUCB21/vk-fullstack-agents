"use client";

import { memo, useState } from "react";
import { Settings, Pencil, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/lib/builder/builder-context";
import { NodeIcon } from "./node-icon";

function InspectorInner() {
  const { selectedNode, state } = useBuilder();
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
          { key: "runs", icon: Layers, label: "Runs", count: state.testRun?.totalSteps },
        ] as { key: "config" | "prompt" | "runs"; icon: typeof Settings; label: string; count?: number }[]).map((t) => (
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
            {t.count != null && (
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

        {tab === "config" && <ConfigTab key={selectedNode.id} />}
        {tab === "prompt" && <PromptTab key={selectedNode.id} />}
        {tab === "runs" && <RunsTab />}
      </div>
    </aside>
  );
}

export const Inspector = memo(InspectorInner);

function ConfigTab() {
  const { selectedNode, updateNodeConfig, updateNodeRows } = useBuilder();
  if (!selectedNode) return null;

  const config = selectedNode.config ?? {};
  const isLLM = selectedNode.kind === "llm";
  const temperature = (config.temperature as number) ?? 0.2;
  const stream = (config.stream as boolean) ?? true;
  const citeSAP = (config.citeSAP as boolean) ?? true;
  const autoApprove = (config.autoApprove as boolean) ?? false;

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
        <Toggle
          label="Citar registros SAP"
          desc="Envolver DocNum / ItemCode"
          on={citeSAP}
          onToggle={() => updateNodeConfig(selectedNode.id, { citeSAP: !citeSAP })}
        />
        <Toggle
          label="Auto-aprobar escrituras"
          desc="Off = requiere revision humana"
          on={autoApprove}
          onToggle={() => updateNodeConfig(selectedNode.id, { autoApprove: !autoApprove })}
        />
      </Section>

      {/* Node rows (editable) */}
      <Section label="Propiedades">
        <div className="flex flex-col gap-1.5">
          {selectedNode.rows.map((r, i) => (
            <label key={i} className="flex items-center gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 focus-within:border-[oklch(from_var(--dm-accent)_l_c_h_/_0.5)] focus-within:shadow-[0_0_0_3px_var(--dm-accent-ring)]">
              <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.04em] text-[var(--text-subtle)]">
                {r.key}
              </span>
              <input
                defaultValue={r.value}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value === r.value) return;
                  updateNodeRows(
                    selectedNode.id,
                    selectedNode.rows.map((row, j) => (j === i ? { ...row, value } : row)),
                  );
                }}
                className={cn("min-w-0 flex-1 bg-transparent text-[12px] text-[var(--foreground)] outline-none", r.mono && "font-mono text-[11px]")}
              />
            </label>
          ))}
          {selectedNode.rows.length === 0 && (
            <div className="rounded-[6px] border border-dashed border-[var(--border)] px-2.5 py-3 text-center text-[11.5px] text-[var(--text-subtle)]">
              Este nodo no tiene propiedades.
            </div>
          )}
        </div>
      </Section>
    </>
  );
}

function PromptTab() {
  const { selectedNode, updateNodeConfig } = useBuilder();
  if (!selectedNode) return null;

  const template = `You are the ${selectedNode.name} for {{tenant.name}}.

Use the attached tools to answer questions.
When citing items, wrap the ItemCode like {{ItemCode}}.

Never post writes without explicit user confirmation.
Today: {{now}}.`;
  const initial = (selectedNode.config?.prompt as string) ?? template;

  return (
    <>
      <Section label="System prompt">
        <textarea
          className="min-h-[120px] w-full resize-y rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-[7px] font-mono text-[11.5px] leading-[1.55] text-[var(--foreground)] outline-none focus:border-[oklch(from_var(--dm-accent)_l_c_h_/_0.5)] focus:shadow-[0_0_0_3px_var(--dm-accent-ring)]"
          defaultValue={initial}
          onBlur={(e) => {
            if (e.target.value !== initial) updateNodeConfig(selectedNode.id, { prompt: e.target.value });
          }}
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

type StepStatus = "done" | "running" | "pending" | "skipped";

const STEP_COLOR: Record<StepStatus, string> = {
  done: "var(--status-ok)",
  running: "var(--dm-accent)",
  pending: "var(--text-subtle)",
  skipped: "var(--status-err)",
};

const STEP_LABEL: Record<StepStatus, string> = {
  done: "OK",
  running: "corriendo",
  pending: "pendiente",
  skipped: "omitido",
};

function RunsTab() {
  const { state } = useBuilder();
  const run = state.testRun;

  if (!run) {
    return (
      <Section label="Ejecuciones">
        <div className="rounded-[6px] border border-dashed border-[var(--border)] px-3 py-6 text-center text-[12px] leading-[1.5] text-[var(--text-subtle)]">
          Ejecutá una prueba con el boton ▶ de la barra superior para ver el recorrido nodo por nodo acá.
        </div>
      </Section>
    );
  }

  const runLabel =
    run.status === "running" ? "En curso" : run.status === "done" ? "Completado" : "Detenido";

  const steps = state.nodes.map((node, i): { node: typeof node; status: StepStatus } => {
    let status: StepStatus;
    if (run.status === "running") {
      status = i < run.stepIndex ? "done" : i === run.stepIndex ? "running" : "pending";
    } else if (run.status === "done") {
      status = "done";
    } else {
      status = i <= run.stepIndex ? "done" : "skipped";
    }
    return { node, status };
  });

  return (
    <Section label="Ultima ejecucion">
      <div className="mb-1 flex items-center justify-between text-[11.5px]">
        <span className="flex items-center gap-1.5 text-[var(--foreground)]">
          <span className="size-1.5 rounded-full" style={{ background: STEP_COLOR[run.status === "error" ? "skipped" : run.status === "done" ? "done" : "running"] }} />
          {runLabel}
        </span>
        <span className="font-mono text-[10.5px] text-[var(--text-subtle)]">
          {run.totalSteps} {run.totalSteps === 1 ? "nodo" : "nodos"}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {steps.map(({ node, status }) => (
          <div
            key={node.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-2"
          >
            <span className="size-1.5 rounded-full" style={{ background: STEP_COLOR[status] }} />
            <div className="min-w-0">
              <div className="truncate text-[12px] text-[var(--foreground)]">{node.name}</div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-[var(--text-subtle)]">
                {node.meta}
              </div>
            </div>
            <span className="font-mono text-[11px] text-[var(--text-muted)]">{STEP_LABEL[status]}</span>
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
