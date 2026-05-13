"use client";

import { Plus, Minus, Maximize } from "lucide-react";
import { useBuilder } from "@/lib/builder/builder-context";

export function CanvasControls() {
  const { state, dispatch } = useBuilder();

  return (
    <div className="absolute bottom-3.5 left-3.5 z-[3] flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] p-[3px] shadow-[var(--shadow)]">
      <button
        onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom + 10 })}
        className="grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        title="Zoom in"
      >
        <Plus className="size-3.5" />
      </button>

      <div className="border-y border-[var(--border)] py-0.5 text-center font-mono text-[10.5px] text-[var(--text-subtle)]">
        {state.zoom}%
      </div>

      <button
        onClick={() => dispatch({ type: "SET_ZOOM", zoom: state.zoom - 10 })}
        className="grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        title="Zoom out"
      >
        <Minus className="size-3.5" />
      </button>

      <button
        onClick={() => {
          dispatch({ type: "SET_ZOOM", zoom: 100 });
          dispatch({ type: "SET_PAN", x: 0, y: 0 });
        }}
        className="grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        title="Ajustar a pantalla"
      >
        <Maximize className="size-3.5" />
      </button>
    </div>
  );
}
