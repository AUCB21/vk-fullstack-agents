"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { ITEMS } from "@/lib/mock-data";

/* ------------------------------------------------------------------ */
/*  CiteCode — inline clickable code reference                        */
/* ------------------------------------------------------------------ */

export function CiteCode({
  code,
  kind,
  onClick,
}: {
  code: string;
  kind: "item" | "vendor";
  onClick?: (code: string, kind: string, event: React.MouseEvent) => void;
}) {
  return (
    <span
      className="cursor-pointer px-[1px] font-[family-name:var(--font-geist-mono)] text-[0.92em] text-[var(--dm-accent)] transition-colors hover:bg-[var(--dm-accent-soft)]"
      style={{ borderBottom: "1px dashed oklch(from var(--dm-accent) l c h / 0.4)" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(code, kind, e);
      }}
    >
      {code}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  CitationPopover — floating detail card                            */
/* ------------------------------------------------------------------ */

type PopoverData = {
  code: string;
  kind: "item" | "vendor";
  x: number;
  y: number;
} | null;

export function CitationPopover({ data }: { data: PopoverData }) {
  const [winW, setWinW] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!data) return null;

  const item = data.kind === "item" ? ITEMS.find((i) => i.ItemCode === data.code) : null;

  const top = data.y + 18;
  const left = Math.min(data.x, winW - 296);

  return (
    <div
      className="fixed z-50 w-[280px] rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)] p-3 text-xs text-[var(--foreground)]"
      style={{ top, left, boxShadow: "var(--shadow)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {data.kind === "item" && item ? (
        <>
          <div className="mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.05em] text-[var(--text-subtle)]">
            SAP B1 &middot; Item Master
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
            <dt className="text-[var(--text-subtle)]">ItemCode</dt>
            <dd className="font-[family-name:var(--font-geist-mono)]">{item.ItemCode}</dd>
            <dt className="text-[var(--text-subtle)]">ItemName</dt>
            <dd>{item.ItemName}</dd>
            <dt className="text-[var(--text-subtle)]">OnHand</dt>
            <dd className="tabular-nums">{item.OnHand}</dd>
            <dt className="text-[var(--text-subtle)]">Whs</dt>
            <dd className="font-[family-name:var(--font-geist-mono)]">{item.Whs}</dd>
          </dl>
          <a
            href={`#/Items('${item.ItemCode}')`}
            className="mt-2.5 flex items-center gap-1 font-[family-name:var(--font-geist-mono)] text-[11.5px] text-[var(--dm-accent)]"
          >
            Open in SAP B1 &rarr; /Items(&apos;{item.ItemCode}&apos;)
            <ExternalLink className="size-3" />
          </a>
        </>
      ) : data.kind === "vendor" ? (
        <>
          <div className="mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.05em] text-[var(--text-subtle)]">
            SAP B1 &middot; Business Partner
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
            <dt className="text-[var(--text-subtle)]">CardCode</dt>
            <dd className="font-[family-name:var(--font-geist-mono)]">{data.code}</dd>
            <dt className="text-[var(--text-subtle)]">CardName</dt>
            <dd>Bearings Direct GmbH</dd>
            <dt className="text-[var(--text-subtle)]">Currency</dt>
            <dd>EUR</dd>
            <dt className="text-[var(--text-subtle)]">Lead time</dt>
            <dd>9 days (avg of last 5)</dd>
          </dl>
          <a
            href={`#/BusinessPartners('${data.code}')`}
            className="mt-2.5 flex items-center gap-1 font-[family-name:var(--font-geist-mono)] text-[11.5px] text-[var(--dm-accent)]"
          >
            Open in SAP B1 &rarr; /BusinessPartners(&apos;{data.code}&apos;)
            <ExternalLink className="size-3" />
          </a>
        </>
      ) : null}
    </div>
  );
}
