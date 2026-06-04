# Code Review Findings — Branch `mcp` (2026-06-03)

Context for security review: these are known issues already identified in code review.
They are NOT yet fixed — listed here so the security reviewer can cross-reference or escalate.

## CONFIRMED

### 1. `apps/web/lib/sap/session.ts:40` — CompanyDB sin guard
`CompanyDB: process.env.SAP_SL_COMPANY_DB` — si la env var está ausente, `JSON.stringify` la omite silenciosamente (valor `undefined`). SAP rechaza el payload con error críptico en vez de una falla de startup clara. Los otros 3 campos (`baseUrl`, `user`, `pass`) tienen guard explícito; este no.

**Fix planeado**: agregar guard al inicio de `login()`:
```ts
const companyDb = process.env.SAP_SL_COMPANY_DB;
if (!companyDb) throw new Error("SAP_SL_COMPANY_DB is not set");
```

### 2. `apps/web/proxy.ts:5` — PUBLIC_PATHS prefix demasiado amplio
`startsWith("/api/mcp")` exemptuaría rutas futuras como `/api/mcp-admin` o `/api/mcp/sessions` sin requerir auth.

**Fix planeado**: cambiar a match exacto:
```ts
path === "/api/mcp" || path.startsWith("/api/mcp/")
```

## PLAUSIBLE

### 3. `apps/web/lib/sap/session.ts:43` — Language como string en vez de integer
`Language: process.env.SAP_SL_LANGUAGE ?? "25"` — env vars son siempre strings. SAP SL spec indica integer. Funciona en práctica (HTTP 200 confirmado), pero es type mismatch.

**Fix planeado**: `Language: Number(process.env.SAP_SL_LANGUAGE ?? "25")`

### 4. `apps/web/app/api/mcp/route.ts:8` — McpServer por request (eficiencia futura)
Nueva instancia de `McpServer` por cada request HTTP. Hoy con 1 tool (`ping`) es negligible. Con 15-20 SAP tools en Phase D, el costo de schema compilation se multiplica por cada AI turn.

**Fix planeado**: singleton en Phase B/D cuando haya tools reales.

## ARCHITECTURE

### 5. `apps/web/lib/mcp/server.ts` — Sin estructura de dominio
Todo en `createMcpServer()`. Plan: `lib/mcp/tools/` con `registerItemTools(server)`, `registerOrderTools(server)`, etc. Se resuelve al arrancar Phase B.
