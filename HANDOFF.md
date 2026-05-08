# Handoff — VK Agents (SAP B1 AI Platform)

**Date**: 2026-05-08
**State**: Initial WIP — Phases 0-2 substantially complete

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

## What does NOT work yet

- **SAP SL queries** — SAP access not yet available. Client code is written but untested.
- **Docker compose** — not tested end-to-end
- **Auth flow** (Phase 3) — login page, session management, cookie flow. Not started.
- **Additional agents** (Phase 4) — sales + purchasing agents. Not started.
- **Mobile responsive sidebar** — not implemented

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

## Next steps (in order)

1. **Test with real SAP SL** when access arrives — verify client, session, queries
2. **Phase 3 — Auth flow** — login page, cookie-based sessions
3. **Phase 4 — More agents** — sales + purchasing
4. **Mobile responsive sidebar**
