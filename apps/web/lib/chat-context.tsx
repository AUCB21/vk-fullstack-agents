"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AGENTS } from "./mock-data";
import { SCRIPTED_FLOWS, type FlowStep } from "./mock-flows";
import { streamChat } from "./sse-client";
import {
  loadSessions,
  saveSession,
  deleteSession as deleteStoredSession,
  generateTitle,
  type ChatSession,
} from "./chat-storage";
import { useAuth } from "./auth-context";

// --- Types ---

export type Attachment = { name: string; size: string; file?: File };

export type UserMessage = {
  role: "user";
  content: string;
  attachments?: Attachment[];
};

export type AssistantMessage = {
  role: "assistant";
  agent: string;
  steps: FlowStep[];
  key: number;
};

export type LiveToolCall = {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: "running" | "done" | "error";
};

export type LiveAssistantMessage = {
  role: "live-assistant";
  agent: string;
  text: string;
  toolCalls: LiveToolCall[];
  status: "streaming" | "done" | "error";
  errorText?: string;
  key: number;
};

export type Message = UserMessage | AssistantMessage | LiveAssistantMessage;

export type CitationData = {
  code: string;
  kind: "item" | "vendor";
  x: number;
  y: number;
} | null;

type ChatMode = "live" | "mock";

export const AVAILABLE_MODELS = [
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1", desc: "El mas rapido", provider: "google" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku", desc: "Rapido y liviano", provider: "anthropic" },
  { id: "claude-sonnet-4-20250514", label: "Sonnet", desc: "Equilibrado y capaz", provider: "anthropic" },
] as const;

export const DEFAULT_MODEL = "gemini-3.1-flash-lite";

type ChatContextValue = {
  activeAgent: string;
  setActiveAgent: (id: string) => void;
  conversation: Message[];
  input: string;
  setInput: (v: string) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  attachments: Attachment[];
  addAttachment: (files: FileList) => void;
  removeAttachment: (i: number) => void;
  citation: CitationData;
  setCitation: (c: CitationData) => void;
  startFlow: (flowKey: string, userText?: string) => void;
  onSend: () => void;
  onNewChat: () => void;
  mode: ChatMode;
  setMode: (m: ChatMode) => void;
  backendAvailable: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  model: string;
  setModel: (m: string) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

// --- Provider ---

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isGuest = !user || user.type === "guest";

  const [activeAgent, setActiveAgentRaw] = useState("inventory");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [citation, setCitation] = useState<CitationData>(null);
  const [mode, setModeRaw] = useState<ChatMode>("mock");
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [theme, setThemeRaw] = useState<"dark" | "light">("dark");
  const abortRef = useRef<AbortController | null>(null);

  const setMode = useCallback(
    (m: ChatMode) => {
      setModeRaw(m);
    },
    [],
  );

  // Theme: load from localStorage on mount, apply class to html
  useEffect(() => {
    const saved = localStorage.getItem("vk-theme") as "dark" | "light" | null;
    if (saved) setThemeRaw(saved);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("theme-transitioning");
    el.classList.remove("theme-light");
    if (theme === "light") el.classList.add("theme-light");
    localStorage.setItem("vk-theme", theme);
    const timer = setTimeout(() => el.classList.remove("theme-transitioning"), 250);
    return () => clearTimeout(timer);
  }, [theme]);

  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeRaw(t);
  }, []);

  // Load sessions from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  // Check backend availability on mount
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        const available = data.agents_service === "ok";
        setBackendAvailable(available);
        if (available) setModeRaw("live");
      })
      .catch(() => setBackendAvailable(false));
  }, []);

  // Apply accent-per-agent to document root
  useEffect(() => {
    const agent = AGENTS.find((a) => a.id === activeAgent);
    if (agent) {
      document.documentElement.dataset.accent = agent.color;
    }
  }, [activeAgent]);

  // Close citation on click anywhere + ESC key
  useEffect(() => {
    const close = () => setCitation(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCitation(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // --- Session persistence helpers ---

  const saveCurrentSession = useCallback(
    (conv: Message[]) => {
      if (conv.length === 0) return;

      const now = Date.now();
      const id = activeSessionId || (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const session: ChatSession = {
        id,
        title: generateTitle(conv),
        agent: activeAgent,
        model,
        messages: conv,
        createdAt: activeSessionId
          ? (sessions.find((s) => s.id === id)?.createdAt ?? now)
          : now,
        updatedAt: now,
      };

      saveSession(session);
      setSessions(loadSessions());
      setActiveSessionId(id);
    },
    [activeAgent, activeSessionId, sessions],
  );

  // Auto-save when a response completes
  const prevBusyRef = useRef(busy);
  useEffect(() => {
    if (prevBusyRef.current && !busy && conversation.length > 0) {
      saveCurrentSession(conversation);
    }
    prevBusyRef.current = busy;
  }, [busy, conversation, saveCurrentSession]);

  // --- Actions ---

  const setActiveAgent = useCallback(
    (id: string) => {
      if (conversation.length > 0) {
        saveCurrentSession(conversation);
      }
      setActiveAgentRaw(id);
      setConversation([]);
      setActiveSessionId(null);
      setBusy(false);
      setInput("");
      setAttachments([]);
      abortRef.current?.abort();
    },
    [conversation, saveCurrentSession],
  );

  const onNewChat = useCallback(() => {
    if (conversation.length > 0) {
      saveCurrentSession(conversation);
    }
    setConversation([]);
    setActiveSessionId(null);
    setBusy(false);
    setInput("");
    setAttachments([]);
    abortRef.current?.abort();
  }, [conversation, saveCurrentSession]);

  const handleLoadSession = useCallback((id: string) => {
    const found = loadSessions().find((s) => s.id === id);
    if (!found) return;
    setConversation(found.messages);
    setActiveAgentRaw(found.agent);
    setModel(found.model || DEFAULT_MODEL);
    setActiveSessionId(id);
    setBusy(false);
    setInput("");
    setAttachments([]);
  }, []);

  const handleDeleteSession = useCallback(
    (id: string) => {
      deleteStoredSession(id);
      setSessions(loadSessions());
      if (activeSessionId === id) {
        setConversation([]);
        setActiveSessionId(null);
      }
    },
    [activeSessionId],
  );

  // --- Mock mode: scripted flows ---

  const startFlow = useCallback(
    (flowKey: string, userText?: string) => {
      const flow = SCRIPTED_FLOWS[flowKey];
      if (!flow) return;
      const agent = AGENTS.find((a) => a.id === activeAgent);

      setConversation((c) => [
        ...c,
        { role: "user", content: userText || flow.user, attachments: [...attachments] },
        { role: "assistant", agent: agent?.name || "Agent", steps: flow.steps, key: Date.now() },
      ]);
      setAttachments([]);
      setInput("");
      setBusy(true);
    },
    [activeAgent, attachments],
  );

  const onSendMock = useCallback(() => {
    if (!input.trim()) return;
    const text = input.toLowerCase();
    let flow = "stock-low";
    if (/draft|create|po\b|purchase order/.test(text)) flow = "po-draft";
    else if (/snapshot|kpi|health|trend|chart/.test(text)) flow = "kpis";
    startFlow(flow, input);
  }, [input, startFlow]);

  // --- Live mode: real Anthropic API ---

  const onSendLive = useCallback(() => {
    if (!input.trim()) return;

    const agent = AGENTS.find((a) => a.id === activeAgent);
    const userMsg: UserMessage = {
      role: "user",
      content: input,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    const liveMsg: LiveAssistantMessage = {
      role: "live-assistant",
      agent: agent?.name || "Agent",
      text: "",
      toolCalls: [],
      status: "streaming",
      key: Date.now(),
    };

    setConversation((c) => [...c, userMsg, liveMsg]);
    setInput("");
    setAttachments([]);
    setBusy(true);

    const history: Array<Record<string, unknown>> = [];
    for (const msg of conversation) {
      if (msg.role === "user") {
        history.push({ role: "user", content: msg.content });
      } else if (msg.role === "live-assistant" && msg.status === "done") {
        history.push({ role: "assistant", content: msg.text });
      }
    }

    const abort = new AbortController();
    abortRef.current = abort;

    let toolCallCounter = 0;

    streamChat(
      { agent_id: activeAgent, message: input, history, model },
      {
        onTextDelta: (content) => {
          setConversation((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "live-assistant") {
              updated[updated.length - 1] = { ...last, text: last.text + content };
            }
            return updated;
          });
        },
        onToolCall: (tool, toolInput) => {
          const id = `tc-${++toolCallCounter}`;
          setConversation((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "live-assistant") {
              updated[updated.length - 1] = {
                ...last,
                toolCalls: [
                  ...last.toolCalls,
                  { id, tool, input: toolInput, status: "running" as const },
                ],
              };
            }
            return updated;
          });
        },
        onToolResult: (tool, result) => {
          setConversation((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "live-assistant") {
              const calls = last.toolCalls.map((tc) =>
                tc.tool === tool && tc.status === "running"
                  ? { ...tc, result, status: "done" as const }
                  : tc,
              );
              updated[updated.length - 1] = { ...last, toolCalls: calls };
            }
            return updated;
          });
        },
        onError: (error) => {
          setConversation((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "live-assistant") {
              updated[updated.length - 1] = {
                ...last,
                status: "error",
                errorText: error,
              };
            }
            return updated;
          });
          setBusy(false);
        },
        onDone: () => {
          setConversation((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "live-assistant") {
              updated[updated.length - 1] = { ...last, status: "done" };
            }
            return updated;
          });
          setBusy(false);
        },
      },
      abort.signal,
    );
  }, [input, activeAgent, attachments, conversation, model]);

  // --- Dispatch to correct mode ---

  const onSend = useCallback(() => {
    console.log(`[chat] mode=${mode} agent=${activeAgent} backendAvailable=${backendAvailable}`);
    if (mode === "live") {
      onSendLive();
    } else {
      onSendMock();
    }
  }, [mode, activeAgent, backendAvailable, onSendLive, onSendMock]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const addAttachment = useCallback((files: FileList) => {
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE) {
        alert(`"${file.name}" supera el limite de 10MB`);
        continue;
      }
      const sizeStr = file.size < 1024
        ? `${file.size} B`
        : file.size < 1024 * 1024
          ? `${Math.round(file.size / 1024)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      newAttachments.push({ name: file.name, size: sizeStr, file });
    }
    if (newAttachments.length > 0) {
      setAttachments((a) => [...a, ...newAttachments]);
    }
  }, []);

  const removeAttachment = useCallback((i: number) => {
    setAttachments((a) => a.filter((_, j) => j !== i));
  }, []);

  return (
    <ChatContext.Provider
      value={{
        activeAgent,
        setActiveAgent,
        conversation,
        input,
        setInput,
        busy,
        setBusy,
        attachments,
        addAttachment,
        removeAttachment,
        citation,
        setCitation,
        startFlow,
        onSend,
        onNewChat,
        mode,
        setMode,
        backendAvailable,
        sessions,
        activeSessionId,
        loadSession: handleLoadSession,
        deleteSession: handleDeleteSession,
        model,
        setModel,
        theme,
        setTheme,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
