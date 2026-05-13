"use client";

import { memo, useMemo } from "react";
import { useBuilder } from "@/lib/builder/builder-context";
import { wirePath, resolveWireSides, type DragOffset } from "@/lib/builder/wire-utils";
import { Arrow } from "./arrow";

/** Shared SVG defs for arrowhead markers. */
function WireDefs() {
  return (
    <defs>
      {/* Default arrowhead — muted accent */}
      <marker
        id="wire-arrow"
        viewBox="0 0 12 8"
        refX="10"
        refY="4"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 0.8 L 10 4 L 0 7.2 L 2.5 4 Z" className="wire-arrow-fill" />
      </marker>

      {/* Active arrowhead — full accent (hover / selected / flow) */}
      <marker
        id="wire-arrow-accent"
        viewBox="0 0 12 8"
        refX="10"
        refY="4"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 0.8 L 10 4 L 0 7.2 L 2.5 4 Z" className="wire-arrow-fill-accent" />
      </marker>
    </defs>
  );
}

export const WireLayer = memo(function WireLayer({
  dragOffset,
}: {
  dragOffset?: DragOffset;
}) {
  const { state, selectWire } = useBuilder();

  // Pre-compute fan groups: how many wires share each port
  const { inGroups, outGroups } = useMemo(() => {
    const ing = new Map<string, string[]>();
    const outg = new Map<string, string[]>();
    for (const w of state.wires) {
      const { fromSide, toSide } = resolveWireSides(w);
      const inKey = `${w.to}:${toSide}`;
      const outKey = `${w.from}:${fromSide}`;
      const inArr = ing.get(inKey) || [];
      inArr.push(w.id);
      ing.set(inKey, inArr);
      const outArr = outg.get(outKey) || [];
      outArr.push(w.id);
      outg.set(outKey, outArr);
    }
    return { inGroups: ing, outGroups: outg };
  }, [state.wires]);

  return (
    <svg className="wire-layer">
      <WireDefs />

      {state.wires.map((w) => {
        const { fromSide, toSide } = resolveWireSides(w);
        const inWires = inGroups.get(`${w.to}:${toSide}`) || [w.id];
        const outWires = outGroups.get(`${w.from}:${fromSide}`) || [w.id];

        const d = wirePath(state.nodes, w, {
          dragOffset,
          fanIn: { index: inWires.indexOf(w.id), total: inWires.length },
          fanOut: { index: outWires.indexOf(w.id), total: outWires.length },
        });
        if (!d) return null;

        return (
          <Arrow
            key={w.id}
            wire={w}
            d={d}
            isSelected={state.selectedWireId === w.id}
            onSelect={selectWire}
          />
        );
      })}
    </svg>
  );
});
