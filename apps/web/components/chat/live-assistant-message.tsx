"use client";

import { useState } from "react";
import {
  Bot,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
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
        {/* Tool calls */}
        {message.toolCalls.map((tc) => (
          <LiveToolCallCard key={tc.id} toolCall={tc} />
        ))}

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

        {/* Actions on completion */}
        {message.status === "done" && <MessageActions />}
      </div>
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
