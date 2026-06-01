"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AgentConfig, BuilderNode, NodeRow, PortSide, Wire } from "./builder-types";
import type { NodeTemplate } from "./builder-types";
import {
  builderReducer,
  initialBuilderState,
  type BuilderAction,
  type BuilderState,
} from "./builder-reducer";
import { saveAgentConfig, loadAgentConfig, generateId } from "./builder-storage";
import { INITIAL_NODES_DEMO, INITIAL_WIRES_DEMO } from "./node-library";

type BuilderContextValue = {
  state: BuilderState;
  dispatch: (action: BuilderAction) => void;

  agentId: string;
  agentName: string;
  setAgentName: (name: string) => void;
  agentIcon: string;
  agentVersion: string;
  agentStatus: "draft" | "published";
  setAgentStatus: (status: "draft" | "published") => void;
  saveMeta: (name: string, icon: string) => void;

  addNode: (template: NodeTemplate, x: number, y: number) => void;
  moveNode: (id: string, dx: number, dy: number) => void;
  selectNode: (id: string | null) => void;
  toggleSelectNode: (id: string) => void;
  selectWire: (id: string | null) => void;
  deleteSelected: () => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void;
  updateNodeRows: (id: string, rows: NodeRow[]) => void;
  startWiring: (fromNodeId: string, fromSide: PortSide) => void;
  cancelWiring: () => void;
  completeWiring: (toNodeId: string, toSide: PortSide) => void;
  startTestRun: () => void;
  stopTestRun: () => void;
  publish: () => void;
  undo: () => void;
  redo: () => void;

  selectedNode: BuilderNode | undefined;
  selectedWire: Wire | undefined;
  saveStatus: "saved" | "saving" | "unsaved";
};

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error("useBuilder must be used within BuilderProvider");
  return ctx;
}

export function BuilderProvider({
  agentId: rawAgentId,
  children,
}: {
  agentId: string;
  children: ReactNode;
}) {
  const isNew = rawAgentId === "new";
  const idRef = useRef(isNew ? generateId() : rawAgentId);
  const agentId = idRef.current;

  const [state, dispatch] = useReducer(builderReducer, initialBuilderState);
  const [agentName, setAgentName] = useState("Nuevo agente");
  const [agentIcon, setAgentIcon] = useState("Package");
  const [agentVersion] = useState("v0.1");
  const [agentStatus, setAgentStatus] = useState<"draft" | "published">("draft");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // Load existing config on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    if (!isNew) {
      const config = loadAgentConfig(agentId);
      if (config) {
        dispatch({ type: "LOAD", nodes: config.nodes, wires: config.wires });
        setAgentName(config.name);
        setAgentIcon(config.icon);
        setAgentStatus(config.status);
        return;
      }
    }

    // For new agents, load demo data
    dispatch({ type: "LOAD", nodes: INITIAL_NODES_DEMO, wires: INITIAL_WIRES_DEMO });
  }, [agentId, isNew]);

  // Build the persisted config from current state — single source of truth
  const buildConfig = useCallback(
    (overrides?: Partial<AgentConfig>): AgentConfig => ({
      id: agentId,
      name: agentName,
      icon: agentIcon,
      version: agentVersion,
      status: agentStatus,
      nodes: state.nodes,
      wires: state.wires,
      createdAt: loadAgentConfig(agentId)?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    }),
    [agentId, agentName, agentIcon, agentVersion, agentStatus, state.nodes, state.wires],
  );

  // Auto-save debounced
  useEffect(() => {
    if (!state.dirty) return;
    setSaveStatus("unsaved");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      saveAgentConfig(buildConfig());
      dispatch({ type: "MARK_CLEAN" });
      setSaveStatus("saved");
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.dirty, buildConfig]);

  // Persist agent metadata (name / icon) immediately — bypasses the dirty flag,
  // which only tracks node/wire changes. Pass fresh values to avoid stale closures.
  const saveMeta = useCallback(
    (name: string, icon: string) => {
      setAgentName(name);
      setAgentIcon(icon);
      saveAgentConfig(buildConfig({ name, icon }));
      dispatch({ type: "MARK_CLEAN" });
      setSaveStatus("saved");
    },
    [buildConfig],
  );

  // Convenience actions
  const addNode = useCallback((t: NodeTemplate, x: number, y: number) => dispatch({ type: "ADD_NODE", template: t, x, y }), []);
  const moveNode = useCallback((id: string, dx: number, dy: number) => dispatch({ type: "MOVE_NODE", id, dx, dy }), []);
  const selectNode = useCallback((id: string | null) => dispatch({ type: "SELECT_NODE", id }), []);
  const toggleSelectNode = useCallback((id: string) => dispatch({ type: "TOGGLE_SELECT_NODE", id }), []);
  const selectWire = useCallback((id: string | null) => dispatch({ type: "SELECT_WIRE", id }), []);
  const deleteSelected = useCallback(() => dispatch({ type: "DELETE_SELECTED" }), []);
  const deleteNode = useCallback((id: string) => dispatch({ type: "DELETE_NODE", id }), []);
  const duplicateNode = useCallback((id: string) => dispatch({ type: "DUPLICATE_NODE", id }), []);
  const updateNodeConfig = useCallback((id: string, config: Record<string, unknown>) => dispatch({ type: "UPDATE_NODE_CONFIG", id, config }), []);
  const updateNodeRows = useCallback((id: string, rows: NodeRow[]) => dispatch({ type: "UPDATE_NODE_ROWS", id, rows }), []);
  const startWiring = useCallback((fromNodeId: string, fromSide: PortSide) => dispatch({ type: "START_WIRING", fromNodeId, fromSide }), []);
  const cancelWiring = useCallback(() => dispatch({ type: "CANCEL_WIRING" }), []);
  const completeWiring = useCallback((toNodeId: string, toSide: PortSide) => dispatch({ type: "COMPLETE_WIRING", toNodeId, toSide }), []);
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  // Test run — mock simulation stepping through nodes
  const testRunTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startTestRun = useCallback(() => {
    if (state.testRun?.status === "running") return;
    const nodeIds = state.nodes.map((n) => n.id);
    if (nodeIds.length === 0) return;
    dispatch({ type: "START_TEST_RUN", nodeIds });
    // Clear any previous timers
    testRunTimers.current.forEach(clearTimeout);
    testRunTimers.current = [];
    const stepMs = Math.min(3500 / nodeIds.length, 800);
    nodeIds.forEach((nid, i) => {
      testRunTimers.current.push(
        setTimeout(() => dispatch({ type: "TEST_RUN_STEP", nodeId: nid, stepIndex: i }), stepMs * (i + 1)),
      );
    });
    testRunTimers.current.push(
      setTimeout(() => dispatch({ type: "END_TEST_RUN", status: "done" }), stepMs * nodeIds.length + 500),
    );
  }, [state.testRun?.status, state.nodes]);

  const stopTestRun = useCallback(() => {
    testRunTimers.current.forEach(clearTimeout);
    testRunTimers.current = [];
    dispatch({ type: "END_TEST_RUN", status: "error" });
  }, []);

  // Publish — save immediately + set status
  const publish = useCallback(() => {
    setAgentStatus("published");
    saveAgentConfig(buildConfig({ status: "published" }));
    dispatch({ type: "MARK_CLEAN" });
    setSaveStatus("saved");
  }, [buildConfig]);

  // onbeforeunload — flush unsaved changes
  useEffect(() => {
    const handleUnload = () => {
      if (!state.dirty) return;
      saveAgentConfig(buildConfig());
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [state.dirty, buildConfig]);

  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId);
  const selectedWire = state.wires.find((w) => w.id === state.selectedWireId);

  return (
    <BuilderContext.Provider
      value={{
        state,
        dispatch,
        agentId,
        agentName,
        setAgentName,
        agentIcon,
        agentVersion,
        agentStatus,
        setAgentStatus,
        saveMeta,
        addNode,
        moveNode,
        selectNode,
        toggleSelectNode,
        selectWire,
        deleteSelected,
        deleteNode,
        duplicateNode,
        updateNodeConfig,
        updateNodeRows,
        startWiring,
        cancelWiring,
        completeWiring,
        startTestRun,
        stopTestRun,
        publish,
        undo,
        redo,
        selectedNode,
        selectedWire,
        saveStatus,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
}
