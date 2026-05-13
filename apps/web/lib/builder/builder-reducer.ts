import type { BuilderNode, PortSide, Wire, NodeRow } from "./builder-types";
import { KIND_LABELS } from "./builder-types";
import type { NodeTemplate } from "./builder-types";
import { generateWireId } from "./wire-utils";

export type WiringSource = { nodeId: string; side: PortSide } | null;

export type BuilderState = {
  nodes: BuilderNode[];
  wires: Wire[];
  selectedNodeId: string | null;
  selectedWireId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  past: Array<{ nodes: BuilderNode[]; wires: Wire[] }>;
  future: Array<{ nodes: BuilderNode[]; wires: Wire[] }>;
  wiringFrom: WiringSource;
  dirty: boolean;
};

export type BuilderAction =
  | { type: "LOAD"; nodes: BuilderNode[]; wires: Wire[] }
  | { type: "ADD_NODE"; template: NodeTemplate; x: number; y: number }
  | { type: "MOVE_NODE"; id: string; dx: number; dy: number }
  | { type: "SELECT_NODE"; id: string | null }
  | { type: "SELECT_WIRE"; id: string | null }
  | { type: "DELETE_SELECTED" }
  | { type: "DUPLICATE_NODE"; id: string }
  | { type: "UPDATE_NODE_CONFIG"; id: string; config: Record<string, unknown> }
  | { type: "UPDATE_NODE_ROWS"; id: string; rows: NodeRow[] }
  | { type: "ADD_WIRE"; from: string; to: string; fromSide?: PortSide; toSide?: PortSide; flow?: boolean }
  | { type: "DELETE_WIRE"; id: string }
  | { type: "START_WIRING"; fromNodeId: string; fromSide: PortSide }
  | { type: "CANCEL_WIRING" }
  | { type: "COMPLETE_WIRING"; toNodeId: string; toSide: PortSide }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; x: number; y: number }
  | { type: "SELECT_ALL" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "MARK_CLEAN" };

const MAX_HISTORY = 50;

function generateNodeId(): string {
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function snapshot(state: BuilderState) {
  return { nodes: state.nodes, wires: state.wires };
}

function pushHistory(state: BuilderState): BuilderState {
  const past = [...state.past, snapshot(state)].slice(-MAX_HISTORY);
  return { ...state, past, future: [], dirty: true };
}

export const initialBuilderState: BuilderState = {
  nodes: [],
  wires: [],
  selectedNodeId: null,
  selectedWireId: null,
  zoom: 100,
  panX: 0,
  panY: 0,
  past: [],
  future: [],
  wiringFrom: null,
  dirty: false,
};

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "LOAD":
      return {
        ...state,
        nodes: action.nodes,
        wires: action.wires,
        selectedNodeId: null,
        selectedWireId: null,
        past: [],
        future: [],
        dirty: false,
      };

    case "ADD_NODE": {
      const s = pushHistory(state);
      const node: BuilderNode = {
        id: generateNodeId(),
        kind: action.template.kind,
        icon: action.template.icon,
        name: action.template.name,
        meta: KIND_LABELS[action.template.kind],
        x: action.x,
        y: action.y,
        rows: action.template.defaultRows.map((r) => ({ ...r })),
        status: "idle",
        config: action.template.defaultConfig ? { ...action.template.defaultConfig } : undefined,
      };
      return { ...s, nodes: [...s.nodes, node], selectedNodeId: node.id, selectedWireId: null };
    }

    case "MOVE_NODE": {
      const s = pushHistory(state);
      return {
        ...s,
        nodes: s.nodes.map((n) =>
          n.id === action.id ? { ...n, x: n.x + action.dx, y: n.y + action.dy } : n,
        ),
      };
    }

    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.id, selectedWireId: action.id ? null : state.selectedWireId };

    case "SELECT_WIRE":
      return { ...state, selectedWireId: action.id, selectedNodeId: action.id ? null : state.selectedNodeId };

    case "SELECT_ALL":
      return { ...state, selectedNodeId: null, selectedWireId: null };

    case "DELETE_SELECTED": {
      if (!state.selectedNodeId && !state.selectedWireId) return state;
      const s = pushHistory(state);
      if (s.selectedWireId) {
        return {
          ...s,
          wires: s.wires.filter((w) => w.id !== s.selectedWireId),
          selectedWireId: null,
        };
      }
      if (s.selectedNodeId) {
        return {
          ...s,
          nodes: s.nodes.filter((n) => n.id !== s.selectedNodeId),
          wires: s.wires.filter((w) => w.from !== s.selectedNodeId && w.to !== s.selectedNodeId),
          selectedNodeId: null,
        };
      }
      return s;
    }

    case "DUPLICATE_NODE": {
      const src = state.nodes.find((n) => n.id === action.id);
      if (!src) return state;
      const s = pushHistory(state);
      const dup: BuilderNode = {
        ...src,
        id: generateNodeId(),
        x: src.x + 30,
        y: src.y + 30,
        selected: false,
        rows: src.rows.map((r) => ({ ...r })),
        config: src.config ? { ...src.config } : undefined,
      };
      return { ...s, nodes: [...s.nodes, dup], selectedNodeId: dup.id };
    }

    case "UPDATE_NODE_CONFIG": {
      const s = pushHistory(state);
      return {
        ...s,
        nodes: s.nodes.map((n) =>
          n.id === action.id ? { ...n, config: { ...n.config, ...action.config } } : n,
        ),
      };
    }

    case "UPDATE_NODE_ROWS": {
      const s = pushHistory(state);
      return {
        ...s,
        nodes: s.nodes.map((n) =>
          n.id === action.id ? { ...n, rows: action.rows } : n,
        ),
      };
    }

    case "ADD_WIRE": {
      if (action.from === action.to) return state;
      // Duplicate check includes sides
      const fromSide = action.fromSide ?? "right";
      const toSide = action.toSide ?? "left";
      if (state.wires.some((w) =>
        w.from === action.from && w.to === action.to &&
        (w.fromSide ?? "right") === fromSide && (w.toSide ?? "left") === toSide
      )) return state;
      const s = pushHistory(state);
      const wire: Wire = {
        id: generateWireId(),
        from: action.from,
        to: action.to,
        fromSide: action.fromSide,
        toSide: action.toSide,
        flow: action.flow,
      };
      return { ...s, wires: [...s.wires, wire] };
    }

    case "DELETE_WIRE": {
      const s = pushHistory(state);
      return { ...s, wires: s.wires.filter((w) => w.id !== action.id) };
    }

    case "START_WIRING":
      return { ...state, wiringFrom: { nodeId: action.fromNodeId, side: action.fromSide } };

    case "CANCEL_WIRING":
      return { ...state, wiringFrom: null };

    case "COMPLETE_WIRING": {
      if (!state.wiringFrom || state.wiringFrom.nodeId === action.toNodeId) {
        return { ...state, wiringFrom: null };
      }
      // Duplicate check with sides
      const isDup = state.wires.some((w) =>
        w.from === state.wiringFrom!.nodeId && w.to === action.toNodeId &&
        (w.fromSide ?? "right") === state.wiringFrom!.side &&
        (w.toSide ?? "left") === action.toSide
      );
      if (isDup) return { ...state, wiringFrom: null };

      const s = pushHistory(state);
      const wire: Wire = {
        id: generateWireId(),
        from: s.wiringFrom!.nodeId,
        to: action.toNodeId,
        fromSide: s.wiringFrom!.side,
        toSide: action.toSide,
      };
      return { ...s, wires: [...s.wires, wire], wiringFrom: null };
    }

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(25, Math.min(200, action.zoom)) };

    case "SET_PAN":
      return { ...state, panX: action.x, panY: action.y };

    case "UNDO": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        nodes: prev.nodes,
        wires: prev.wires,
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future].slice(0, MAX_HISTORY),
        dirty: true,
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        nodes: next.nodes,
        wires: next.wires,
        past: [...state.past, snapshot(state)].slice(-MAX_HISTORY),
        future: state.future.slice(1),
        dirty: true,
      };
    }

    case "MARK_CLEAN":
      return { ...state, dirty: false };

    default:
      return state;
  }
}
