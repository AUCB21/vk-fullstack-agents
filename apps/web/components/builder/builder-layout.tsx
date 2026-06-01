"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useBuilder } from "@/lib/builder/builder-context";
import { NODE_LIBRARY } from "@/lib/builder/node-library";
import type { NodeTemplate } from "@/lib/builder/builder-types";
import type { DragOffset } from "@/lib/builder/wire-utils";
import { BuilderSidebar } from "./builder-sidebar";
import { CanvasTopbar } from "./canvas-topbar";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { NodeIcon } from "./node-icon";

export function BuilderLayout() {
  const { state, addNode, moveNode } = useBuilder();

  // Drag state lives here so the DndContext can wrap both the sidebar
  // (drag source: library items) and the canvas (drop target + node drags).
  const [dragOffset, setDragOffset] = useState<DragOffset>(null);
  const [activeTemplate, setActiveTemplate] = useState<NodeTemplate | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setDragOffset(null);
    if (e.active.data.current?.type === "library-item") {
      const templateId = e.active.data.current.templateId as string;
      setActiveTemplate(NODE_LIBRARY.find((t) => t.id === templateId) ?? null);
    }
  }, []);

  const handleDragMove = useCallback(
    (e: DragMoveEvent) => {
      if (e.active.data.current?.type !== "canvas-node") return;
      const z = state.zoom / 100;
      setDragOffset({
        nodeId: e.active.id as string,
        dx: e.delta.x / z,
        dy: e.delta.y / z,
      });
    },
    [state.zoom],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setDragOffset(null);
      setActiveTemplate(null);

      const { active, over, delta } = e;
      const z = state.zoom / 100;

      // Drop a library item onto the canvas → create a node
      if (active.data.current?.type === "library-item" && over?.id === "canvas-drop") {
        const templateId = active.data.current.templateId as string;
        const template = NODE_LIBRARY.find((t) => t.id === templateId);
        const canvasEl = document.getElementById("builder-canvas");
        if (!template || !canvasEl) return;

        const rect = canvasEl.getBoundingClientRect();
        const event = e.activatorEvent as PointerEvent;
        const x = (event.clientX + delta.x - rect.left) / z - state.panX - 120;
        const y = (event.clientY + delta.y - rect.top) / z - state.panY - 40;
        addNode(template, Math.max(0, x), Math.max(0, y));
        return;
      }

      // Move an existing canvas node
      if (active.data.current?.type === "canvas-node") {
        const dx = delta.x / z;
        const dy = delta.y / z;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          moveNode(active.id as string, dx, dy);
        }
      }
    },
    [state.zoom, state.panX, state.panY, addNode, moveNode],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="grid h-screen w-screen grid-cols-[264px_1fr_320px] grid-rows-[minmax(0,1fr)] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <BuilderSidebar />

        <div className="flex min-h-0 min-w-0 flex-col">
          <CanvasTopbar />
          <Canvas dragOffset={dragOffset} />
        </div>

        <Inspector />
      </div>

      {/* Floating preview that follows the cursor while dragging from the library */}
      <DragOverlay dropAnimation={null}>
        {activeTemplate ? (
          <div
            data-kind={activeTemplate.kind}
            className="flex items-center gap-[9px] rounded-[7px] border border-[var(--border-strong)] bg-[var(--bg-elev)] px-[10px] py-[7px] shadow-xl"
            style={{ width: 232, cursor: "grabbing" }}
          >
            <div className="lib-icon-wrap grid size-6 shrink-0 place-items-center rounded-[6px]">
              <NodeIcon name={activeTemplate.icon} className="size-[13px]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[12.5px] text-[var(--foreground)]">{activeTemplate.name}</span>
              <span className="block text-[10.5px] text-[var(--text-subtle)]">{activeTemplate.desc}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
