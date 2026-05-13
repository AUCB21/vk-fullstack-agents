"use client";

import { useRef, useCallback, useEffect, useState, type KeyboardEvent } from "react";
import {
  ArrowUp,
  Paperclip,
  Mic,
  FileText,
  X,
  Package,
  ShoppingCart,
  Truck,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat, AVAILABLE_MODELS } from "@/lib/chat-context";
import { AGENTS } from "@/lib/mock-data";
import { useVoiceInput } from "@/lib/use-voice-input";

const AGENT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  box: Package,
  cart: ShoppingCart,
  truck: Truck,
  sparkles: Sparkles,
};

export function ChatInput() {
  const {
    activeAgent,
    setActiveAgent,
    input,
    setInput,
    attachments,
    addAttachment,
    removeAttachment,
    onSend,
    mode,
    setMode,
    backendAvailable,
    model,
    setModel,
  } = useChat();

  const agent = AGENTS.find((a) => a.id === activeAgent) ?? AGENTS[0];
  const AgentIcon = AGENT_ICON_MAP[agent.icon] ?? Package;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const activeModel = AVAILABLE_MODELS.find((m) => m.id === model) || AVAILABLE_MODELS[1];

  const { isListening, transcript, start, stop, supported, error: voiceError, clearError: clearVoiceError } = useVoiceInput();

  // When transcript changes, append to input
  useEffect(() => {
    if (transcript) {
      setInput(input + transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!modelOpen && !agentOpen) return;
    const close = (e: MouseEvent) => {
      if (modelOpen && modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelOpen(false);
      }
      if (agentOpen && agentRef.current && !agentRef.current.contains(e.target as Node)) {
        setAgentOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [modelOpen, agentOpen]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend],
  );

  const canSend = input.trim().length > 0;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2 px-3 pb-[18px] pt-3 sm:px-6">
      {/* Voice error toast */}
      {voiceError && (
        <div className="flex w-full items-center gap-2 rounded-lg border border-[var(--status-err)]/30 bg-[var(--status-err)]/10 px-3 py-2 text-[12px] text-[var(--status-err)]" style={{ maxWidth: 820 }}>
          <span className="flex-1">{voiceError}</span>
          <button onClick={clearVoiceError} className="shrink-0 text-[var(--status-err)] hover:opacity-70">&times;</button>
        </div>
      )}
      {/* Composer box */}
      <div
        className={cn(
          "w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-elev)]",
          "px-3 pb-2 pt-[10px]",
          "transition-[border-color,box-shadow] duration-150",
          "focus-within:border-[oklch(from_var(--dm-accent)_l_c_h_/_0.5)]",
          "focus-within:shadow-[0_0_0_3px_var(--dm-accent-ring)]",
        )}
        style={{ maxWidth: 820 }}
      >
        {/* Attachment chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1 pb-1.5 pt-1">
            {attachments.map((att, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-xs"
              >
                <FileText className="size-3 text-[var(--text-muted)]" />
                <span>{att.name}</span>
                <span className="font-mono text-[var(--text-subtle)]">{att.size}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="ml-0.5 rounded-sm p-0.5 hover:bg-[var(--surface-hover)]"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Textarea + hint */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            onInput={autoResize}
            placeholder={`Preguntale al agente ${agent.name}...`}
            rows={3}
            className="block w-full resize-none bg-transparent pr-2 text-sm text-foreground placeholder:text-[var(--text-subtle)] focus:outline-none sm:pr-[140px]"
            style={{ minHeight: 56, maxHeight: 200 }}
          />
          <span className="pointer-events-none absolute right-0 top-1 hidden font-mono text-[10px] text-[var(--text-subtle)] min-[720px]:inline">
            enter &middot; shift+enter
          </span>
        </div>

        {/* Action row: attach + mic | agent pills | send */}
        <div className="flex items-center pt-0.5">
          <div className="flex flex-1 items-center gap-1 overflow-x-auto pr-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  addAttachment(e.target.files);
                  e.target.value = "";
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-[26px] shrink-0 items-center justify-center rounded-md hover:bg-[var(--surface-hover)]"
              title="Adjuntar archivo (max 10MB)"
            >
              <Paperclip className="size-3.5 text-[var(--text-muted)]" />
            </button>
            <button
              type="button"
              onClick={supported ? (isListening ? stop : start) : undefined}
              className={cn(
                "flex size-[26px] shrink-0 items-center justify-center rounded-md",
                supported ? "hover:bg-[var(--surface-hover)]" : "opacity-50 cursor-not-allowed",
                isListening && "animate-pulse"
              )}
              title={
                !supported
                  ? "Entrada de voz no soportada en este navegador"
                  : isListening
                    ? "Detener grabacion"
                    : "Entrada de voz"
              }
            >
              <Mic
                className={cn(
                  "size-3.5",
                  isListening ? "text-[var(--status-err)]" : "text-[var(--text-muted)]"
                )}
              />
            </button>

          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Agent selector dropdown */}
            <div ref={agentRef} className="relative">
              <button
                type="button"
                onClick={() => setAgentOpen((v) => !v)}
                className="flex items-center gap-[5px] rounded-[8px] bg-transparent py-1 pl-2 pr-1.5 text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)]"
                title="Seleccionar modulo"
              >
                <AgentIcon className="size-3 text-[var(--dm-accent)]" />
                <span className="text-[var(--dm-accent)]">{agent.name}</span>
                <ChevronDown className={cn("size-3 transition-transform", agentOpen && "rotate-180")} />
              </button>

              {agentOpen && (
                <div
                  className="absolute bottom-[calc(100%+8px)] right-0 z-50 min-w-[200px] overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)] py-1"
                  style={{ boxShadow: "var(--shadow)" }}
                >
                  {AGENTS.map((a) => {
                    const Icon = AGENT_ICON_MAP[a.icon] ?? Package;
                    const isActive = a.id === activeAgent;
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          setActiveAgent(a.id);
                          setAgentOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                          isActive
                            ? "bg-[var(--dm-accent-soft)]"
                            : "hover:bg-[var(--surface)]"
                        )}
                      >
                        <Icon className={cn("size-3.5 shrink-0", isActive ? "text-[var(--dm-accent)]" : "text-[var(--text-muted)]")} />
                        <div className="flex flex-col gap-0.5">
                          <span className={cn("text-[12.5px] font-medium", isActive ? "text-[var(--dm-accent)]" : "text-[var(--foreground)]")}>
                            {a.name}
                          </span>
                          <span className="text-[11px] text-[var(--text-subtle)]">
                            {a.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="h-4 w-px shrink-0 bg-[var(--border)]" />

            {/* Model selector */}
            <div ref={modelRef} className="relative">
              <button
                type="button"
                onClick={() => setModelOpen((v) => !v)}
                className="flex items-center gap-[4px] rounded-[8px] bg-transparent py-1 pl-2 pr-1.5 font-mono text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)]"
                title="Seleccionar modelo"
              >
                {activeModel.label}
                <ChevronDown className={cn("size-3 transition-transform", modelOpen && "rotate-180")} />
              </button>

              {modelOpen && (
                <div
                  className="absolute bottom-[calc(100%+8px)] right-0 z-50 min-w-[160px] overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-elev)] py-1 sm:min-w-[180px]"
                  style={{ boxShadow: "var(--shadow)" }}
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setModel(m.id);
                        setModelOpen(false);
                      }}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors",
                        model === m.id
                          ? "bg-[var(--dm-accent-soft)]"
                          : "hover:bg-[var(--surface)]"
                      )}
                    >
                      <span className="text-[12.5px] font-medium text-[var(--foreground)]">
                        {m.label}
                      </span>
                      <span className="text-[11px] text-[var(--text-subtle)]">
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!canSend}
              onClick={onSend}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-[8px]",
                "bg-[var(--dm-accent)] text-[var(--dm-accent-fg)]",
                "transition-opacity duration-150",
                !canSend && "opacity-45",
              )}
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mode toggle + disclaimer */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setMode(mode === "live" ? "mock" : "live")}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[10.5px] text-[var(--text-subtle)] hover:border-[var(--border-strong)]"
          title={
            mode === "live"
              ? "Live mode — responses from Anthropic API"
              : "Mock mode — scripted demo responses"
          }
        >
          <span
            className="size-[5px] rounded-full"
            style={{
              background:
                mode === "live" && backendAvailable
                  ? "var(--status-ok)"
                  : "var(--text-subtle)",
              boxShadow:
                mode === "live" && backendAvailable
                  ? "0 0 6px var(--status-ok)"
                  : "none",
            }}
          />
          {mode === "live" ? "En vivo" : "Demo"}
        </button>
      </div>
    </div>
  );
}
