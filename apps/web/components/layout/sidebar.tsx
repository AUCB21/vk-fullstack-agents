"use client";

import { useState, useRef, useCallback } from "react";
import {
  Package,
  ShoppingCart,
  Truck,
  Sparkles,
  MessageSquare,
  LogOut,
  Plus,
  Search,
  ChevronDown,
  Sun,
  Moon,
  Trash2,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/lib/chat-context";
import { useAuth } from "@/lib/auth-context";
import { AGENTS } from "@/lib/mock-data";
import { timeAgo } from "@/lib/chat-storage";

function SwipeableChat({
  session,
  isActive,
  agentName,
  onLoad,
  onDelete,
}: {
  session: { id: string; title: string; agent: string; updatedAt: number };
  isActive: boolean;
  agentName: string;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    locked.current = false;
    setSwiping(false);

    longPressTimer.current = setTimeout(() => {
      setShowConfirm(true);
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // If scrolling vertically, cancel swipe
    if (!locked.current && Math.abs(dy) > Math.abs(dx)) {
      clearLongPress();
      return;
    }

    // Lock to horizontal after threshold
    if (!locked.current && Math.abs(dx) > 8) {
      locked.current = true;
      setSwiping(true);
      clearLongPress();
    }

    if (locked.current) {
      // Only allow swiping left (negative)
      setOffsetX(Math.min(0, Math.max(-80, dx)));
    }
  }, [clearLongPress]);

  const handleTouchEnd = useCallback(() => {
    clearLongPress();
    if (offsetX < -50) {
      setShowConfirm(true);
    }
    setSwiping(false);
    setOffsetX(0);
  }, [offsetX, clearLongPress]);

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1 rounded-[6px] border border-[var(--status-err)]/30 bg-[var(--status-err)]/10 px-2 py-[7px]">
        <span className="flex-1 truncate text-[12px] text-[var(--status-err)]">
          Eliminar?
        </span>
        <button
          onClick={() => {
            onDelete();
            setShowConfirm(false);
          }}
          className="rounded-[5px] bg-[var(--status-err)] px-2.5 py-1 text-[11px] font-medium text-white"
        >
          Si
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded-[5px] border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-muted)]"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[6px]">
      {/* Delete background revealed on swipe — mobile only */}
      <div className="absolute inset-y-0 right-0 flex w-[80px] items-center justify-center bg-[var(--status-err)] md:hidden">
        <Trash2 className="size-4 text-white" />
      </div>

      {/* Swipeable foreground */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "group/item relative flex w-full flex-col gap-[2px] rounded-[6px] px-[10px] py-[7px] text-left transition-colors",
          !swiping && "transition-transform duration-200",
          swiping && "transition-none",
          isActive
            ? "bg-[var(--dm-accent-soft)]"
            : "bg-[var(--bg-elev)] hover:bg-[var(--surface)]"
        )}
        style={{ transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined }}
      >
        <button
          onClick={onLoad}
          className="flex w-full flex-col gap-[2px] text-left"
        >
          <span className="truncate text-[13px] text-[var(--foreground)]">
            {session.title}
          </span>
          <span className="text-[11px] text-[var(--text-subtle)]">
            {agentName} &middot; {timeAgo(session.updatedAt)}
          </span>
        </button>
        {/* Desktop hover delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-1/2 hidden size-5 -translate-y-1/2 items-center justify-center rounded text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] group-hover/item:flex"
          title="Eliminar chat"
        >
          <span className="text-xs">&times;</span>
        </button>
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, React.ElementType> = {
  box: Package,
  cart: ShoppingCart,
  truck: Truck,
  sparkles: Sparkles,
};

export function Sidebar({ onClose, collapsed = false, onToggleCollapse }: { onClose?: () => void; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const { activeAgent, setActiveAgent, onNewChat, sessions, activeSessionId, loadSession, deleteSession, theme, setTheme } = useChat();
  const { user, logout } = useAuth();
  const [recentOpen, setRecentOpen] = useState(true);

  const displayName = user?.type === "sap" ? user.username : "Invitado";
  const displayInitial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elev)] transition-[width] duration-300 ease-in-out md:flex overflow-hidden",
        collapsed ? "w-[56px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className={cn("flex h-14 shrink-0 items-center transition-all duration-300", collapsed ? "justify-center px-0" : "gap-[10px] px-4")}>
        {!collapsed && (
          <>
            <div
              className="flex h-7 w-7 items-center justify-center rounded-[7px] shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, var(--dm-accent), oklch(0.45 0.12 var(--accent-h)))",
              }}
            >
              <span className="text-[13px] font-semibold leading-none text-white">
                VK
              </span>
            </div>
            <span className="text-[14px] font-semibold text-[var(--foreground)] truncate">
              VK Agents
            </span>
          </>
        )}
        <button
          onClick={onToggleCollapse}
          className={cn("shrink-0 text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-all duration-300", collapsed ? "p-2" : "ml-auto")}
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          <ChevronDown className={cn("size-4 transition-transform duration-300", collapsed ? "-rotate-90" : "rotate-90")} />
        </button>
      </div>

      {/* New Chat button */}
      <div className={cn("pt-2 pb-1 transition-all duration-300", collapsed ? "px-2" : "px-3")}>
        <button
          onClick={onNewChat}
          className={cn("flex items-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface)]", collapsed ? "size-10 justify-center w-full" : "w-full gap-2 px-3 py-[7px] text-[13px]")}
          title="Nuevo chat (Ctrl+K)"
        >
          <Plus className={cn("shrink-0", collapsed ? "size-4" : "size-[14px]")} />
          {!collapsed && (
            <>
              <span>Nuevo chat</span>
              <kbd className="ml-auto rounded-[4px] border border-[var(--border)] bg-[var(--surface)] px-[6px] py-[1px] font-mono text-[10.5px] text-[var(--text-subtle)]">
                Ctrl+K
              </kbd>
            </>
          )}
        </button>
        <a
          href="/builder"
          className={cn("flex items-center rounded-[var(--radius)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] mt-1", collapsed ? "size-10 justify-center w-full" : "w-full gap-2 px-3 py-[7px] text-[13px]")}
          title="Agent Builder"
        >
          <Workflow className={cn("shrink-0", collapsed ? "size-4" : "size-[14px]")} />
          {!collapsed && <span>Agent Builder</span>}
        </a>
      </div>

      {/* Agents section */}
      <div className={cn("pt-3 pb-1 transition-all duration-300", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <div className="mb-[6px] flex items-center justify-between px-[10px]">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--text-subtle)]">
              Agentes
            </span>
            <button className="text-[var(--text-subtle)] transition-colors hover:text-[var(--text-muted)]">
              <Search className="size-[13px]" />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-[2px]">
          {AGENTS.map((agent) => {
            const Icon = ICON_MAP[agent.icon] || Package;
            const isActive = activeAgent === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => {
                  setActiveAgent(agent.id);
                  onClose?.();
                }}
                className={cn(
                  "relative flex items-center transition-colors",
                  collapsed ? "size-10 justify-center rounded-[8px] w-full" : "w-full gap-[10px] rounded-[6px] px-[10px] py-[7px] text-[13px]",
                  isActive
                    ? "bg-[var(--dm-accent-soft)] text-[var(--dm-accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface)]",
                  !collapsed && isActive && "text-[var(--foreground)]"
                )}
                title={collapsed ? agent.name : undefined}
              >
                {!collapsed && isActive && (
                  <span className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full bg-[var(--dm-accent)]" />
                )}
                <Icon
                  className={cn(
                    "shrink-0",
                    collapsed ? "size-[18px]" : "size-[15px]",
                    isActive && !collapsed ? "text-[var(--dm-accent)]" : ""
                  )}
                />
                {!collapsed && <span className="truncate">{agent.name}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer when collapsed, or Recent Section when expanded */}
      {collapsed ? (
        <div className="flex-1" />
      ) : (
        <div className="mt-2 flex min-h-0 flex-1 flex-col px-3">
          <button
            onClick={() => setRecentOpen((v) => !v)}
            className="mb-1 flex items-center justify-between px-[10px] py-[4px]"
          >
            <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--text-subtle)]">
              Recientes
            </span>
            <ChevronDown
              className={cn(
                "size-[13px] text-[var(--text-subtle)] transition-transform",
                !recentOpen && "-rotate-90"
              )}
            />
          </button>

          {recentOpen && (
            <ScrollArea className="flex-1">
              {sessions.length > 0 ? (
                <div className="flex flex-col gap-[2px]">
                  {sessions.map((session) => {
                    const chatAgent = AGENTS.find((a) => a.id === session.agent);
                    return (
                      <SwipeableChat
                        key={session.id}
                        session={session}
                        isActive={activeSessionId === session.id}
                        agentName={chatAgent?.name || session.agent}
                        onLoad={() => {
                          loadSession(session.id);
                          onClose?.();
                        }}
                        onDelete={() => deleteSession(session.id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <MessageSquare className="mb-2 size-4 text-[var(--text-subtle)]" />
                  <p className="text-[11px] text-[var(--text-subtle)]">
                    Sin conversaciones aun
                  </p>
                </div>
              )}
            </ScrollArea>
          )}

          {!recentOpen && (
            <div className="flex flex-1 flex-col items-center justify-center py-8">
              <MessageSquare className="mb-2 size-4 text-[var(--text-subtle)]" />
              <p className="text-[11px] text-[var(--text-subtle)]">
                Minimizado
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={cn("flex border-t border-[var(--border)] transition-all duration-300", collapsed ? "flex-col items-center gap-3 py-3 px-0" : "items-center gap-[10px] px-3 py-[10px]")}>
        <div
          className={cn("flex shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white", collapsed ? "size-7" : "h-7 w-7")}
          style={{
            background: user?.type === "sap"
              ? "linear-gradient(135deg, oklch(0.55 0.18 310), oklch(0.45 0.16 280))"
              : "linear-gradient(135deg, oklch(0.55 0.025 240), oklch(0.4 0.02 240))",
          }}
        >
          {displayInitial}
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
              {displayName}
            </span>
            <span className="text-[10.5px] text-[var(--text-subtle)]">
              {user?.type === "sap" ? "SAP user" : "Modo demo"}
            </span>
          </div>
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn("transition-colors hover:text-[var(--text-muted)] text-[var(--text-subtle)]", collapsed ? "" : "ml-auto")}
          title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        >
          {theme === "dark" ? <Sun className={cn("transition-all duration-300", collapsed ? "size-4" : "size-[15px]")} /> : <Moon className={cn("transition-all duration-300", collapsed ? "size-4" : "size-[15px]")} />}
        </button>
        {!collapsed && (
          <button
            onClick={logout}
            className="text-[var(--text-subtle)] transition-colors hover:text-[var(--text-muted)]"
            title="Cerrar sesion"
          >
            <LogOut className="size-[15px]" />
          </button>
        )}
      </div>
    </aside>
  );
}
