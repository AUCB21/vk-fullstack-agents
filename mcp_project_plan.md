# MCP Server — SAP B1 · Plan de proyecto

> Plan dedicado para construir el **MCP server real** (Model Context Protocol) que expone SAP Business One como tools, dentro del app Next.js. Complementa `project_plan.md` (sección "Agent Builder runtime via MCP"). Última edición: 2026-06-01.

## 1. Objetivo

Hacer que los agentes (chat y, después, los del Builder) **ejecuten de verdad** sobre SAP B1. Backend-first: primero el MCP server con las operaciones SAP; recién después la UI las invoca. El Builder queda como cliente fino (selecciona tools + prompt; no contiene lógica de ejecución).

**Arquitectura**: el MCP es una **superficie global/comprehensiva** de SAP B1 (todas las tools disponibles); la **especialización es por agente** — cada agente elige su subset de tools + su prompt. El MCP no se scopea por agente.

**Foco inicial: Compras y Ventas** (inventario es una adición, no la prioridad). **Visión a futuro**: agentes especializados invocados de forma autónoma/paralela (ej. carga de facturas de clientes/proveedores, actualización de listas de precios) — implica escrituras vía SL y ejecución concurrente, que el diseño debe soportar.

## 2. Principios (de la skill `mcp-builder` + restricciones del proyecto)

- **Stack**: TypeScript, MCP TS SDK (`@modelcontextprotocol/sdk`), transporte **Streamable HTTP stateless**. Todo dentro de `apps/web` (sin Python).
- **API moderna del SDK**: usar `server.registerTool()` (NO `server.tool()` ni `setRequestHandler` manual).
- **Validación**: **Zod 4** (lockeado) con `.strict()`, constraints y `.describe()` en cada campo. Verificar contra docs/`node_modules` la forma de `inputSchema` que pide el MCP SDK con Zod 4.
- **Tools**: snake_case con prefijo de servicio → `sap_<action>_<resource>` (ej. `sap_list_items`). Server name: `sap-b1-mcp-server`.
- **Formato de respuesta dual**: `response_format` = `markdown` (**default** — más liviano en tokens, omite metadata verbosa) | `json` (estructurado completo). Siempre devolver `structuredContent` para uso programático.
- **Paginación**: respetar `limit` (default 20–50); devolver `total`, `count`, `offset`, `has_more`, `next_offset`. Nunca cargar todo en memoria.
- **Annotations** por tool: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`.
- **Errores accionables**: mensajes que guíen al agente (qué filtro usar, qué falta), sin filtrar internals. Reportar como result con `isError`, no como error de protocolo.
- **`CHARACTER_LIMIT`** (~25k) con truncado + mensaje claro para respuestas grandes y alerta en exceso de caracteres usados.
- **Datos**: regla global del repo — nunca inventar entidades/campos SAP; memoria → archivos → internet (citando). Confirmar nombres del Service Layer antes de codear cada tool.
- **SAP supportability**: TODO vía Service Layer (nunca DI/DB directo). Escrituras = fase futura, con aprobación.

## 3. Contexto actual (lo que ya existe — reusar)

- `apps/web/lib/sap/session.ts` — `SAPSession`: login `POST /Login`, cookies (`B1SESSION`), expiry, re-auth. **Falta enviar `Language`** en el payload (usar 25 para español por ahora).
- `apps/web/lib/sap/client.ts` — `SAPClient`: `request()` con retry en 401, OData (`buildODataQuery`), errores tipados (`SAPNotFoundError`/`SAPValidationError`/`SAPError`). Métodos: `getItems`/`getItem` (OITM), `getBusinessPartners`/`getBusinessPartner` (OCRD).
- `apps/web/lib/sap/types.ts` — `Item`, `BusinessPartner`, `ODataParams`, `buildODataQuery`.
- `apps/web/lib/agents/tools.ts` — tools del AI SDK (`get_items`, `get_item_details`, `check_stock_levels`) que envuelven `sapClient`. (El MCP los reemplazará como fuente única.)
- `apps/web/app/api/agents/chat/route.ts` — runtime actual: AI SDK `streamText`, tools hardcodeadas, solo agente `inventory`.
- Deps relevantes: `ai@^6`, `@ai-sdk/anthropic@^3`, `@ai-sdk/google@^3`, `zod@^4`, `next@16.2.6`. **No** hay dep de MCP todavía.

## 4. Decisiones de arquitectura

**Lockeadas:**
- MCP server real, hospedado como **route handler de Next** (Streamable HTTP). No subproceso, no servicio aparte.
- **Superficie global, agentes especializados**: el MCP expone toda la superficie SAP; la especialización (qué tools, qué prompt) vive en cada agente. Debe soportar múltiples agentes especializados, eventualmente autónomos y concurrentes.
- Read-only primero. Writes después, vía SL, con aprobación.
- Auth SAP = **session manager del Service Layer** (reusar `session.ts`). Sin capa de auth propia del MCP. Login: `POST {SAP_SL_BASE_URL}/Login` con `{ CompanyDB, UserName, Password, Language }` (ej. `Language: "25"`).
- Reusar `sapClient` como capa de acceso (los tools MCP lo llaman; no se reimplementa SAP).
- **Wiring**: usar **`mcp-handler`** (Vercel) para hospedar el transport Streamable HTTP en el route handler de App Router.
- **Librería de schemas**: **Zod 4**.
- **`response_format` default = `markdown`** (eficiencia de tokens).
- **Acceso**: **interno** por ahora (detrás del auth de la app). Diseñar desde ya para **soporte futuro de clientes externos (Claude / Copilot) vía JWT** — ver Fase H.
- **Autorización**: delegada a SAP SL. Objetivo: operar bajo la **sesión SL del usuario invocante** para que SL aplique permisos por usuario (se concreta con la fase JWT; hoy, sesión de servicio).

**A verificar al implementar (Fase A) — no asumir, confirmar contra `node_modules`/docs (buscar en internet, regla del repo):**
1. **Cliente MCP del AI SDK v6**: API exacta (¿`experimental_createMCPClient`?) para que el chat route consuma el server.
2. **Forma de `inputSchema` con Zod 4 ↔ MCP SDK**: raw shape vs `ZodObject`; interoperabilidad con `zod@4` (el SDK históricamente asumía Zod 3). **Riesgo de fricción** — validar primero.
3. **Versión del MCP SDK** instalada y rutas de import (`/server/mcp.js`, `/server/streamableHttp.js`), y compatibilidad con `mcp-handler`.

## 5. Superficie SAP (read-only primero)

Operación de negocio → entidad esperada del Service Layer. **Nombres exactos de entidad/campo a CONFIRMAR contra metadata/docs del SL antes de implementar cada tool** (regla anti-invención). **Foco inicial: Compras y Ventas**; inventario es adición secundaria. Prioridad (Fase D):

**Tier 1 — Compras y Ventas (prioridad)**
| Dominio | Entidad SL (a confirmar) | Estado |
|---|---|---|
| Facturas cliente / proveedor | `Invoices` (OINV) / `PurchaseInvoices` (OPCH) | pendiente |
| Órdenes de venta / compra | `Orders` (ORDR) / `PurchaseOrders` (OPOR) | pendiente |
| Remitos | `DeliveryNotes` (ODLN) / `PurchaseDeliveryNotes` (OPDN) | pendiente |
| Pagos recibidos / efectuados | `IncomingPayments` (ORCT) / `VendorPayments` (OVPM) | pendiente |
| Listas de precios | `PriceLists` (OPLN) | pendiente — clave para el caso autónomo |
| Solicitudes (compra/venta) | `PurchaseRequests` / `Quotations` | pendiente |

**Tier 2 — Socios de negocio**
| Dominio | Entidad SL (a confirmar) | Estado |
|---|---|---|
| BP — datos maestros | `BusinessPartners` (OCRD) | client existe; falta tool MCP |
| BP — movimientos / documentos | transacciones ligadas al `CardCode` | **scoped por permiso del usuario invocante** (autorización delegada a SL — ver Fase H) |

**Tier 3 — Inventario (adición, no prioritario)**
| Dominio | Entidad SL (a confirmar) | Estado |
|---|---|---|
| Artículos | `Items` (OITM) | tool de lectura ya existe |
| Almacenes | `Warehouses` (OWHS) | pendiente |
| Movimientos de stock | `InventoryGenEntries` (OIGN) / `InventoryGenExits` (OIGE) | pendiente |
| Entregas / salidas de mercadería | `DeliveryNotes` (ODLN) / goods issues (OIGE) | pendiente |
| Transferencias entre almacenes | `StockTransfers` (OWTR) | pendiente |

## 6. Fases

### Fase A — Esqueleto del MCP server
- [ ] Verificar APIs/versión del MCP SDK y el wiring de Streamable HTTP en Next App Router (decidir `mcp-handler` vs SDK directo). Verificar compat Zod 4.
- [ ] Instalar dep(s): `@modelcontextprotocol/sdk` (+ `mcp-handler` si aplica).
- [ ] Route handler MCP (ej. `app/api/mcp/route.ts`) con `McpServer` (`name: "sap-b1-mcp-server"`) + transporte stateless.
- [ ] Tool trivial `ping` (sin SAP) con su schema/annotations.
- **Aceptación**: el endpoint responde el handshake MCP y `ping` se puede invocar (MCP Inspector: `npx @modelcontextprotocol/inspector`, o un cliente mínimo).

### Fase B — Tools SAP de lectura (sobre `sapClient`)
> Bootstrap: B usa lo que `sapClient` ya tiene (items + BPs) para validar rápido el loop MCP→runtime. La prioridad real (Compras y Ventas) se construye en la Fase D, donde se agregan los métodos nuevos al client.
- [ ] Agregar `Language` al `POST /Login` en `session.ts`.
- [ ] Estructura: `lib/mcp/` (server, tools/, schemas/, formato/paginación compartidos).
- [ ] Tools: `sap_list_items`, `sap_get_item`, `sap_check_stock`, `sap_list_business_partners`, `sap_get_business_partner` — con `response_format`, paginación, annotations (`readOnlyHint: true`, `destructiveHint: false`), errores accionables y `CHARACTER_LIMIT`.
- **Aceptación**: cada tool devuelve datos reales de SAP (cuando haya acceso) o error claro; schemas validan; sin duplicación (helpers compartidos de formato/paginación).

### Fase C — El runtime consume el MCP
- [ ] Cliente MCP en el chat route que carga las tools del server (reemplaza el import estático `inventoryTools`).
- [ ] Verificar que el agente `inventory` siga funcionando end-to-end, ahora vía MCP.
- **Aceptación**: chat con el agente inventory ejecuta tools SAP a través del MCP, con streaming intacto.

### Fase D — Ampliar superficie SAP (orden por tiers de §5)
- [ ] **Tier 1 (Compras y Ventas — prioridad)**: facturas cliente/proveedor, órdenes venta/compra, remitos, pagos recibidos/efectuados, listas de precios, solicitudes/quotations.
- [ ] **Tier 2**: BP datos maestros + movimientos/documentos del BP (scoping por permiso de usuario real depende de Fase H).
- [ ] **Tier 3 (Inventario — adición)**: almacenes, movimientos de stock, entregas/salidas, transferencias entre almacenes.
- [ ] Por cada dominio: confirmar entidad/campos del SL, sumar método en `client.ts` (si falta) + tool MCP. Incremental, read-only.
- [ ] Convenciones reutilizables de filtro/orden/paginación para listados.
- **Aceptación**: cada dominio nuevo tiene tool con inspección manual y descripción completa.

### Fase E — Integración con el Builder
- [ ] Compilar `AgentConfig` (nodos/wires) → system prompt + subconjunto de tools MCP a exponer.
- [ ] El runtime levanta esas tools del MCP según el config; "Test run" y "Publish" pasan a ser reales.
- **Aceptación**: un agente armado en el Builder ejecuta contra SAP vía MCP.

### Fase F — Escrituras (futuro)
- [ ] Tools de creación/modificación de documentos vía SL, con `destructiveHint`/aprobación (atado al toggle "Auto-aprobar escrituras" del Builder).
- [ ] Política de confirmación humana previa.

### Fase G — Evaluaciones (de la skill)
- [ ] Crear ~10 preguntas de evaluación read-only (independientes, complejas, verificables) y correrlas con el harness de `scripts/evaluation.py` de la skill.

### Fase H — Acceso externo vía JWT (futuro; diseñar desde Fase A)
- [ ] Validación de **bearer/JWT** en el endpoint MCP (OAuth 2.1 / token); aceptar solo tokens destinados a este server.
- [ ] Mapear identidad externa → **sesión SL del usuario** para que SAP aplique permisos por usuario (autorización delegada al SL; habilita el scoping del Tier 2).
- [ ] Hardening de exposición: validar `Origin`, protección DNS-rebinding, bind controlado.
- [ ] Objetivo: invocable por **Claude / Copilot** como cliente MCP remoto.
- **Nota**: la capa de auth/transport de la Fase A se estructura para enchufar esto sin reescribir.

## 7. Riesgos / cosas a vigilar

- **Zod 4 ↔ MCP SDK**: posible incompatibilidad de schema; validar en Fase A antes de avanzar.
- **App Router vs transport Node**: el adaptador correcto es clave; `mcp-handler` reduce riesgo.
- **SSL self-signed del SL** (`hanab1:50000`): `session.ts` ya contempla `NODE_TLS_REJECT_UNAUTHORIZED`/`next.config`. Confirmar en entorno real.
- **Sesión SL compartida**: el `globalSession` es singleton de servidor; ojo con concurrencia cuando haya múltiples requests/agentes (keep-alive vs expiry).
- **Acceso sin SAP real**: hasta tener acceso al SL, las tools se validan con errores controlados / datos de prueba; no inventar respuestas.

## 8. Decisiones tomadas (2026-06-01)

1. **Acceso**: interno por ahora; soporte futuro de clientes externos (Claude/Copilot) vía **JWT** (Fase H), con la capa de auth diseñada desde ya para enchufarlo.
2. **Prioridad de dominios** (Fase D): tiers en §5 — **T1 Compras y Ventas** (facturas, órdenes, remitos, pagos, listas de precios), T2 socios de negocio, T3 inventario (adición). Inventario no es prioritario; los ejemplos de inventario eran solo muestras de acceso futuro.
6. **Arquitectura global**: MCP = superficie SAP completa; especialización por agente. Visión: agentes autónomos/paralelos (carga de facturas, update de listas de precios) → el diseño soporta escrituras (Fase F) y concurrencia.
3. **`response_format` default = markdown** (más eficiente/liviano en tokens), con `json` disponible.
4. **`mcp-handler`** confirmado para el wiring en App Router.
5. **Zod 4** confirmado. Uso proactivo de internet para docs de librerías = regla del repo (`CLAUDE.md` raíz).
