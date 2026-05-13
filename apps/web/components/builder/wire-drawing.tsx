"use client";

import { useEffect, useRef, useState } from "react";
import { useBuilder } from "@/lib/builder/builder-context";
import {
  getPortPosition,
  buildBezierPathDirectional,
  inferTargetSide,
} from "@/lib/builder/wire-utils";
import type { PortSide } from "@/lib/builder/builder-types";

const SNAP_RADIUS = 80; // ~5rem in canvas-space
const SIDES: PortSide[] = ["top", "right", "bottom", "left"];

type SnapTarget = { nodeId: string; side: PortSide; x: number; y: number };

export function WireDrawing() {
  const { state, cancelWiring, completeWiring } = useBuilder();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const snapRef = useRef<SnapTarget | null>(null);

  const sourceNode = state.wiringFrom
    ? state.nodes.find((n) => n.id === state.wiringFrom!.nodeId)
    : null;

  useEffect(() => {
    if (!state.wiringFrom) return;

    const onMove = (e: MouseEvent) => {
      const canvas = document.getElementById("builder-canvas");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const zoom = state.zoom / 100;
      setMouse({
        x: (e.clientX - rect.left) / zoom - state.panX,
        y: (e.clientY - rect.top) / zoom - state.panY,
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelWiring();
    };

    const onClick = () => {
      if (snapRef.current) {
        completeWiring(snapRef.current.nodeId, snapRef.current.side);
      } else {
        cancelWiring();
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKey);

    const timer = setTimeout(() => {
      const canvas = document.getElementById("builder-canvas");
      canvas?.addEventListener("click", onClick);
    }, 50);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
      const canvas = document.getElementById("builder-canvas");
      canvas?.removeEventListener("click", onClick);
    };
  }, [state.wiringFrom, state.zoom, state.panX, state.panY, cancelWiring, completeWiring]);

  if (!sourceNode || !state.wiringFrom) return null;

  // Find nearest port within snap radius
  let snap: SnapTarget | null = null;
  let bestDist = SNAP_RADIUS;

  for (const node of state.nodes) {
    if (node.id === state.wiringFrom.nodeId) continue;
    for (const side of SIDES) {
      const pos = getPortPosition(node, side);
      const dist = Math.sqrt((mouse.x - pos.x) ** 2 + (mouse.y - pos.y) ** 2);
      if (dist < bestDist) {
        bestDist = dist;
        snap = { nodeId: node.id, side, x: pos.x, y: pos.y };
      }
    }
  }

  snapRef.current = snap;

  const src = getPortPosition(sourceNode, state.wiringFrom.side);
  const endX = snap ? snap.x : mouse.x;
  const endY = snap ? snap.y : mouse.y;
  const endSide = snap ? snap.side : inferTargetSide(src.x, src.y, mouse.x, mouse.y);
  const d = buildBezierPathDirectional(src.x, src.y, state.wiringFrom.side, endX, endY, endSide);

  return (
    <svg className="wire-layer" style={{ zIndex: 10 }}>
      <path d={d} className={snap ? "wire-drawing-path snapped" : "wire-drawing-path"} />
      {snap && (
        <circle cx={snap.x} cy={snap.y} r="8" className="wire-snap-indicator" />
      )}
    </svg>
  );
}
