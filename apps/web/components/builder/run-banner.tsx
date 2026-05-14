"use client";

import { memo } from "react";
import { Square } from "lucide-react";
import { useBuilder } from "@/lib/builder/builder-context";

export const RunBanner = memo(function RunBanner() {
  const { state, stopTestRun, dispatch } = useBuilder();
  const run = state.testRun;

  if (!run) return null;

  const isRunning = run.status === "running";
  const isDone = run.status === "done";
  const elapsed = ((Date.now() - run.startedAt) / 1000).toFixed(1);
  const currentNode = run.currentNodeId
    ? state.nodes.find((n) => n.id === run.currentNodeId)
    : null;

  return (
    <div className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-4 py-2 shadow-lg">
      {/* Status dot */}
      <span
        className="size-2 shrink-0 rounded-full"
        style={{
          background: isDone
            ? "var(--status-ok)"
            : run.status === "error"
              ? "var(--status-err, #e55)"
              : "var(--dm-accent)",
          animation: isRunning ? "pulse-dot 1s ease-in-out infinite" : "none",
          boxShadow: isDone ? "0 0 6px var(--status-ok)" : undefined,
        }}
      />

      {/* Label */}
      <span className="text-[12.5px] font-medium text-[var(--foreground)]">
        {isRunning
          ? "Test run"
          : isDone
            ? "Completado"
            : "Detenido"}
      </span>

      {/* Step info */}
      {isRunning && currentNode && (
        <span className="font-mono text-[11px] text-[var(--text-subtle)]">
          Paso {run.stepIndex + 1}/{run.totalSteps} · {currentNode.name}
        </span>
      )}

      {isDone && (
        <span className="font-mono text-[11px] text-[var(--text-subtle)]">
          {run.totalSteps} nodos · {elapsed}s
        </span>
      )}

      {run.status === "error" && (
        <span className="font-mono text-[11px] text-[var(--text-subtle)]">
          cancelado
        </span>
      )}

      {/* Stop / dismiss */}
      {isRunning ? (
        <button
          onClick={stopTestRun}
          className="ml-1 inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        >
          <Square className="size-2.5" /> Detener
        </button>
      ) : (
        <button
          onClick={() => dispatch({ type: "DISMISS_TEST_RUN" })}
          className="ml-1 text-[11px] text-[var(--text-subtle)] hover:text-[var(--foreground)]"
        >
          Cerrar
        </button>
      )}
    </div>
  );
});
