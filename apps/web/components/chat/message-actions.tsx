import { Copy, RefreshCw, Share2, ThumbsUp, ThumbsDown } from "lucide-react";

const actions = [
  { icon: Copy, label: "Copy" },
  { icon: RefreshCw, label: "Retry" },
  { icon: Share2, label: "Share" },
  { icon: ThumbsUp, label: "Good" },
  { icon: ThumbsDown, label: "Bad" },
];

export function MessageActions() {
  return (
    <div className="flex gap-0.5 pt-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      {actions.map(({ icon: Icon, label }) => (
        <button
          key={label}
          aria-label={label}
          className="grid size-[26px] place-items-center rounded-[5px] border-0 bg-transparent text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        >
          <Icon className="size-[13px]" />
        </button>
      ))}
    </div>
  );
}
