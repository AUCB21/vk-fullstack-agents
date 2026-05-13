"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Wire } from "@/lib/builder/builder-types";

export const Arrow = memo(function Arrow({
  wire,
  d,
  isSelected,
  onSelect,
}: {
  wire: Wire;
  d: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(wire.id);
  };

  return (
    <g className="wire-group">
      <path d={d} className="wire-hit-area" onClick={handleClick} />
      <path
        d={d}
        className={cn(
          wire.flow ? "wire-path-flow" : "wire-path",
          isSelected && "selected",
        )}
        onClick={handleClick}
      />
    </g>
  );
});
