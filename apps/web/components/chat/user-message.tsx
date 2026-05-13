"use client";

import { FileText } from "lucide-react";
import type { UserMessage } from "@/lib/chat-context";

export function UserMessageBubble({ message }: { message: UserMessage }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex gap-1.5">
          {message.attachments.map((att, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1 text-xs"
            >
              <FileText className="size-3 text-[var(--text-muted)]" />
              <span>{att.name}</span>
              <span className="font-mono text-[var(--text-subtle)]">
                {att.size}
              </span>
            </span>
          ))}
        </div>
      )}
      <div className="max-w-[85%] whitespace-pre-wrap rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm">
        {message.content}
      </div>
    </div>
  );
}
