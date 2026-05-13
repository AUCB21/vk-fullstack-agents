"use client";

import { useBuilder } from "@/lib/builder/builder-context";

const MAP_W = 160;
const MAP_H = 100;

export function Minimap() {
  const { state } = useBuilder();
  const { nodes, selectedNodeId } = state;

  if (nodes.length === 0) return null;

  // Calculate bounding box
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + 240));
  const maxY = Math.max(...nodes.map((n) => n.y + 120));
  const totalW = Math.max(maxX - minX + 80, 400);
  const totalH = Math.max(maxY - minY + 80, 300);

  return (
    <div className="absolute bottom-3.5 right-3.5 z-[3] h-[100px] w-[160px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] shadow-[var(--shadow)]">
      {nodes.map((n) => (
        <div
          key={n.id}
          className="absolute rounded-sm"
          style={{
            left: ((n.x - minX + 40) / totalW) * MAP_W,
            top: ((n.y - minY + 40) / totalH) * MAP_H,
            width: (240 / totalW) * MAP_W,
            height: 14,
            background: n.id === selectedNodeId ? "var(--dm-accent)" : "var(--text-subtle)",
            opacity: n.id === selectedNodeId ? 0.9 : 0.4,
          }}
        />
      ))}
      {/* Viewport indicator */}
      <div
        className="absolute rounded-[3px] border-[1.5px] border-[var(--dm-accent)]"
        style={{
          left: 6,
          top: 6,
          width: MAP_W * 0.8,
          height: MAP_H * 0.7,
          background: "oklch(from var(--dm-accent) l c h / 0.08)",
        }}
      />
    </div>
  );
}
