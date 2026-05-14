# Handoff — VK Agents (SAP B1 AI Platform)

**Date**: 2026-05-13
**State**: Phases 0-2 complete, Agent Builder Fases 0-10 complete

## What exists and works

### Backend (services/agents/)
- **FastAPI** app with uvicorn, health endpoint, CORS, middleware stack
- **SAP SL client** (httpx async) — session management, OData queries, models for Item + BusinessPartner. Untested against real SL (awaiting access).
- **SAP proxy middleware** — all SL requests routed through it (SAP requirement)
- **Auth middleware** — session validation with DEV_MODE bypass for development
- **LLM provider** — Anthropic SDK wrapper with streaming + tool-use, per-request model selection
- **Agent runtime** — BaseAgent with tool-call loop (max 10 iterations), InventoryAgent with 3 SAP tools
- **SSE chat endpoint** — POST /chat streams text_delta, tool_call, tool_result, done events
- **Python 3.12+**, ruff lints clean, all imports verified

### Frontend (apps/web/)
- **NextJS 16** + TypeScript + Tailwind v4 + shadcn/ui
- **Full chat UI** adapted from Claude Design model:
  - Sidebar with agent selector, real chat history (localStorage), user profile
  - Topbar with agent pill, model selector (Haiku/Sonnet), SL connection indicator
  - Empty state with per-agent suggestion cards
  - Full composer with inline agent selectors, attachment chips, keyboard hints
  - Message rendering: user bubbles, assistant messages with tool calls, streaming cursor
  - Rich blocks: collapsible tool calls, data tables, KPI strips, sparkline charts, draft PO cards, citation popovers
- **Live/Mock mode toggle** — Live calls real Anthropic API via SSE, Mock uses scripted demo flows
- **Chat persistence** — localStorage with 25MB limit, auto-save, restore from sidebar
- **Model selector** — Haiku/Sonnet, persists per chat session
- **oklch accent system** — teal/indigo/amber shift per agent via CSS data-accent attribute
- TypeScript builds clean (0 errors)

### Infrastructure
- **docker-compose.yml** — web + agents services (untested end-to-end)
- **.env.example** — all config vars documented
- **.gitignore** — standard ignores

### Agent Builder (apps/web — /builder route)
- **Visual node editor** — drag-and-drop canvas for building agents without code
- **4-port Lucidchart-style connections** — every node has ports on top/right/bottom/left, any port can be source or target
- **Port component** (`components/builder/port.tsx`) — click to start/complete wiring
- **Arrow component** (`components/builder/arrow.tsx`) — SVG bezier with arrowhead markers, hover/selected/flow states
- **Snap-to-port wiring** — preview wire snaps to nearest port within ~5rem, click to confirm connection
- **Directional bezier paths** — control points extend outward from port face, works for all 16 side combinations
- **Fan-out** — multiple wires on same port arrive from different angles
- **Live wire updates** during node drag
- **Performance** — ref-based pan/zoom (zero re-renders during interaction), GPU compositing, React.memo
- **Canvas features** — undo/redo (50 steps), keyboard shortcuts, minimap, zoom controls, inspector
- **Multi-selection** — Shift+click to add/remove, Ctrl+A selects all, batch delete
- **Delete confirmation** — modal dialog when deleting nodes with connected wires
- **Test run** — mock simulation stepping through nodes with animated banner + stop/dismiss
- **Publish flow** — saves immediately, sets status to "published", toast notification
- **Persistence** — auto-save to localStorage (debounced 2s), onbeforeunload flush
- **Inspector panel** — 3 tabs: Config (model, temp, tokens, behavior), Prompt (template + variables), Runs (mock data)
- **Agent listing page** — `/builder` with grid, delete confirmation, theme toggle, new agent
- **Scrollable sidebar** — node library scrolls independently from fixed header/footer
- **Light theme** — full builder support with adjusted grid, wires, ports
- TypeScript builds clean (0 errors)

## What does NOT work yet

- **SAP SL queries** — SAP access not yet available. Client code is written but untested.
- **Docker compose** — not tested end-to-end
- **Auth flow** (Phase 3) — login page, session management, cookie flow. Not started.
- **Additional agents** (Phase 4) — sales + purchasing agents. Not started.
- **Agent Builder** — mobile layout, runtime integration (Fases 11+)

## How to run

**Backend** (PowerShell):
```powershell
cd services/agents
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**:
```bash
cd apps/web
npm run dev
```

**Required .env** (at services/agents/.env):
```
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-20250514
DEV_MODE=true
```

## Key files

| Area | File | Purpose |
|---|---|---|
| Chat context | apps/web/lib/chat-context.tsx | Central state: agents, messages, mode, model, sessions |
| Chat storage | apps/web/lib/chat-storage.ts | localStorage CRUD for chat persistence |
| SSE client | apps/web/lib/sse-client.ts | Consumes FastAPI SSE stream |
| Mock data | apps/web/lib/mock-data.ts | Typed SAP mock data for demo mode |
| Mock flows | apps/web/lib/mock-flows.ts | Scripted conversation flows for demo mode |
| LLM provider | services/agents/app/llm/provider.py | Anthropic SDK wrapper |
| Agent base | services/agents/app/agents/base.py | BaseAgent with tool-call loop |
| Chat router | services/agents/app/routers/chat.py | POST /chat SSE endpoint |
| SAP client | services/agents/app/sap/client.py | Async SAP SL REST client |
| Config | services/agents/app/config.py | Pydantic Settings from .env |
| Builder types | apps/web/lib/builder/builder-types.ts | PortSide, Wire, BuilderNode, AgentConfig |
| Builder state | apps/web/lib/builder/builder-reducer.ts | Reducer with undo/redo, side-aware wiring |
| Builder context | apps/web/lib/builder/builder-context.tsx | BuilderProvider + useBuilder hook |
| Wire math | apps/web/lib/builder/wire-utils.ts | Bezier paths, port positions, hit testing |
| Port component | apps/web/components/builder/port.tsx | 4-side connection points |
| Arrow component | apps/web/components/builder/arrow.tsx | SVG wire with hit area + arrowhead |
| Wire preview | apps/web/components/builder/wire-drawing.tsx | Live wire with snap-to-port |
| Canvas | apps/web/components/builder/canvas.tsx | DnD, pan/zoom, keyboard shortcuts, delete confirm |
| Run banner | apps/web/components/builder/run-banner.tsx | Mock test run with step progress |
| Inspector | apps/web/components/builder/inspector.tsx | 3-tab config/prompt/runs panel |
| Agent listing | apps/web/app/builder/page.tsx | Agent grid with CRUD |
| Builder storage | apps/web/lib/builder/builder-storage.ts | localStorage CRUD for agents |

## Next steps (in order)

1. **Test with real SAP SL** when access arrives — verify client, session, queries
2. **Phase 3 — Auth flow** — login page, cookie-based sessions
3. **Phase 4 — More agents** — sales + purchasing
4. **Agent Builder mobile** — responsive layout, touch gestures
5. **Agent Builder → runtime integration** — connect visual editor to agent execution
