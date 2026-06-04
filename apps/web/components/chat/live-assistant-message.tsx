"use client";

import { useState } from "react";
import {
  Bot,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
  Brain,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveAssistantMessage as LiveMsg } from "@/lib/chat-context";
import { StreamingCursor } from "./streaming-cursor";
import { MessageActions } from "./message-actions";

export function LiveAssistantMessageBubble({ message }: { message: LiveMsg }) {
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

  return (
    <div className="group flex flex-col gap-1.5">
      {/* Meta row */}
      <div
        className="flex items-center gap-2 font-mono text-[11px]"
        style={{ color: "var(--text-subtle)" }}
      >
        <Bot className="size-3" />
        <span style={{ color: "var(--dm-accent)" }}>
          {message.agent} agent
        </span>
        <span>&middot;</span>
        <span>SAP Service Layer</span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2.5">
        {/* Reasoning (extended thinking) */}
        {message.reasoning && (
          <ReasoningBlock reasoning={message.reasoning} streaming={isStreaming && !message.text} />
        )}

        {/* Tool calls grouped */}
        {message.toolCalls.length > 0 && (
          <ToolCallsGroup toolCalls={message.toolCalls} />
        )}

        {/* Streamed text */}
        {message.text && (
          <div
            className="text-sm leading-relaxed"
            style={{ color: "var(--foreground)" }}
          >
            <LiveMarkdown text={message.text} />
            {isStreaming && <StreamingCursor />}
          </div>
        )}

        {/* Streaming with no text yet */}
        {isStreaming && !message.text && message.toolCalls.length === 0 && (
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg-elev)",
              color: "var(--text-muted)",
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                background: "var(--dm-accent)",
                animation: "pulse 1.2s ease-in-out infinite",
              }}
            />
            Thinking...
          </div>
        )}

        {/* Error */}
        {isError && message.errorText && (
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: "var(--status-err)",
              background: "oklch(0.65 0.18 25 / 0.1)",
              color: "var(--status-err)",
            }}
          >
            <AlertCircle className="size-3.5" />
            {message.errorText}
          </div>
        )}

        {/* Sources (web search / research) */}
        {message.sources && message.sources.length > 0 && (
          <SourcesBlock sources={message.sources} />
        )}

        {/* Actions on completion */}
        {message.status === "done" && <MessageActions />}
      </div>
    </div>
  );
}

// --- Reasoning block (collapsible) ---

function ReasoningBlock({
  reasoning,
  streaming,
}: {
  reasoning: string;
  streaming: boolean;
}) {
  // Open while the model is still thinking (no answer text yet), so the user
  // sees the reasoning stream live; collapses once the answer starts.
  const [open, setOpen] = useState(streaming);

  return (
    <div
      className="overflow-hidden rounded-[10px] border text-xs"
      style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-2"
        onClick={() => setOpen((o) => !o)}
      >
        <Brain
          className={cn("size-3.5", streaming && "animate-pulse")}
          style={{ color: "var(--dm-accent)" }}
        />
        <span className="font-medium" style={{ color: "var(--foreground)" }}>
          Razonamiento
        </span>
        <span className="ml-auto" style={{ color: "var(--text-subtle)" }}>
          {streaming ? "pensando..." : "ver"}
        </span>
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-subtle)" }}
        />
      </button>

      {open && (
        <div
          className="border-t px-3 py-2.5 leading-relaxed"
          style={{
            borderColor: "var(--border)",
            background: "var(--background)",
            color: "var(--text-muted)",
            whiteSpace: "pre-wrap",
          }}
        >
          {reasoning}
          {streaming && <StreamingCursor />}
        </div>
      )}
    </div>
  );
}

// --- Sources block (web search citations) ---

function SourcesBlock({
  sources,
}: {
  sources: { url: string; title: string }[];
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-[10px] border px-3 py-2.5 text-xs"
      style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
    >
      <span
        className="font-mono text-[10.5px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-subtle)" }}
      >
        Fuentes
      </span>
      {sources.map((s, i) => (
        <a
          key={`${s.url}-${i}`}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:underline"
          style={{ color: "var(--dm-accent)" }}
        >
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">{s.title}</span>
        </a>
      ))}
    </div>
  );
}

// --- Tool calls group (collapsible) ---

function ToolCallsGroup({ toolCalls }: { toolCalls: LiveMsg["toolCalls"] }) {
  const [open, setOpen] = useState(false);
  const anyRunning = toolCalls.some((tc) => tc.status === "running");
  const count = toolCalls.length;

  return (
    <div
      className="overflow-hidden rounded-[10px] border font-mono text-xs"
      style={{ borderColor: "var(--border)", background: "var(--bg-elev)" }}
    >
      {/* Header row */}
      <button
        className="flex w-full items-center gap-2 px-3 py-2"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex size-3.5 items-center justify-center">
          {anyRunning ? (
            <Loader2 className="size-2.5 animate-spin" style={{ color: "var(--dm-accent)" }} />
          ) : (
            <Check className="size-3" style={{ color: "var(--status-ok)" }} />
          )}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
          style={{ background: "var(--dm-accent-soft)", color: "var(--dm-accent)" }}
        >
          {count === 1 ? "CALL" : `${count} CALLS`}
        </span>
        <span style={{ color: "var(--foreground)" }}>
          {count === 1 ? toolCalls[0].tool : [...new Set(toolCalls.map((tc) => tc.tool))].join(", ")}
        </span>
        <span className="ml-auto" style={{ color: "var(--text-subtle)" }}>
          {anyRunning ? "..." : "done"}
        </span>
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-subtle)" }}
        />
      </button>

      {/* Expanded: individual calls */}
      {open && (
        <div
          className="flex flex-col divide-y border-t"
          style={{ borderColor: "var(--border)" }}
        >
          {toolCalls.map((tc, i) => (
            <LiveToolCallDetail key={tc.id} toolCall={tc} index={i + 1} total={count} />
          ))}
        </div>
      )}
    </div>
  );
}

function LiveToolCallDetail({
  toolCall,
  index,
  total,
}: {
  toolCall: LiveMsg["toolCalls"][number];
  index: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderColor: "var(--border)" }}>
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((o) => !o)}
        style={{ background: "var(--background)" }}
      >
        {total > 1 && (
          <span style={{ color: "var(--text-subtle)", minWidth: 16 }}>
            {index}.
          </span>
        )}
        <span style={{ color: "var(--text-muted)" }}>{toolCall.tool}</span>
        <span className="ml-auto" style={{ color: "var(--text-subtle)" }}>
          {toolCall.status === "running" ? "..." : toolCall.result && (toolCall.result as Record<string, unknown>).isError ? "error" : "ok"}
        </span>
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          style={{ color: "var(--text-subtle)" }}
        />
      </button>

      {open && (
        <div
          className="grid grid-cols-[60px_1fr] gap-x-3.5 gap-y-1 px-3 py-2.5 border-t"
          style={{ borderColor: "var(--border)", background: "var(--background)", color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--text-subtle)" }}>input</span>
          <span style={{ color: "var(--foreground)", wordBreak: "break-word" }}>
            {JSON.stringify(toolCall.input, null, 2)}
          </span>
          {toolCall.result && (
            <>
              <span style={{ color: "var(--text-subtle)" }}>result</span>
              <span style={{ color: "var(--foreground)", wordBreak: "break-word" }}>
                {JSON.stringify(toolCall.result, null, 2).slice(0, 500)}
                {JSON.stringify(toolCall.result).length > 500 && "..."}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Tool call card ---

function LiveToolCallCard({
  toolCall,
}: {
  toolCall: LiveMsg["toolCalls"][number];
}) {
  const [open, setOpen] = useState(false);
  const isRunning = toolCall.status === "running";

  return (
    <div
      className="overflow-hidden rounded-[10px] border font-mono text-xs"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-elev)",
      }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-2"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex size-3.5 items-center justify-center">
          {isRunning ? (
            <Loader2
              className="size-2.5 animate-spin"
              style={{ color: "var(--dm-accent)" }}
            />
          ) : (
            <Check className="size-3" style={{ color: "var(--status-ok)" }} />
          )}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
          style={{
            background: "var(--dm-accent-soft)",
            color: "var(--dm-accent)",
          }}
        >
          CALL
        </span>
        <span style={{ color: "var(--foreground)" }}>{toolCall.tool}</span>
        <span className="ml-auto" style={{ color: "var(--text-subtle)" }}>
          {isRunning ? "..." : "done"}
        </span>
        <ChevronDown
          className={cn(
            "size-3 transition-transform",
            open && "rotate-180",
          )}
          style={{ color: "var(--text-subtle)" }}
        />
      </button>

      {open && (
        <div
          className="grid grid-cols-[80px_1fr] gap-x-3.5 gap-y-1 border-t px-3 py-2.5"
          style={{
            borderColor: "var(--border)",
            background: "var(--background)",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ color: "var(--text-subtle)" }}>input</span>
          <span style={{ color: "var(--foreground)", wordBreak: "break-word" }}>
            {JSON.stringify(toolCall.input, null, 2)}
          </span>
          {toolCall.result && (
            <>
              <span style={{ color: "var(--text-subtle)" }}>result</span>
              <span
                style={{ color: "var(--foreground)", wordBreak: "break-word" }}
              >
                {JSON.stringify(toolCall.result, null, 2).slice(0, 500)}
                {JSON.stringify(toolCall.result).length > 500 && "..."}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --- Simple markdown for live text ---

function LiveMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded px-1 py-0.5 font-mono text-[0.9em]"
              style={{ background: "var(--surface)" }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
