# SAP Business One AI Agent Platform — Project Plan

## Context

A full-stack platform that connects LLM-powered agents to SAP Business One via its Service Layer REST API. Agents can be invoked on-demand through a chat interface or run autonomously on schedules.

### Environment

- **SAP B1**: Version 10.0, FP2408+, Cloud deployment
- **SAP Integration**: Service Layer (REST/OData) only — no DI API, no direct DB
- **SAP Constraint**: All agent requests to Service Layer MUST pass through a proxy middleware. SAP requires this for security and request legibility before anything reaches the Service Layer.
- **Auth model**: SAP SL handles authentication via OIDC. The proxy middleware maintains connection/session keep-alive — it does not implement its own auth logic.
- **LLM Provider**: Anthropic (primary). Ollama support is optional/future.
- **Deployment**: Local development first → server deployment later. Docker Compose for both stages.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | NextJS 14+ (App Router), TypeScript | Fullstack — hosts BFF API routes |
| UI Library | shadcn/ui + Tailwind CSS | Claude.ai-inspired chat layout |
| Agent Service | Python 3.12+, FastAPI, uvicorn | All agent logic lives here |
| LLM SDK | `anthropic` (Python SDK) | Direct SDK usage, no wrapper libraries |
| SAP HTTP Client | httpx (async) | Async REST calls to Service Layer |
| Streaming | SSE (Server-Sent Events) | FastAPI → NextJS → Browser |
| Auth | SAP SL session-based (OIDC) | Proxy keeps session alive; SL handles auth |
| Infra | Docker Compose | `web` + `agents` services |

### What NOT to use

- No LangChain, no CrewAI, no LiteLLM — agents are a thin loop over the Anthropic SDK
- No Django, no Flask — FastAPI for async + SSE
- No ORM — SAP SL is the data layer, no local database (SQLite only for execution logs in Phase 5)
- No WebSockets — SSE is sufficient and simpler
- No external auth providers — SAP SL is the auth source

---

## Project Structure

```
/
├── apps/
│   └── web/                          # NextJS application
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   │   └── page.tsx
│       │   │   └── layout.tsx
│       │   ├── (dashboard)/
│       │   │   ├── chat/
│       │   │   │   └── page.tsx
│       │   │   ├── agents/
│       │   │   │   └── page.tsx      # Agent management + logs (Phase 5)
│       │   │   └── layout.tsx
│       │   ├── api/
│       │   │   ├── auth/
│       │   │   │   ├── login/route.ts
│       │   │   │   └── logout/route.ts
│       │   │   ├── agents/
│       │   │   │   ├── chat/route.ts
│       │   │   │   └── [agentId]/route.ts
│       │   │   └── health/route.ts
│       │   └── layout.tsx
│       ├── components/
│       │   ├── chat/
│       │   │   ├── chat-panel.tsx
│       │   │   ├── message-bubble.tsx
│       │   │   ├── agent-selector.tsx
│       │   │   └── streaming-indicator.tsx
│       │   ├── layout/
│       │   │   ├── sidebar.tsx
│       │   │   └── header.tsx
│       │   └── ui/                   # shadcn/ui components
│       ├── lib/
│       │   ├── agent-client.ts
│       │   ├── sap-session.ts
│       │   ├── sse-client.ts
│       │   └── types.ts
│       ├── tailwind.config.ts
│       ├── next.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── services/
│   └── agents/                       # Python FastAPI service
│       ├── app/
│       │   ├── main.py
│       │   ├── config.py             # Pydantic Settings
│       │   ├── routers/
│       │   │   ├── chat.py
│       │   │   ├── agents.py
│       │   │   ├── auth.py
│       │   │   └── health.py
│       │   ├── middleware/
│       │   │   ├── sap_proxy.py      # SAP-required request proxy
│       │   │   └── auth.py           # Session validation
│       │   ├── agents/
│       │   │   ├── base.py
│       │   │   ├── inventory.py
│       │   │   └── registry.py
│       │   ├── tools/
│       │   │   ├── base.py
│       │   │   └── sap_inventory.py
│       │   ├── sap/
│       │   │   ├── client.py
│       │   │   ├── session.py
│       │   │   ├── models.py
│       │   │   └── exceptions.py
│       │   └── llm/
│       │       ├── provider.py
│       │       └── schemas.py
│       ├── tests/
│       │   ├── test_sap_client.py
│       │   └── test_agents.py
│       ├── pyproject.toml
│       └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

> Files for Phases 4–6 (additional agents, tools, scheduler) are added when those phases begin. The structure above reflects the end of Phase 3.

---

## Build Phases — Mandatory

Each phase is a self-contained deliverable. Do not skip ahead. Each phase must run and lint clean before moving to the next.

---

### Phase 0 — Scaffolding + SAP Client

**Goal**: Both services running. FastAPI can authenticate and query SAP Service Layer.

**Tasks**:
- [x] Initialize NextJS app with App Router, TypeScript, Tailwind, shadcn/ui
- [x] Initialize FastAPI project with uvicorn, pyproject.toml
- [x] Create `docker-compose.yml` with `web` and `agents` services
- [x] Add `/health` endpoints on both services
- [x] Configure `.env` / `.env.example` with placeholder values
- [x] Implement `sap/client.py` — async httpx client with base URL, headers, OData param support
- [x] Implement `sap/session.py` — login via `POST /Login`, session cookie storage, auto-refresh on 401 (retry request once)
- [x] Implement `sap/models.py` — Pydantic models for `Item` and `BusinessPartner` only
- [x] Implement `sap/exceptions.py` — `SAPAuthError`, `SAPNotFoundError`, `SAPValidationError`
- [x] CRUD methods: `get_items(filters)`, `get_item(code)`, `get_business_partners(filters)`
- [x] OData query param support: `$filter`, `$select`, `$top`, `$skip`, `$orderby`
- [x] Implement `middleware/sap_proxy.py` — SAP-required request proxy (auth injection, session keep-alive, request transformation, logging)
- [x] Configure CORS for NextJS ↔ FastAPI communication
- [x] Handle SSL/TLS for self-signed SAP SL certificates
- [ ] Verify `docker compose up` starts both services, NextJS proxies to FastAPI health check

**Acceptance**: `curl localhost:3000/api/health` returns `{"status": "ok", "agents_service": "ok"}`. SAP items can be queried from a test script via the proxy middleware.

> **Status**: ~95% complete. All code written. Docker compose not yet tested end-to-end. SL queries untested (awaiting access).

---

### Phase 1 — Agent Runtime + LLM

**Goal**: One working agent that answers natural language questions using live SAP data.

**Tasks**:
- [x] Implement `llm/provider.py` — wraps Anthropic Python SDK: `chat()`, `stream()`, tool-use parsing
- [x] Implement `llm/schemas.py` — tool definition builder (name, description, parameters as JSON Schema)
- [x] Implement `tools/base.py` — `Tool` class: name, description, parameters, `async execute(input, sap_client) → dict`
- [x] Implement `tools/sap_inventory.py` — tools: `get_items`, `check_stock_levels`, `get_item_details`
- [x] Implement `agents/base.py` — `BaseAgent` class:
  - `system_prompt: str`
  - `tools: list[Tool]`
  - `async run(message, history) → AsyncGenerator[Event]`
  - Tool-call loop: send to LLM → execute tool if called → append result → repeat. Max 10 iterations.
  - Tool execution errors returned to LLM as error results (let it retry or explain)
- [x] Implement `agents/inventory.py` — InventoryAgent with system prompt + inventory tools
- [x] Implement `agents/registry.py` — dict mapping agent IDs to classes
- [x] Implement `routers/chat.py` — `POST /chat` accepts `{agent_id, message, history}`, returns SSE stream

**SSE Event Format** (FastAPI → NextJS → Browser):
```
event: text_delta
data: {"content": "Let me check..."}

event: tool_call
data: {"tool": "get_items", "input": {"filter": "QuantityOnStock lt 10"}}

event: tool_result
data: {"tool": "get_items", "result": [...]}

event: done
data: {}
```

**Constraints**:
- Agents are stateless — history is passed in each request
- No agent-to-agent communication
- One agent only (InventoryAgent) — prove the pattern before replicating

**Acceptance**: `POST /chat {"agent_id": "inventory", "message": "What items have less than 10 in stock?"}` → streams tool call to SAP via proxy → streams natural language answer with real data.

> **Status**: Code complete + live chatbot wired. Frontend has Live/Mock mode toggle. Live mode streams real Anthropic responses via SSE. Backend has DEV_MODE bypass for auth (no SL needed). To test: set ANTHROPIC_API_KEY + DEV_MODE=true in .env, run both services.

---

### Phase 2 — Chat UI

**Goal**: Browser interface for interacting with agents. Visual feedback for development and demos.

**Layout**:
```
┌──────────────────────────────────────────────────┐
│  Header (logo, user menu)                        │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Sidebar   │         Chat Panel                  │
│            │                                     │
│  - Agent   │  ┌─────────────────────────────┐   │
│    picker  │  │  Message history             │   │
│            │  │  (scrollable)                │   │
│            │  │  [User bubble]               │   │
│            │  │  [Assistant bubble]           │   │
│            │  │  [Tool call indicator]        │   │
│            │  │  [Assistant continues...]     │   │
│            │  └─────────────────────────────┘   │
│            │  ┌─────────────────────────────┐   │
│            │  │  Input bar + send button     │   │
│            │  └─────────────────────────────┘   │
└────────────┴─────────────────────────────────────┘
```

**Tasks**:
- [x] Implement chat panel — scrollable message list, auto-scroll on new messages
- [x] Implement message bubbles — user (right-aligned), assistant (left-aligned), tool calls (collapsible with tool name + input/output)
- [x] Implement `lib/sse-client.ts` — SSE consumer that parses stream events into React state
- [x] Implement input bar — text input, send button, disabled during streaming, Enter to send
- [x] Implement streaming indicator — typing dots while waiting, tool-call status while executing
- [x] Implement sidebar — agent selector (list of available agents with descriptions)
- [x] Implement NextJS API route `/api/agents/chat` — proxies POST to FastAPI, forwards SSE stream to browser
- [ ] Responsive layout: sidebar collapses on mobile, full-width chat panel

**UI Components** (shadcn/ui):
- `ScrollArea` for message list
- `Card` for message bubbles
- `Badge` for agent names and tool indicators
- `Button` for send, agent selection
- `Input` for chat input
- `Collapsible` for tool call details
- `Sheet` for mobile sidebar

**Extra features delivered (beyond original plan)**:
- [x] Chat persistence via localStorage (25MB limit, auto-save, restore from sidebar)
- [x] Live/Mock mode toggle — real Anthropic API or scripted demo flows
- [x] Model selector (Haiku/Sonnet) — persists per chat session
- [x] DEV_MODE auth bypass for development without SL access
- [x] Full design model adaptation (oklch accent system, rich blocks, tool calls, KPIs, sparklines, citations)

**Constraints**:
- No file uploads
- Conversation history managed via React state + localStorage

**Acceptance**: Open browser → select agent → type question → see streamed response with tool calls visible.

> **Status**: ~95% complete. Remaining: mobile responsive sidebar.

---

### Phase 3 — Auth Flow

**Goal**: Users log in with SAP SL credentials. Routes are protected. Sessions persist.

**Auth Flow**:
```
Browser → NextJS /api/auth/login → FastAPI /auth/login → SAP Proxy → SAP SL /Login
                                                                          ↓
Browser ← httpOnly cookie ← NextJS ← session token ← SAP SL session
```

**Tasks**:
- [ ] Implement FastAPI `/auth/login` — receives username/password, routes through SAP proxy to SL `/Login`, returns session token
- [ ] Implement FastAPI `/auth/logout` — terminates SL session via proxy
- [ ] Implement FastAPI `middleware/auth.py` — validates session on protected routes, rejects with 401 if expired
- [ ] Implement NextJS login page — form with username/password, calls `/api/auth/login`
- [ ] Implement NextJS API route `/api/auth/login` — proxies to FastAPI, sets httpOnly cookie on response
- [ ] Implement NextJS middleware — checks cookie on `(dashboard)` routes, redirects to `/login` if missing
- [ ] Session expiry handling — if FastAPI returns 401, NextJS clears cookie and redirects to login

**Constraints**:
- No JWT signing — pass-through with httpOnly cookie
- No user registration — SAP SL users are the user base
- No role-based access control — all authenticated users have equal access
- SL handles auth (OIDC); proxy keeps session alive

**Acceptance**: Login via browser → access chat → refresh maintains session → logout clears session → expired session redirects to login.

> **Status**: Not started. Requires SL access for `/Login` endpoint testing. NextJS login page UI can be built without SL.

---

### Phase 4 — Additional Agents

**Goal**: Prove the agent pattern scales. Add sales and purchasing agents.

**Tasks**:
- [ ] Extend `sap/models.py` — add `Order`, `OrderLine`, `DocumentParams` models
- [ ] Extend `sap/client.py` — add `create_sales_order()`, `get_sales_orders(filters)`, `get_order_details()`, `get_purchase_orders(filters)`, `create_purchase_order()`, `get_suppliers()`
- [ ] Implement `tools/sap_sales.py` — tools: `get_sales_orders`, `create_sales_order`, `get_order_details`, `get_business_partners`
- [ ] Implement `tools/sap_purchasing.py` — tools: `get_purchase_orders`, `create_purchase_order`, `get_suppliers`
- [ ] Implement `agents/sales_orders.py` — SalesOrderAgent with system prompt + sales tools
- [ ] Implement `agents/purchase_orders.py` — PurchaseOrderAgent with system prompt + purchasing tools
- [ ] Register new agents in `agents/registry.py`
- [ ] Verify agents appear in sidebar and work through chat UI

**Acceptance**: All 3 agents (inventory, sales, purchasing) work end-to-end through the chat UI.

---

## Build Phases — Optional / Future

These phases build on the mandatory foundation. They can be implemented in any order after Phase 4.

---

### Phase 5 — Autonomous Agents (Optional)

**Goal**: Agents that run on schedules without user interaction.

**Dependencies**: Adds `APScheduler` to Python deps. Adds SQLite for execution logs.

**Tasks**:
- [ ] Implement `scheduler/manager.py` — APScheduler setup with configurable jobs
- [ ] Implement `scheduler/tasks.py` — `low_stock_check` task (runs hourly, queries items below threshold, logs alerts)
- [ ] Implement `scheduler/store.py` — SQLite storage for execution logs (timestamp, agent, result, status)
- [ ] Implement SAP SL session pooling in `sap/session.py` — max concurrent sessions config, queue requests when pool exhausted. Required for autonomous agents that run independently of user sessions.
- [ ] API endpoints: list scheduled tasks, get execution history, trigger task manually, enable/disable task
- [ ] NextJS dashboard page (`agents/page.tsx`) — table of scheduled tasks, execution history with status/result, manual trigger button
- [ ] Add `pending_orders_review` task (runs daily, checks open orders older than N days)

**Acceptance**: Scheduled agent runs on cron → results logged to SQLite → visible in dashboard → manual trigger works.

---

### Phase 6 — Hardening (Optional)

**Goal**: Production-ready error handling, logging, and resilience.

**Dependencies**: Adds `structlog` (Python), `pino` (NextJS).

**Tasks**:
- [ ] Structured logging — Python: `structlog` with JSON output. NextJS: `pino`
- [ ] Request/response logging middleware — log all SAP SL calls with timing
- [ ] React error boundaries on chat panel — graceful degradation on stream failures
- [ ] Rate limiting — limit concurrent agent invocations per user
- [ ] Deep health check — `GET /health/deep` verifies SL connectivity and LLM API reachability
- [ ] Graceful shutdown — drain active agent sessions on SIGTERM
- [ ] Environment config — `.env.development`, `.env.production`, validated by Pydantic Settings

**Acceptance**: System handles SL session exhaustion gracefully, logs are structured JSON, errors surface in UI without crashes.

---

### Phase 7 — Ollama / Multi-Provider Support (Optional)

**Goal**: Swap LLM providers via config. Run agents locally without Anthropic API.

**Dependencies**: Adds `ollama` or uses OpenAI-compatible client for Ollama.

**Tasks**:
- [ ] Implement thin LLM adapter interface: `chat()`, `stream()`, `tool_use()` methods
- [ ] Anthropic adapter — wraps existing `llm/provider.py` logic
- [ ] Ollama adapter — uses OpenAI-compatible API (`httpx` or `openai` SDK)
- [ ] Config: `LLM_PROVIDER` (anthropic|ollama), `LLM_MODEL`, `OLLAMA_BASE_URL`
- [ ] Handle provider-specific tool-use format differences
- [ ] Test with dummy tool against both providers

**Acceptance**: Switch `LLM_PROVIDER=ollama` in `.env` → agents work with local model.

---

### Future Ideas (Not Planned)

These are noted for reference but have no phase or timeline:

- **SAP Webhooks**: SL (FP2408) does not have native webhooks. Polling-based entity watchers could detect changes, but this is complex and low priority.
- **~~Conversation persistence~~**: ~~Store chat history server-side (SQLite or Postgres) so conversations survive page refresh.~~ **DONE** — implemented via localStorage (25MB limit, auto-save on completion, restore from sidebar).
- **Markdown rendering**: Render agent responses as rich markdown in the chat UI.
- **Reporting agent**: A general-purpose agent that generates reports from SAP data.
- **Agent-to-agent communication**: Let agents delegate subtasks to other agents.
- **Role-based access control**: Restrict agent capabilities based on SAP user roles.
- **File uploads**: Allow users to upload documents for agents to process.
- **UI tweaks panel**: User-facing settings panel for theme (light/dark), accent color, and UI density preferences. Adapted from the design model's tweaks system.

---

## Middleware Stack (FastAPI)

Applied bottom-to-top (last registered = first executed):

```python
# main.py
app = FastAPI()

# 1. Auth validation — rejects unauthenticated requests (except /auth/*, /health)
app.add_middleware(AuthMiddleware)

# 2. SAP proxy — all SL requests pass through this. Handles auth injection,
#    session keep-alive, request transformation, and request logging.
#    SAP requires this layer before anything reaches the Service Layer.
app.add_middleware(SAPProxyMiddleware)
```

> Structured logging middleware added in Phase 6. Until then, Python's built-in `logging` module is sufficient.

---

## Key Configuration (.env)

```bash
# SAP Service Layer
SAP_SL_BASE_URL=https://your-server:50000/b1s/v1
SAP_SL_COMPANY_DB=YOUR_COMPANY
SAP_SL_SESSION_TIMEOUT=1800
SAP_SL_VERIFY_SSL=true              # Set false for self-signed certs in dev

# LLM
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-20250514

# App
NEXTJS_URL=http://localhost:3000
AGENTS_URL=http://localhost:8000
SESSION_SECRET=your-secret-key

# Scheduler (Phase 5 only)
# SCHEDULER_ENABLED=false
# SAP_SL_MAX_SESSIONS=20
# LOW_STOCK_THRESHOLD=10
# LOW_STOCK_CRON="0 * * * *"
# PENDING_ORDERS_CRON="0 8 * * *"
```

---

## Constraints (Global)

- **No unnecessary dependencies** — every package must justify its presence. Install deps when the phase that needs them begins, not before.
- **No over-abstraction** — prefer flat, readable code over clever patterns
- **Compile/lint before moving on** — TypeScript strict mode, Python ruff
- **SAP SL is the source of truth** — no local caching of SAP data
- **SAP proxy is mandatory** — all SL requests go through the proxy middleware, no direct SL calls from agent code
- **Stateless agents** — conversation history passed per request, no server-side chat storage
- **One agent first** — prove the pattern works before adding more agents
