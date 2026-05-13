"use client";

import { TrendingUp } from "lucide-react";
import { WEEKLY_MOVEMENTS } from "@/lib/mock-data";

const W = 760;
const H = 90;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 18;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;

export function Sparkline() {
  const data = WEEKLY_MOVEMENTS;
  const allVals = data.flatMap((d) => [d.inbound, d.outbound]);
  const max = Math.max(...allVals) * 1.1;

  const x = (i: number) => PAD_L + (i / (data.length - 1)) * INNER_W;
  const y = (v: number) => PAD_T + INNER_H - (v / max) * INNER_H;

  // Build polyline points
  const inboundPts = data.map((d, i) => `${x(i)},${y(d.inbound)}`).join(" ");
  const outboundPts = data.map((d, i) => `${x(i)},${y(d.outbound)}`).join(" ");

  // Inbound area path (fill under the line)
  const areaPath = [
    `M ${x(0)},${y(data[0].inbound)}`,
    ...data.slice(1).map((d, i) => `L ${x(i + 1)},${y(d.inbound)}`),
    `L ${x(data.length - 1)},${PAD_T + INNER_H}`,
    `L ${x(0)},${PAD_T + INNER_H}`,
    "Z",
  ].join(" ");

  // Gridlines at 25%, 50%, 75%
  const gridYs = [0.25, 0.5, 0.75].map(
    (pct) => PAD_T + INNER_H - pct * INNER_H,
  );

  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)] p-3.5">
      {/* Title */}
      <div className="mb-2 flex items-center gap-2 text-[12.5px] text-[var(--foreground)]">
        <TrendingUp className="size-[13px] text-[var(--text-muted)]" />
        <span>Weekly stock movement</span>
        <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-subtle)]">
          items &middot; 6 weeks
        </span>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[90px] w-full">
        <defs>
          <linearGradient id="inbound-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--dm-accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--dm-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines */}
        {gridYs.map((gy, i) => (
          <line
            key={i}
            x1={PAD_L}
            y1={gy}
            x2={W - PAD_R}
            y2={gy}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}

        {/* Inbound area */}
        <path d={areaPath} fill="url(#inbound-fill)" />

        {/* Inbound line */}
        <polyline
          points={inboundPts}
          fill="none"
          stroke="var(--dm-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Outbound line */}
        <polyline
          points={outboundPts}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inbound dots */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(d.inbound)}
            r={2.5}
            fill="var(--dm-accent)"
          />
        ))}

        {/* Week labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 2}
            textAnchor="middle"
            fill="var(--text-subtle)"
            fontSize={10}
            fontFamily="var(--font-geist-mono)"
          >
            {d.week}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex gap-4 text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-[2px] w-2.5 rounded-full"
            style={{ background: "var(--dm-accent)" }}
          />
          Inbound (GRPO)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-[2px] w-2.5 rounded-full"
            style={{
              background: "var(--text-muted)",
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--text-muted) 0 3px, transparent 3px 6px)",
              backgroundColor: "transparent",
            }}
          />
          Outbound (deliveries)
        </span>
      </div>
    </div>
  );
}
