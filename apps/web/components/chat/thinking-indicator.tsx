export function ThinkingIndicator({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-xs text-[var(--text-muted)]">
      <span
        className="size-1.5 rounded-full bg-[var(--dm-accent)]"
        style={{ animation: "pulse 1.2s ease-in-out infinite" }}
      />
      <span>{text}</span>
    </span>
  );
}
