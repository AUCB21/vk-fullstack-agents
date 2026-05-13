"use client";

import { BuilderSidebar } from "./builder-sidebar";
import { CanvasTopbar } from "./canvas-topbar";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";

export function BuilderLayout() {
  return (
    <div className="grid h-screen w-screen grid-cols-[264px_1fr_320px] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <BuilderSidebar />

      <div className="flex min-h-0 min-w-0 flex-col">
        <CanvasTopbar />
        <Canvas />
      </div>

      <Inspector />
    </div>
  );
}
