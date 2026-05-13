"use client";

import { Bot } from "lucide-react";
import { useChat, type AssistantMessage } from "@/lib/chat-context";
import { useStreaming } from "@/lib/use-streaming";
import { ThinkingIndicator } from "./thinking-indicator";
import { ToolCall } from "./tool-call";
import { MarkdownChunk } from "./markdown-chunk";
import { StreamingCursor } from "./streaming-cursor";
import { MessageActions } from "./message-actions";
import { DataTable } from "./data-table";
import { KpiStrip } from "./kpi-strip";
import { Sparkline } from "./sparkline";
import { DraftPo } from "./draft-po";

export function AssistantMessageBubble({ message }: { message: AssistantMessage }) {
  const { setBusy, setCitation } = useChat();

  const { progress, streamText, toolStatuses, completed } = useStreaming(
    message.steps,
    () => setBusy(false),
  );

  const handleCite = (code: string, kind: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setCitation({
      code,
      kind: kind as "item" | "vendor",
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    });
  };

  return (
    <div className="group flex flex-col gap-1.5">
      {/* Meta row */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-subtle)]">
        <Bot className="size-3" />
        <span className="text-[var(--dm-accent)]">{message.agent}</span>
        <span>·</span>
        <span>SAP Service Layer</span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2.5">
        {message.steps.slice(0, progress).map((step, i) => {
          if (step.type === "thinking") {
            // Show indicator only if it's the last visible step and streaming isn't done
            const isLastVisible = i === progress - 1;
            if (isLastVisible && !completed) {
              return <ThinkingIndicator key={i} text={step.text} />;
            }
            return null;
          }

          if (step.type === "tool") {
            return (
              <ToolCall
                key={i}
                verb={step.verb}
                path={step.path}
                ms={step.ms}
                params={step.params}
                result={step.result}
                status={toolStatuses[i] || "running"}
              />
            );
          }

          if (step.type === "stream") {
            const revealed = streamText[i] || [];
            if (revealed.length === 0) return null;
            const isStillStreaming =
              i === progress - 1 &&
              !completed &&
              revealed.length < step.chunks.length;
            return (
              <span key={i}>
                <MarkdownChunk parts={revealed} onCite={handleCite} />
                {isStillStreaming && <StreamingCursor />}
              </span>
            );
          }

          if (step.type === "table") {
            return <DataTable key={i} onCite={handleCite} />;
          }
          if (step.type === "kpis") {
            return <KpiStrip key={i} />;
          }
          if (step.type === "chart") {
            return <Sparkline key={i} />;
          }
          if (step.type === "draft-po") {
            return <DraftPo key={i} onCite={handleCite} />;
          }

          return null;
        })}

        {completed && <MessageActions />}
      </div>
    </div>
  );
}
