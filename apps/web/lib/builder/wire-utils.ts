import type { BuilderNode, Wire } from "./builder-types";

const NODE_W = 240;
const NODE_CENTER_Y_OFFSET = 60;

export function getNodeCenter(node: BuilderNode) {
  return {
    outX: node.x + NODE_W,
    outY: node.y + NODE_CENTER_Y_OFFSET,
    inX: node.x,
    inY: node.y + NODE_CENTER_Y_OFFSET,
  };
}

export function buildBezierPath(ax: number, ay: number, bx: number, by: number): string {
  const dx = Math.max(40, (bx - ax) * 0.5);
  return `M ${ax} ${ay} C ${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`;
}

export function wirePath(
  nodes: BuilderNode[],
  wire: Wire,
): string | null {
  const a = nodes.find((n) => n.id === wire.from);
  const b = nodes.find((n) => n.id === wire.to);
  if (!a || !b) return null;
  const ac = getNodeCenter(a);
  const bc = getNodeCenter(b);
  return buildBezierPath(ac.outX, ac.outY, bc.inX, bc.inY);
}

/** Check if a point (px, py) is near a Bezier wire (for click-to-select). */
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

  const ac = getNodeCenter(a);
  const bc = getNodeCenter(b);

  const x0 = ac.outX, y0 = ac.outY;
  const x3 = bc.inX, y3 = bc.inY;
  const dx = Math.max(40, (x3 - x0) * 0.5);
  const x1 = x0 + dx, y1 = y0;
  const x2 = x3 - dx, y2 = y3;

  // Sample 20 points along the curve
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const mt = 1 - t;
    const sx = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    const sy = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
    const dist = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
    if (dist < threshold) return true;
  }
  return false;
}

export function generateWireId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
