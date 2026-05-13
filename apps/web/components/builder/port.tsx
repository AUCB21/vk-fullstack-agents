"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { PortSide } from "@/lib/builder/builder-types";
import { useBuilder } from "@/lib/builder/builder-context";

export const Port = memo(function Port({
  nodeId,
  side,
}: {
  nodeId: string;
  side: PortSide;
}) {
  const { state, startWiring, completeWiring } = useBuilder();
  const isWiring = state.wiringFrom !== null;
  const isSource = state.wiringFrom?.nodeId === nodeId;

  return (
    <span
      className={cn(
        "node-port",
        side,
        isWiring && !isSource && "target-highlight",
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (isWiring && !isSource) {
          completeWiring(nodeId, side);
        } else if (!isWiring) {
          startWiring(nodeId, side);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
});
