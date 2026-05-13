"use client";

import { Pencil } from "lucide-react";
import { CiteCode } from "./citation";

export function DraftPo({
  onCite,
}: {
  onCite: (code: string, kind: string, event: React.MouseEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <Pencil className="size-3.5 text-[var(--text-muted)]" />
        <span className="text-[12.5px] text-[var(--foreground)]">
          Draft Purchase Order
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-subtle)]">
          DRAFT &middot; not posted
        </span>
        <button className="ml-auto flex size-[26px] items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
          <Pencil className="size-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="grid grid-cols-[max-content_1fr] gap-x-[18px] gap-y-1.5 px-3.5 py-3 text-[12.5px]">
        {/* Row 1: CardCode */}
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-subtle)]">
          CardCode
        </span>
        <span className="text-[var(--foreground)]">
          <CiteCode code="V10145" kind="vendor" onClick={onCite} />
          <span className="text-[var(--text-muted)]"> &middot; Bearings Direct GmbH</span>
        </span>

        {/* Row 2: Item */}
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-subtle)]">
          Item
        </span>
        <span className="text-[var(--foreground)]">
          <CiteCode code="A0017" kind="item" onClick={onCite} />
          <span className="text-[var(--text-muted)]">
            {" "}
            &middot; Bearing 6204-2RS &middot; 200 &times; &euro;4.78
          </span>
        </span>

        {/* Row 3: Total */}
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-subtle)]">
          Total
        </span>
        <span className="tabular-nums text-[var(--foreground)]">&euro;956.00</span>

        {/* Row 4: ETA */}
        <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-subtle)]">
          ETA
        </span>
        <span className="text-[var(--foreground)]">2026-05-21 (9d lead time)</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-2.5 py-2.5">
        <button className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12.5px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
          Discard
        </button>
        <button className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[12.5px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]">
          Edit lines
        </button>
        <button className="rounded-[8px] bg-[var(--dm-accent)] px-3.5 py-1 text-[12.5px] font-medium text-[var(--dm-accent-fg)] transition-opacity hover:opacity-90">
          Post to SAP
        </button>
      </div>
    </div>
  );
}
