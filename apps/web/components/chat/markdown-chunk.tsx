"use client";

import type { TextChunk } from "@/lib/mock-flows";
import type { ReactNode } from "react";

function parseInline(text: string): ReactNode[] {
  // Split on **bold** and `code` patterns
  const parts: ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // bold
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      // code
      parts.push(
        <code
          key={match.index}
          className="rounded-[4px] bg-[var(--surface)] px-[5px] py-[1px] font-mono"
          style={{ fontSize: "0.9em" }}
        >
          {match[3]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function MarkdownChunk({
  parts,
  onCite,
}: {
  parts: TextChunk[];
  onCite?: (code: string, kind: string, event: React.MouseEvent) => void;
}) {
  return (
    <span className="text-sm leading-relaxed">
      {parts.map((chunk, i) => {
        if (typeof chunk === "string") {
          return <span key={i}>{parseInline(chunk)}</span>;
        }
        return (
          <span
            key={i}
            className="cursor-pointer font-mono text-[var(--dm-accent)] transition-colors hover:bg-[var(--dm-accent-soft)]"
            style={{
              fontSize: "0.92em",
              borderBottom: "1px dashed var(--dm-accent-ring)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onCite?.(chunk.cite, chunk.kind, e);
            }}
          >
            {chunk.cite}
          </span>
        );
      })}
    </span>
  );
}
