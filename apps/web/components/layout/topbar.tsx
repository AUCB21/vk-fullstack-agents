"use client";

import {
  Package,
  ShoppingCart,
  Truck,
  Sparkles,
  Search,
  MoreHorizontal,
  Menu,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat, AVAILABLE_MODELS } from "@/lib/chat-context";
import { AGENTS } from "@/lib/mock-data";

const ICON_MAP: Record<string, React.ElementType> = {
  box: Package,
  cart: ShoppingCart,
  truck: Truck,
  sparkles: Sparkles,
};

export function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { activeAgent, model, setModel, backendAvailable } = useChat();
  const [modelOpen, setModelOpen] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);

  const agent = AGENTS.find((a) => a.id === activeAgent);
  const AgentIcon = agent ? ICON_MAP[agent.icon] || Package : Package;
  const activeModel = AVAILABLE_MODELS.find((m) => m.id === model) || AVAILABLE_MODELS[1];

  // Close dropdown on outside click
  useEffect(() => {
    if (!modelOpen) return;
    const close = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [modelOpen]);

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4">
      {/* Hamburger menu — mobile only */}
      <button
        onClick={onToggleSidebar}
        className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)] md:hidden"
      >
        <Menu className="size-[15px]" />
      </button>

      {/* Left side — agent pill */}
      <div className="flex min-w-0 items-center gap-[8px]">
        {/* Agent pill */}
        <div className="flex min-w-0 items-center gap-[8px] rounded-full border border-[var(--border)] bg-[var(--surface)] py-[5px] pl-[8px] pr-[10px]">
          <AgentIcon className="size-[14px] shrink-0 text-[var(--dm-accent)]" />
          <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
            {agent?.name || "Agent"}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-[8px]">
        {/* SL connection indicator */}
        <div className="flex items-center gap-[6px] rounded-full border border-[var(--border)] bg-[var(--surface)] px-[8px] py-[5px] sm:px-[10px]">
          <span
            className={cn(
              "inline-block h-[6px] w-[6px] shrink-0 rounded-full",
              backendAvailable ? "bg-[var(--status-ok)]" : "bg-[var(--text-subtle)]"
            )}
            style={backendAvailable ? { boxShadow: "0 0 6px var(--status-ok)" } : undefined}
          />
          <span className="hidden font-mono text-[11.5px] text-[var(--text-muted)] sm:inline">
            SL &middot; {backendAvailable ? "conectado" : "desconectado"}
          </span>
        </div>

        {/* Search button — hidden on mobile */}
        <button
          className="hidden h-[32px] w-[32px] items-center justify-center rounded-[6px] border border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed sm:flex"
          title="Proximamente"
        >
          <Search className="size-[15px]" />
        </button>

        {/* More button — hidden on mobile */}
        <button
          className="hidden h-[32px] w-[32px] items-center justify-center rounded-[6px] border border-[var(--border)] text-[var(--text-muted)] opacity-50 cursor-not-allowed sm:flex"
          title="Proximamente"
        >
          <MoreHorizontal className="size-[15px]" />
        </button>
      </div>
    </header>
  );
}
