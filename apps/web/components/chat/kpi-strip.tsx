"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { INVENTORY_KPIS } from "@/lib/mock-data";

export function KpiStrip() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {INVENTORY_KPIS.map((kpi) => (
        <div
          key={kpi.l}
          className="flex flex-col gap-0.5 rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2.5"
        >
          <span className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-subtle)]">
            {kpi.l}
          </span>
          <span className="text-[20px] font-medium tabular-nums tracking-[-0.01em] text-[var(--foreground)]">
            {kpi.v}
          </span>
          <span
            className="flex items-center gap-1 text-[11px] tabular-nums"
            style={{ color: kpi.up ? "var(--status-ok)" : "var(--status-err)" }}
          >
            {kpi.up ? (
              <ArrowUp className="size-2.5" />
            ) : (
              <ArrowDown className="size-2.5" />
            )}
            {kpi.d}
          </span>
        </div>
      ))}
    </div>
  );
}
