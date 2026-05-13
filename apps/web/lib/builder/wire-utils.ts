import type { BuilderNode, PortSide, Wire } from "./builder-types";

/* ── Node geometry constants ── */

export const NODE_W = 240;

const NODE_BASE_H = 83;
const ROW_H = 24.6;
const MIN_CP_DIST = 50;

/** Estimate the rendered height of a node from its row count. */
function estimateNodeHeight(node: BuilderNode): number {
  return NODE_BASE_H + ROW_H * (node.rows.length || 1);
}

/* ── Port positions ── */

/** Port center position for any of the 4 sides. */
export function getPortPosition(
  node: BuilderNode,
  side: PortSide,
): { x: number; y: number } {
  const h = estimateNodeHeight(node);
  const halfH = h / 2;
  const halfW = NODE_W / 2;

  switch (side) {
    case "top":    return { x: node.x + halfW,    y: node.y };
    case "right":  return { x: node.x + NODE_W,   y: node.y + halfH };
    case "bottom": return { x: node.x + halfW,    y: node.y + h };
    case "left":   return { x: node.x,            y: node.y + halfH };
  }
}

/** @deprecated Use getPortPosition(node, side) instead. */
export function getNodeCenter(node: BuilderNode) {
  const right = getPortPosition(node, "right");
  const left = getPortPosition(node, "left");
  return { outX: right.x, outY: right.y, inX: left.x, inY: left.y };
}

/** Resolve optional fromSide/toSide with backward-compat defaults. */
export function resolveWireSides(wire: Wire): { fromSide: PortSide; toSide: PortSide } {
  return {
    fromSide: wire.fromSide ?? "right",
    toSide: wire.toSide ?? "left",
  };
}

/* ── Directional bezier paths ── */

/** Unit outward vector for each port side. */
const SIDE_DIR: Record<PortSide, { dx: number; dy: number }> = {
  top:    { dx:  0, dy: -1 },
  right:  { dx:  1, dy:  0 },
  bottom: { dx:  0, dy:  1 },
  left:   { dx: -1, dy:  0 },
};

/** Perpendicular axis for fan spread (perpendicular to port face). */
const PERP: Record<PortSide, { dx: number; dy: number }> = {
  top:    { dx: 1, dy: 0 },
  right:  { dx: 0, dy: 1 },
  bottom: { dx: 1, dy: 0 },
  left:   { dx: 0, dy: 1 },
};

/**
 * Build a cubic bezier SVG path between two ports, with control points
 * extending outward from each port's face direction.
 * Works for all 16 side combinations.
 */
export function buildBezierPathDirectional(
  ax: number, ay: number, fromSide: PortSide,
  bx: number, by: number, toSide: PortSide,
  srcFanOff = 0,
  dstFanOff = 0,
): string {
  const dist = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  const cpDist = Math.max(MIN_CP_DIST, dist * 0.4);

  const sd = SIDE_DIR[fromSide];
  const dd = SIDE_DIR[toSide];
  const sp = PERP[fromSide];
  const dp = PERP[toSide];

  const c1x = ax + sd.dx * cpDist + sp.dx * srcFanOff;
  const c1y = ay + sd.dy * cpDist + sp.dy * srcFanOff;
  const c2x = bx + dd.dx * cpDist + dp.dx * dstFanOff;
  const c2y = by + dd.dy * cpDist + dp.dy * dstFanOff;

  return `M ${ax} ${ay} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${bx} ${by}`;
}

/**
 * Infer a reasonable target side for the live wire preview.
 * Picks the side facing toward the source so the curve looks natural.
 */
export function inferTargetSide(
  fromX: number, fromY: number,
  toX: number, toY: number,
): PortSide {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? "left" : "right";
  }
  return dy > 0 ? "top" : "bottom";
}

/* ── Wire path computation ── */

export type DragOffset = { nodeId: string; dx: number; dy: number } | null;

const FAN_CP_SPREAD = 35;

export type WirePathOpts = {
  dragOffset?: DragOffset;
  fanIn?: { index: number; total: number };
  fanOut?: { index: number; total: number };
};

export function wirePath(
  nodes: BuilderNode[],
  wire: Wire,
  opts?: WirePathOpts,
): string | null {
  const a = nodes.find((n) => n.id === wire.from);
  const b = nodes.find((n) => n.id === wire.to);
  if (!a || !b) return null;

  const { fromSide, toSide } = resolveWireSides(wire);
  const ap = getPortPosition(a, fromSide);
  const bp = getPortPosition(b, toSide);

  // Fan-out: offset control points perpendicular to port face
  let srcFanOff = 0;
  let dstFanOff = 0;
  if (opts?.fanOut && opts.fanOut.total > 1) {
    const { index, total } = opts.fanOut;
    srcFanOff = (index - (total - 1) / 2) * FAN_CP_SPREAD;
  }
  if (opts?.fanIn && opts.fanIn.total > 1) {
    const { index, total } = opts.fanIn;
    dstFanOff = (index - (total - 1) / 2) * FAN_CP_SPREAD;
  }

  // Drag offset
  if (opts?.dragOffset) {
    if (wire.from === opts.dragOffset.nodeId) {
      ap.x += opts.dragOffset.dx;
      ap.y += opts.dragOffset.dy;
    }
    if (wire.to === opts.dragOffset.nodeId) {
      bp.x += opts.dragOffset.dx;
      bp.y += opts.dragOffset.dy;
    }
  }

  return buildBezierPathDirectional(ap.x, ap.y, fromSide, bp.x, bp.y, toSide, srcFanOff, dstFanOff);
}

/* ── Hit testing ── */

/** Check if a point (px, py) is near a wire (for click-to-select). */
export function isPointNearWire(
  nodes: BuilderNode[],
  wire: Wire,
  px: number,
  py: number,
  threshold = 8,
): boolean {
  const a = nodes.find((n) => n.id === wire.from);
  const b = nodes.find((n) => n.id === wire.to);
  if (!a || !b) return false;

  const { fromSide, toSide } = resolveWireSides(wire);
  const ap = getPortPosition(a, fromSide);
  const bp = getPortPosition(b, toSide);

  const dist = Math.sqrt((bp.x - ap.x) ** 2 + (bp.y - ap.y) ** 2);
  const cpDist = Math.max(MIN_CP_DIST, dist * 0.4);

  const sd = SIDE_DIR[fromSide];
  const dd = SIDE_DIR[toSide];

  const x0 = ap.x, y0 = ap.y;
  const x1 = ap.x + sd.dx * cpDist, y1 = ap.y + sd.dy * cpDist;
  const x2 = bp.x + dd.dx * cpDist, y2 = bp.y + dd.dy * cpDist;
  const x3 = bp.x, y3 = bp.y;

  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const mt = 1 - t;
    const sx = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    const sy = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
    if (Math.sqrt((px - sx) ** 2 + (py - sy) ** 2) < threshold) return true;
  }
  return false;
}

export function generateWireId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
