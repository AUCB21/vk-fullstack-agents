import { cn } from "@/lib/utils";

interface ToolCallProps {
  verb: string;
  path: string;
  ms: string;
  params: string;
  result: string;
  status: string;
}

export function ToolCall({ verb, path, ms, params, result, status }: ToolCallProps) {
  const isDone = status === "done";

  return (
    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 font-mono text-xs">
      <div className="flex items-center gap-2">
        {!isDone ? (
          <span
            className="size-3 rounded-full border-2 border-[var(--dm-accent)] border-t-transparent"
            style={{ animation: "spin 0.6s linear infinite" }}
          />
        ) : (
          <span className="size-1.5 rounded-full bg-[var(--status-ok)]" />
        )}
        <span className="font-semibold text-[var(--dm-accent)]">{verb}</span>
        <span className="truncate text-[var(--text-muted)]">{path}</span>
        {isDone && (
          <span className="ml-auto shrink-0 text-[var(--text-subtle)]">{ms}</span>
        )}
      </div>
      {isDone && (
        <div className={cn("mt-1.5 text-[var(--text-subtle)]")}>
          <span>{result}</span>
        </div>
      )}
    </div>
  );
}
