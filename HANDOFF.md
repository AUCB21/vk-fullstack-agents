# Handoff — VK Agents (SAP B1 AI Platform)

**Date**: 2026-06-01
**State**: Phases 0-2 complete. Agent Builder core + UX polish complete (see "Recent session" below). Phase 3 (auth) not started; SAP SL still untested (no access yet).

## Recent session — 2026-06-01

Fixes + Agent Builder UX work. All changes are frontend (`apps/web`); TypeScript clean.

**Chat fixes**:
- `lib/sse-client.ts` — fixed a streaming bug: `currentEvent` was declared inside the read loop and reset each chunk, so SSE events split across chunks (common with Anthropic/Gemini) lost their event type and were silently dropped → no LLM response shown. Moved it outside the loop.
- `lib/chat-context.tsx` — chat now defaults to `"live"` mode (was `"mock"`), so LLMs respond even without the agents backend running. Requires `ANTHROPIC_API_KEY` + `GEMINI_API_KEY` in `apps/web/.env.local`.

**Agent Builder — inspector** (`components/builder/inspector.tsx`):
- "Citar SAP" / "Auto-aprobar" toggles now persist (`config.citeSAP` / `config.autoApprove`); were hardcoded.
- Prompt tab persists to `config.prompt` (onBlur); tab content keyed by node id so inputs reset when switching nodes.
- Runs tab derives from real `state.testRun` (node-by-node trace + empty state); was 4 hardcoded mock rows.
- Properties rows are now editable for all node kinds (`updateNodeRows`).

**Agent Builder — layout / DnD** (big one):
- The only `DndContext` lived inside `Canvas`, so the sidebar's library items (drag source) were outside it — sidebar→canvas drag could not even start. **Lifted `DndContext` to `BuilderLayout`** (wraps sidebar+canvas+inspector); added a `DragOverlay` cursor-following preview. Drag handlers + `dragOffset` now live in `BuilderLayout` (use committed `state.zoom/panX/panY` + `getElementById("builder-canvas")`). `Canvas` takes `dragOffset` as a prop. `BuilderSidebar`/`Inspector`/`CanvasTopbar` are `React.memo`'d so lifting `dragOffset` doesn't re-render them per drag-move.
- Sidebar scroll fixed: root cause was the `builder-layout` grid row sizing to content; fixed with `grid-rows-[minmax(0,1fr)]`.
- Settings modal (sidebar footer gear): edits agent **name + icon**. The `icon` field was dead (hardcoded `"Package"`); now wired end-to-end via `agentIcon` state + `saveMeta()` in context (persists immediately) and shown in footer avatar, topbar breadcrumb, listing cards. The 3 duplicated save blocks were unified into `buildConfig()`.

**Agent Builder — canvas UX**:
- Double-click a library item → creates the node at the visible canvas center (staggered).
- Per-node delete (X) button on hover, always red, hover-tinted. New `DELETE_NODE` reducer action + `deleteNode(id)` (removes node + wires, undoable).
- Pan by plain left-drag on empty canvas (was Alt/middle only); guarded against nodes/ports/buttons/wiring.
- Minimap now functional: shows node positions (uniform scale) + click/drag to pan. (A viewport-indicator rectangle was added then removed by preference — read as confusing.)
- Wheel zoom (was Ctrl+scroll only), cursor-centered.

**Other**:
- Installed `frontend-design` skill at `.claude/skills/frontend-design/`.
- ⚠️ **Lint debt (pre-existing, not from this work)**: `eslint` exits 1 on `lib/builder/builder-context.tsx` and `app/builder/page.tsx` due to `react-hooks/refs` (`idRef.current` in render) and `react-hooks/set-state-in-effect` — surfaced after a dep upgrade in the 2026-05-31 `npm install`. `tsc --noEmit` is clean. A non-zero eslint from those specific rules/files is NOT a regression. Use the local binaries (`./node_modules/.bin/tsc.cmd` / `eslint.cmd`), not `npx` (pulls the wrong `tsc`).

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
- **Canvas features** — undo/redo (50 steps), keyboard shortcuts, functional minimap (click/drag to navigate), wheel zoom (cursor-centered) + zoom controls, left-drag pan, inspector
- **Multi-selection** — Shift+click to add/remove, Ctrl+A selects all, batch delete
- **Delete confirmation** — modal dialog when deleting nodes with connected wires
- **Test run** — mock simulation stepping through nodes with animated banner + stop/dismiss
- **Publish flow** — saves immediately, sets status to "published", toast notification
- **Persistence** — auto-save to localStorage (debounced 2s), onbeforeunload flush
- **Inspector panel** — 3 tabs: Config (model, temp, tokens, behavior toggles + editable properties — all persist), Prompt (persists to config.prompt), Runs (real test-run trace). Per-node delete via hover X. Settings modal for agent name + icon
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

**Required .env.local** (at apps/web/.env.local — note the name, NOT `.local.env`):
```
ANTHROPIC_API_KEY=sk-ant-...     # Haiku + Sonnet in chat
GEMINI_API_KEY=AIza...           # gemini-3.1-flash-lite (default chat model)
SESSION_SECRET=...               # any long random string for dev
# SAP_SL_* vars when SL access is available
```
The frontend calls the LLMs directly from its API routes (chat defaults to live mode), so these keys are needed for chat to respond even without the Python backend.

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

**Agent Builder backlog** (open items in `project_plan.md`, "UI improvements"): inline node rename (double-click header), empty-canvas CTA, per-node validation indicators, collapsible sidebar, port tooltips. Consider clearing the pre-existing react-hooks lint debt (see Recent session) as its own pass.

> Builder changes this session were verified by HTTP-200 smoke of `/builder/[id]` (dev server compiles + SSR renders); the actual drag/zoom/minimap **interactions were not driven by an automated browser** (no playwright/chromium-cli installed) — verify those manually or install Playwright.
