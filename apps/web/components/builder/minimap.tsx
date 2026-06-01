"use client";

import { memo, useRef } from "react";
import { useBuilder } from "@/lib/builder/builder-context";

const MAP_W = 160;
const MAP_H = 100;
const NODE_H = 110; // nominal node height (canvas px) for minimap rendering

export const Minimap = memo(function Minimap() {
  const { state, dispatch } = useBuilder();
  const { nodes, selectedNodeId } = state;
  const draggingRef = useRef(false);

  if (nodes.length === 0) return null;

  // Bounding box of all nodes (with padding)
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + 240));
  const maxY = Math.max(...nodes.map((n) => n.y + 120));
  const totalW = Math.max(maxX - minX + 80, 400);
  const totalH = Math.max(maxY - minY + 80, 300);

  // Uniform scale so the mapped content keeps the real aspect ratio, then center it
  const s = Math.min(MAP_W / totalW, MAP_H / totalH);
  const offsetX = (MAP_W - totalW * s) / 2;
  const offsetY = (MAP_H - totalH * s) / 2;

  // Canvas-space point → minimap point
  const toMapX = (cx: number) => offsetX + (cx - minX + 40) * s;
  const toMapY = (cy: number) => offsetY + (cy - minY + 40) * s;

  const canvasEl = typeof document !== "undefined" ? document.getElementById("builder-canvas") : null;
  const z = state.zoom / 100;

  // Pan the canvas so the clicked minimap point becomes the viewport center
  function panToEvent(clientX: number, clientY: number, rect: DOMRect) {
    const cx = (clientX - rect.left - offsetX) / s + minX - 40;
    const cy = (clientY - rect.top - offsetY) / s + minY - 40;
    const cw = canvasEl?.clientWidth ?? 800;
    const ch = canvasEl?.clientHeight ?? 600;
    dispatch({ type: "SET_PAN", x: cw / z / 2 - cx, y: ch / z / 2 - cy });
  }

  return (
    <div
      className="absolute bottom-3.5 right-3.5 z-[3] h-[100px] w-[160px] cursor-pointer overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] shadow-[var(--shadow)]"
      title="Click o arrastra para navegar"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.stopPropagation();
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        panToEvent(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        panToEvent(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* pointer already released */
        }
      }}
    >
      {nodes.map((n) => (
        <div
          key={n.id}
          className="absolute rounded-sm"
          style={{
            transform: `translate3d(${toMapX(n.x)}px, ${toMapY(n.y)}px, 0)`,
            width: 240 * s,
            height: Math.max(4, NODE_H * s),
            background: n.id === selectedNodeId ? "var(--dm-accent)" : "var(--text-subtle)",
            opacity: n.id === selectedNodeId ? 0.9 : 0.4,
          }}
        />
      ))}
    </div>
  );
});
