"use client";

const MAP: Record<"ok" | "warn" | "err", string> = {
  ok: "In stock",
  warn: "Low",
  err: "Critical",
};

export function StatusPill({ status }: { status: "ok" | "warn" | "err" }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-[7px] py-[1px] text-[10.5px] font-medium tracking-[0.02em]"
      style={{
        background: `oklch(from var(--status-${status}) l c h / 0.15)`,
        color: `var(--status-${status})`,
      }}
    >
      <span
        className="size-[5px] rounded-full"
        style={{ background: "currentColor" }}
      />
      {MAP[status]}
    </span>
  );
}
