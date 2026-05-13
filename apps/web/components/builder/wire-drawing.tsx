"use client";

import { useEffect, useState } from "react";
import { useBuilder } from "@/lib/builder/builder-context";
import { getNodeCenter, buildBezierPath } from "@/lib/builder/wire-utils";

export function WireDrawing() {
  const { state, cancelWiring } = useBuilder();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const sourceNode = state.wiringFrom
    ? state.nodes.find((n) => n.id === state.wiringFrom)
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
      // Click on empty canvas cancels wiring
      // (Clicks on ports are handled by the port components and stop propagation)
      cancelWiring();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKey);

    // Delay adding click listener to avoid the click that started wiring from canceling it
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
  }, [state.wiringFrom, state.zoom, state.panX, state.panY, cancelWiring]);

  if (!sourceNode || !state.wiringFrom) return null;

  const src = getNodeCenter(sourceNode);
  const d = buildBezierPath(src.outX, src.outY, mouse.x, mouse.y);

  return (
    <svg className="wire-layer" style={{ zIndex: 10 }}>
      <path d={d} className="wire-drawing-path" />
    </svg>
  );
}
