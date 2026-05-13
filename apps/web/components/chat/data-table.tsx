"use client";

import { Table2, Filter, Download, MoreHorizontal } from "lucide-react";
import { ITEMS } from "@/lib/mock-data";
import { StatusPill } from "./status-pill";
import { CiteCode } from "./citation";

export function DataTable({
  onCite,
}: {
  onCite: (code: string, kind: string, event: React.MouseEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <Table2 className="size-3.5 text-[var(--text-muted)]" />
        <span className="text-[12.5px] text-[var(--foreground)]">
          Inventory — Items below reorder point
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-subtle)]">
          {ITEMS.length}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {[Filter, Download, MoreHorizontal].map((Icon, i) => (
            <button
              key={i}
              className="flex size-[26px] items-center justify-center rounded-md text-[var(--text-muted)] opacity-50 cursor-not-allowed"
              title="Proximamente"
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {["ItemCode", "ItemName", "Whs", "OnHand", "Committed", "Ordered", "AvgPrice", "Status"].map(
                (col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-subtle)]"
                    style={
                      ["OnHand", "Committed", "Ordered", "AvgPrice"].includes(col)
                        ? { textAlign: "right" }
                        : undefined
                    }
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((item, ri) => (
              <tr key={item.ItemCode} className="group/row">
                {/* ItemCode */}
                <td className="whitespace-nowrap border-b border-[var(--border)] px-3 py-[9px] font-[family-name:var(--font-geist-mono)] text-[11.5px] text-[var(--foreground)] group-last/row:border-b-0 group-hover/row:bg-[var(--surface-hover)]">
                  <CiteCode code={item.ItemCode} kind="item" onClick={onCite} />
                </td>
                {/* ItemName */}
                <td className="whitespace-nowrap border-b border-[var(--border)] px-3 py-[9px] text-[var(--foreground)] group-last/row:border-b-0 group-hover/row:bg-[var(--surface-hover)]">
                  {item.ItemName}
                </td>
                {/* Whs */}
                <td className="whitespace-nowrap border-b border-[var(--border)] px-3 py-[9px] font-[family-name:var(--font-geist-mono)] text-[11.5px] text-[var(--foreground)] group-last/row:border-b-0 group-hover/row:bg-[var(--surface-hover)]">
                  {item.Whs}
                </td>
                {/* OnHand */}
                <td className="whitespace-nowrap border-b border-[var(--border)] px-3 py-[9px] text-right tabular-nums text-[var(--foreground)] group-last/row:border-b-0 group-hover/row:bg-[var(--surface-hover)]">
                  {item.OnHand}
                </td>
                {/* Committed */}
                <td className="whitespace-nowrap border-b border-[var(--border)] px-3 py-[9px] text-right tabular-nums text-[var(--foreground)] group-last/row:border-b-0 group-hover/row:bg-[var(--surface-hover)]">
                  {item.Committed}
                </td>
                {/* Ordered */}
                <td className="whitespace-nowrap border-b border-[var(--border)] px-3 py-[9px] text-right tabular-nums text-[var(--foreground)] group-last/row:border-b-0 group-hover/row:bg-[var(--surface-hover)]">
                  {item.Ordered}
                </td>
                {/* AvgPrice */}
                <td className="whitespace-nowrap border-b border-[var(--border)] px-3 py-[9px] text-right font-[family-name:var(--font-geist-mono)] text-[11.5px] tabular-nums text-[var(--foreground)] group-last/row:border-b-0 group-hover/row:bg-[var(--surface-hover)]">
                  ${item.AvgPrice.toFixed(2)}
                </td>
                {/* Status */}
                <td className="whitespace-nowrap border-b border-[var(--border)] px-3 py-[9px] group-last/row:border-b-0 group-hover/row:bg-[var(--surface-hover)]">
                  <StatusPill status={item.Status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
