"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { BuilderNode as BuilderNodeType, PortSide } from "@/lib/builder/builder-types";
import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { NodeIcon } from "./node-icon";
import { Port } from "./port";
import { useBuilder } from "@/lib/builder/builder-context";

export const BuilderNode = memo(function BuilderNode({
  node,
  style,
  dragListeners,
  dragAttributes,
  isDragging,
}: {
  node: BuilderNodeType;
  style?: React.CSSProperties;
  dragListeners?: DraggableSyntheticListeners;
  dragAttributes?: React.HTMLAttributes<HTMLElement>;
  isDragging?: boolean;
}) {
  const { state, selectNode, toggleSelectNode } = useBuilder();
  const isSelected = state.selectedNodeId === node.id || state.selectedNodeIds.has(node.id);
  const isRunTarget = state.testRun?.status === "running" && state.testRun.currentNodeId === node.id;

  return (
    <div
      data-kind={node.kind}
      data-id={node.id}
      className={cn(
        "relative w-[240px] rounded-[10px] border bg-[var(--bg-elev)] cursor-grab transition-[border-color,box-shadow] duration-150",
        isSelected
          ? "border-[oklch(from_var(--dm-accent)_l_c_h_/_0.7)] shadow-[0_0_0_3px_var(--dm-accent-ring),var(--shadow)]"
          : "border-[var(--border)] shadow-[var(--shadow)] hover:border-[var(--border-strong)]",
        isRunTarget && "border-[var(--dm-accent)] shadow-[0_0_12px_oklch(from_var(--dm-accent)_l_c_h_/_0.3)]",
        isDragging && "opacity-50 cursor-grabbing",
      )}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey) {
          toggleSelectNode(node.id);
        } else {
          selectNode(node.id);
        }
      }}
      {...dragListeners}
      {...dragAttributes}
    >
      {/* 4-side ports */}
      {(["top", "right", "bottom", "left"] as PortSide[]).map((side) => (
        <Port key={side} nodeId={node.id} side={side} />
      ))}

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-[11px] py-[9px] text-[12.5px] font-medium text-[var(--foreground)]">
        <div className="node-icon-wrap grid size-[22px] shrink-0 place-items-center rounded-[5px]">
          <NodeIcon name={node.icon} className="size-3" />
        </div>
        <span className="truncate">{node.name}</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.05em] text-[var(--text-subtle)]">
          {node.meta}
        </span>
      </div>

      {/* Body rows */}
      <div className="flex flex-col gap-1.5 px-[11px] py-2 text-[12px]">
        {node.rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-[var(--text-muted)]">
            <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.04em] text-[var(--text-subtle)]">
              {r.key}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[12px] text-[var(--foreground)]",
                r.mono && "font-mono text-[11px]",
              )}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 border-t border-[var(--border)] px-[11px] py-1.5 font-mono text-[11px] text-[var(--text-subtle)]">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            node.status === "ok" && "bg-[var(--status-ok)] shadow-[0_0_6px_var(--status-ok)]",
            node.status === "warn" && "bg-[var(--status-warn)]",
            node.status === "idle" && "bg-[var(--text-subtle)]",
          )}
        />
        <span>
          {node.status === "ok"
            ? "Last run: 0.4s"
            : node.status === "warn"
              ? "Last run: timed out"
              : "Not yet run"}
        </span>
      </div>
    </div>
  );
});
