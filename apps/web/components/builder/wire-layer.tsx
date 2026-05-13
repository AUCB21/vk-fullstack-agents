"use client";

import { useBuilder } from "@/lib/builder/builder-context";
import { wirePath } from "@/lib/builder/wire-utils";
import { cn } from "@/lib/utils";

export function WireLayer() {
  const { state, selectWire } = useBuilder();

  return (
    <svg className="wire-layer">
      {state.wires.map((w) => {
        const d = wirePath(state.nodes, w);
        if (!d) return null;
        const isSelected = state.selectedWireId === w.id;
        return (
          <path
            key={w.id}
            d={d}
            className={cn(
              w.flow ? "wire-path-flow" : "wire-path",
              isSelected && "selected",
            )}
            style={{ pointerEvents: "stroke" }}
            onClick={(e) => {
              e.stopPropagation();
              selectWire(w.id);
            }}
          />
        );
      })}
    </svg>
  );
}
