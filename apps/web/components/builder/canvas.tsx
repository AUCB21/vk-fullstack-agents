"use client";

import { useCallback, useRef, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useBuilder } from "@/lib/builder/builder-context";
import { BuilderNode } from "./builder-node";
import { WireLayer } from "./wire-layer";
import { WireDrawing } from "./wire-drawing";
import { CanvasControls } from "./canvas-controls";
import { Minimap } from "./minimap";
import { NODE_LIBRARY } from "@/lib/builder/node-library";
import type { BuilderNode as BuilderNodeType } from "@/lib/builder/builder-types";

function DraggableNode({ node }: { node: BuilderNodeType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: node.id,
    data: { type: "canvas-node", node },
  });

  return (
    <div ref={setNodeRef} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "auto" }}>
      <BuilderNode
        node={node}
        dragListeners={listeners}
        dragAttributes={attributes}
        isDragging={isDragging}
      />
    </div>
  );
}

export function Canvas() {
  const { state, dispatch, selectNode, selectWire, addNode, moveNode, cancelWiring } = useBuilder();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const zoom = state.zoom / 100;

  // Sensor with activation constraint to allow port clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // Droppable area
  const { setNodeRef: setDropRef } = useDroppable({ id: "canvas-drop" });

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over, delta } = e;

      // Drag from sidebar (library item)
      if (active.data.current?.type === "library-item" && over?.id === "canvas-drop") {
        const templateId = active.data.current.templateId as string;
        const template = NODE_LIBRARY.find((t) => t.id === templateId);
        if (!template || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        // Use the activatorEvent to get the final position
        const event = e.activatorEvent as PointerEvent;
        const x = (event.clientX + delta.x - rect.left) / zoom - state.panX - 120;
        const y = (event.clientY + delta.y - rect.top) / zoom - state.panY - 40;
        addNode(template, Math.max(0, x), Math.max(0, y));
        return;
      }

      // Drag existing node on canvas
      if (active.data.current?.type === "canvas-node") {
        const dx = delta.x / zoom;
        const dy = delta.y / zoom;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          moveNode(active.id as string, dx, dy);
        }
      }
    },
    [zoom, state.panX, state.panY, addNode, moveNode],
  );

  // Canvas click — deselect all
  const handleCanvasClick = useCallback(() => {
    selectNode(null);
    selectWire(null);
  }, [selectNode, selectWire]);

  // Middle-button / space pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
      }
    },
    [state.panX, state.panY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      dispatch({ type: "SET_PAN", x: panStart.current.panX + dx / zoom, y: panStart.current.panY + dy / zoom });
    },
    [isPanning, zoom, dispatch],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        dispatch({ type: "SET_ZOOM", zoom: state.zoom + delta });
      }
    },
    [state.zoom, dispatch],
  );

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        dispatch({ type: "DELETE_SELECTED" });
      } else if (e.key === "Escape") {
        cancelWiring();
        selectNode(null);
        selectWire(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "Z" || e.key === "y")) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (state.selectedNodeId) {
          dispatch({ type: "DUPLICATE_NODE", id: state.selectedNodeId });
        }
      }
    },
    [dispatch, cancelWiring, selectNode, selectWire, state.selectedNodeId],
  );

  const activeDragNode = activeDragId
    ? state.nodes.find((n) => n.id === activeDragId)
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        ref={(el) => {
          canvasRef.current = el;
          setDropRef(el);
        }}
        id="builder-canvas"
        className="builder-canvas relative flex-1 overflow-hidden outline-none"
        style={{ cursor: isPanning ? "grabbing" : state.wiringFrom ? "crosshair" : "default" }}
        tabIndex={0}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        {/* Transform container for zoom + pan */}
        <div
          style={{
            transform: `scale(${zoom}) translate(${state.panX}px, ${state.panY}px)`,
            transformOrigin: "0 0",
            position: "absolute",
            inset: 0,
          }}
        >
          <WireLayer />
          <WireDrawing />
          {state.nodes.map((n) => (
            <DraggableNode key={n.id} node={n} />
          ))}
        </div>

        <CanvasControls />
        <Minimap />
      </div>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeDragNode ? (
          <div style={{ opacity: 0.7, pointerEvents: "none" }}>
            <BuilderNode node={activeDragNode} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
