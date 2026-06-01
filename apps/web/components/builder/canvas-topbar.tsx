"use client";

import { Layers, Share2, Sparkles, ArrowUp, Sun, Moon, Check } from "lucide-react";
import { useBuilder } from "@/lib/builder/builder-context";
import { cn } from "@/lib/utils";
import { memo, useState, useEffect } from "react";
import { NodeIcon } from "./node-icon";

function CanvasTopbarInner() {
  const { agentName, agentIcon, agentVersion, agentStatus, startTestRun, publish, state } = useBuilder();
  const [theme, setThemeLocal] = useState<"dark" | "light">("dark");
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vk-theme") as "dark" | "light" | null;
    if (saved) setThemeLocal(saved);
  }, []);

  const handlePublish = () => {
    publish();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const isRunning = state.testRun?.status === "running";

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setThemeLocal(next);
    localStorage.setItem("vk-theme", next);
    const el = document.documentElement;
    el.classList.add("theme-transitioning");
    el.classList.remove("theme-light");
    if (next === "light") el.classList.add("theme-light");
    setTimeout(() => el.classList.remove("theme-transitioning"), 250);
  }

  return (
    <div className="relative flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--background)] px-[18px]">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[13px]">
        <a href="/builder" className="text-[var(--text-subtle)] no-underline hover:text-[var(--text-muted)]">
          Agents
        </a>
        <span className="text-[var(--text-subtle)]">/</span>
        <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[13px] font-medium text-[var(--foreground)]">
          <NodeIcon name={agentIcon} className="size-3 text-[var(--dm-accent)]" />
          {agentName}
          <span className="ml-0.5 border-l border-[var(--border)] pl-1.5 font-mono text-[10px] text-[var(--text-subtle)]">
            {agentVersion} · {agentStatus}
          </span>
        </span>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1.5">
        <button
          className="inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--border)] bg-transparent px-2.5 py-[5px] text-[12px] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          title="Proximamente"
        >
          <Layers className="size-3" /> Versions
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--border)] bg-transparent px-2.5 py-[5px] text-[12px] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          title="Proximamente"
        >
          <Share2 className="size-3" /> Share
        </button>

        <div className="mx-1 flex overflow-hidden rounded-[7px] border border-[var(--border)]">
          <button
            onClick={toggleTheme}
            className={cn(
              "grid size-[30px] place-items-center transition-colors",
              theme === "light" ? "bg-[var(--surface)] text-[var(--foreground)]" : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]",
            )}
          >
            <Sun className="size-3.5" />
          </button>
          <button
            onClick={toggleTheme}
            className={cn(
              "grid size-[30px] place-items-center transition-colors",
              theme === "dark" ? "bg-[var(--surface)] text-[var(--foreground)]" : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]",
            )}
          >
            <Moon className="size-3.5" />
          </button>
        </div>

        <button
          onClick={startTestRun}
          disabled={isRunning}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--border)] bg-transparent px-2.5 py-[5px] text-[12px] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
            isRunning && "opacity-50 cursor-not-allowed",
          )}
        >
          <Sparkles className="size-3" /> {isRunning ? "Ejecutando..." : "Test run"}
        </button>
        <button
          onClick={handlePublish}
          className="inline-flex items-center gap-1.5 rounded-[7px] bg-[var(--dm-accent)] px-[11px] py-[6px] text-[12.5px] font-medium text-[var(--dm-accent-fg)] transition-[filter,transform] duration-150 hover:brightness-105 hover:-translate-y-px"
        >
          <ArrowUp className="size-3" /> Publish
        </button>
      </div>

      {/* Publish toast */}
      {showToast && (
        <div className="absolute right-4 top-14 z-20 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elev)] px-3.5 py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="size-3.5 text-[var(--status-ok)]" />
          <span className="text-[12.5px] text-[var(--foreground)]">Agente publicado</span>
        </div>
      )}
    </div>
  );
}

export const CanvasTopbar = memo(CanvasTopbarInner);
