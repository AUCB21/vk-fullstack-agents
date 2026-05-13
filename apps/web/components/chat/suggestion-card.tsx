"use client";

import { Table2, TrendingUp, Pencil, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  table: Table2,
  chart: TrendingUp,
  pencil: Pencil,
  search: Search,
};

interface SuggestionCardProps {
  label: string;
  query: string;
  icon: string;
  onClick: () => void;
}

export function SuggestionCard({ label, query, icon, onClick }: SuggestionCardProps) {
  const Icon = ICON_MAP[icon] ?? Search;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--border)]",
        "bg-[var(--bg-elev)] p-[12px_14px] text-left",
        "transition-[border-color,transform,background] duration-150",
        "hover:border-[var(--border-strong)] hover:bg-[var(--surface)] hover:-translate-y-px",
      )}
    >
      <span className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-[var(--dm-accent)]" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--text-subtle)]">
          {label}
        </span>
      </span>
      <span className="text-[13.5px] text-foreground">{query}</span>
    </button>
  );
}
