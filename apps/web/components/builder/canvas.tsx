"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragOffset } from "@/lib/builder/wire-utils";
import { useBuilder } from "@/lib/builder/builder-context";
import { BuilderNode } from "./builder-node";
import { WireLayer } from "./wire-layer";
import { WireDrawing } from "./wire-drawing";
import { CanvasControls } from "./canvas-controls";
import { Minimap } from "./minimap";
import { RunBanner } from "./run-banner";
import { NODE_LIBRARY } from "@/lib/builder/node-library";
import type { BuilderNode as BuilderNodeType } from "@/lib/builder/builder-types";

/* ── Draggable wrapper — moves the real node, no ghost overlay ── */
function DraggableNode({ node, canvasZoom }: { node: BuilderNodeType; canvasZoom: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { type: "canvas-node", node },
  });

  // During drag, add pointer delta converted from screen-space → canvas-space
  const tx = node.x + (transform ? transform.x / canvasZoom : 0);
  const ty = node.y + (transform ? transform.y / canvasZoom : 0);

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        transform: `translate3d(${tx}px, ${ty}px, 0)`,
        willChange: "transform",
        pointerEvents: "auto",
        transition: isDragging ? "none" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <BuilderNode
        node={node}
        dragListeners={listeners}
        dragAttributes={attributes}
        isDragging={isDragging}
      />
    </div>
  );
}

/* ── Canvas ── */
export function Canvas() {
  const { state, dispatch, selectNode, selectWire, addNode, moveNode, cancelWiring, toggleSelectNode } = useBuilder();
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);

  /* ─── Live drag offset for real-time wire updates ─── */
  const [dragOffset, setDragOffset] = useState<DragOffset>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  /* ─── Live pan/zoom refs — bypass React during interaction ─── */
  const livePan = useRef({ x: state.panX, y: state.panY });
  const liveZoom = useRef(state.zoom);
  const isPanningRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false); // cursor style only
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const rafId = useRef(0);
  const zoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply transform directly to DOM — zero React re-renders
  const applyTransform = useCallback(() => {
    if (!transformRef.current) return;
    const z = liveZoom.current / 100;
    transformRef.current.style.transform =
      `scale(${z}) translate3d(${livePan.current.x}px, ${livePan.current.y}px, 0)`;
  }, []);

  // Sync refs when state changes externally (undo, fit-to-screen, button zoom, etc.)
  useEffect(() => {
    livePan.current = { x: state.panX, y: state.panY };
    liveZoom.current = state.zoom;
    applyTransform();
  }, [state.panX, state.panY, state.zoom, applyTransform]);

  // Sensor with activation constraint to allow port clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // Droppable area
  const { setNodeRef: setDropRef } = useDroppable({ id: "canvas-drop" });

  /* ─── Drag handlers: track offset for live wire updates ─── */
  const handleDragStart = useCallback((_e: DragStartEvent) => {
    // Reset offset at drag start (will be set on first move)
    setDragOffset(null);
  }, []);

  const handleDragMove = useCallback((e: DragMoveEvent) => {
    if (e.active.data.current?.type !== "canvas-node") return;
    const z = liveZoom.current / 100;
    setDragOffset({
      nodeId: e.active.id as string,
      dx: e.delta.x / z,
      dy: e.delta.y / z,
    });
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      // Clear live drag offset
      setDragOffset(null);

      const { active, over, delta } = e;

      // Drag from sidebar (library item)
      if (active.data.current?.type === "library-item" && over?.id === "canvas-drop") {
        const templateId = active.data.current.templateId as string;
        const template = NODE_LIBRARY.find((t) => t.id === templateId);
        if (!template || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const z = liveZoom.current / 100;
        const px = livePan.current.x;
        const py = livePan.current.y;
        const event = e.activatorEvent as PointerEvent;
        const x = (event.clientX + delta.x - rect.left) / z - px - 120;
        const y = (event.clientY + delta.y - rect.top) / z - py - 40;
        addNode(template, Math.max(0, x), Math.max(0, y));
        return;
      }

      // Drag existing node on canvas
      if (active.data.current?.type === "canvas-node") {
        const z = liveZoom.current / 100;
        const dx = delta.x / z;
        const dy = delta.y / z;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          moveNode(active.id as string, dx, dy);
        }
      }
    },
    [addNode, moveNode],
  );

  // Canvas click — deselect all
  const handleCanvasClick = useCallback(() => {
    selectNode(null);
    selectWire(null);
  }, [selectNode, selectWire]);

  const handleConfirmDelete = useCallback(() => {
    setDeleteConfirm(false);
    dispatch({ type: "DELETE_SELECTED" });
  }, [dispatch]);

  /* ─── Pan: direct DOM manipulation, single dispatch on end ─── */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      isPanningRef.current = true;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: livePan.current.x,
        panY: livePan.current.y,
      };
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const z = liveZoom.current / 100;
      livePan.current.x = panStart.current.panX + dx / z;
      livePan.current.y = panStart.current.panY + dy / z;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(applyTransform);
    },
    [applyTransform],
  );

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
      dispatch({ type: "SET_PAN", x: livePan.current.x, y: livePan.current.y });
    }
  }, [dispatch]);

  /* ─── Zoom: rAF + debounced commit ─── */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.3, 8);
        liveZoom.current = Math.max(25, Math.min(200, liveZoom.current + delta));
        cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(applyTransform);
        // Debounce state commit so React only reconciles once per zoom gesture
        if (zoomTimer.current) clearTimeout(zoomTimer.current);
        zoomTimer.current = setTimeout(() => {
          dispatch({ type: "SET_ZOOM", zoom: Math.round(liveZoom.current) });
        }, 150);
      }
    },
    [dispatch, applyTransform],
  );

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Check if deleting nodes that have connected wires
        const ids = state.selectedNodeIds.size > 0
          ? state.selectedNodeIds
          : state.selectedNodeId ? new Set([state.selectedNodeId]) : new Set<string>();
        if (ids.size > 0) {
          const hasWires = state.wires.some((w) => ids.has(w.from) || ids.has(w.to));
          if (hasWires) {
            setDeleteConfirm(true);
            return;
          }
        }
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
      } else if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        dispatch({ type: "SELECT_ALL" });
      }
    },
    [dispatch, cancelWiring, selectNode, selectWire, state.selectedNodeId],
  );

  // Current zoom for DraggableNode coordinate conversion
  const currentZoom = liveZoom.current / 100;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
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
        {/* Transform container — updated via ref during pan/zoom for zero React re-renders */}
        <div
          ref={transformRef}
          style={{
            transformOrigin: "0 0",
            willChange: "transform",
            position: "absolute",
            inset: 0,
          }}
        >
          <WireLayer dragOffset={dragOffset} />
          <WireDrawing />
          {state.nodes.map((n) => (
            <DraggableNode key={n.id} node={n} canvasZoom={currentZoom} />
          ))}
        </div>

        <CanvasControls />
        <Minimap />
        <RunBanner />

        {/* Delete confirmation dialog */}
        {deleteConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[oklch(0_0_0_/_0.4)]">
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-xl" style={{ maxWidth: "22rem" }}>
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Eliminar nodos conectados</h3>
              <p className="text-[12.5px] leading-[1.5] text-[var(--text-muted)]">
                Los nodos seleccionados tienen cables conectados. Al eliminarlos se eliminaran tambien los cables asociados.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-[oklch(0.55_0.2_25)] px-3 py-1.5 text-[12px] font-medium text-white hover:brightness-110"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
