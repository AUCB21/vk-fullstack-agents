# Plan: Agent Builder — Editor visual no-code para agentes

## Resumen del descubrimiento

- **Tipo**: Feature nueva — ruta independiente dentro del monorepo `apps/web`
- **Objetivo**: Un editor visual de nodos (drag-and-drop) donde el usuario construye agentes conectando bloques (triggers, LLMs, tools, memory, logic, outputs) sin escribir codigo
- **Alcance**: MVP funcional — canvas interactivo, nodos arrastrables, cables Bezier, biblioteca de nodos, inspector con configuracion/prompt, persistencia localStorage. Sin integracion al runtime de chat (Phase 1 = visual only)
- **Restricciones**: Sin dependencias externas mas alla del LLM provider. Desktop-first, mobile planificado para futuro
- **Referencia visual**: `apps/design-model/builder.jsx` + `builder.css` — mantener la estetica lo maximo posible

---

## Stack recomendado

| Capa | Tecnologia | Por que |
|------|-----------|---------|
| Canvas DnD | `@dnd-kit/core` + `@dnd-kit/utilities` | Moderna, ligera (~12KB gzip), compatible React 19, accesible (ARIA), soporte nativo para drag libre en canvas + drag desde sidebar. No tiene el bagaje de `react-dnd` ni la complejidad de `reactflow` |
| Cables SVG | SVG nativo + `<path>` cubicas | El demo ya usa Bezier cubicas manuales. Sin libreria extra — control total sobre el estilo |
| Estado del builder | `useReducer` + React Context (`BuilderProvider`) | Patron ya establecido en el proyecto (`ChatProvider`). El estado del builder (nodos, cables, seleccion, zoom, pan) es complejo pero local — `useReducer` con acciones tipadas es ideal |
| Persistencia | `localStorage` via helpers (como `chat-storage.ts`) | Consistente con el patron existente. Facil de migrar a API route + DB cuando se necesite |
| Validacion | `zod` | Ya en el proyecto. Validar schemas de nodos/cables al guardar/cargar |
| Iconos | `lucide-react` | Ya en el proyecto. Mapear los iconos del demo a equivalentes de lucide |
| Estilos | Tailwind v4 + CSS custom properties | Consistente con el proyecto. Los estilos del demo (`builder.css`) se migran a clases Tailwind donde es posible, CSS puro donde Tailwind no alcanza (canvas grid background, wire animations) |

### Por que @dnd-kit y no alternativas

| Alternativa | Descarte |
|-------------|----------|
| `reactflow` / `xyflow` | Potente pero pesado (~80KB), opinionado en layout, dificil de customizar al nivel visual del demo |
| `react-dnd` | API legacy (backends, monitors), mas complejo de tipar, menor soporte React 19 |
| `react-beautiful-dnd` | Diseñado para listas ordenadas, no para canvas libre |
| Raw pointer events | Viable pero requiere reimplementar hit testing, accesibilidad, scroll handling. @dnd-kit lo resuelve en ~12KB |

---

## Arquitectura

### Mapa de componentes

```
/builder/[agentId]  (ruta independiente, layout propio)
│
├── BuilderLayout          (grid 3 columnas: sidebar | canvas | inspector)
│   ├── BuilderSidebar     (biblioteca de nodos, busqueda, info agente)
│   ├── CanvasPane         (area principal)
│   │   ├── CanvasTopbar   (breadcrumbs, acciones: versions, share, test, publish)
│   │   ├── Canvas         (fondo con grid, nodos, cables)
│   │   │   ├── WireLayer  (SVG con curvas Bezier)
│   │   │   ├── Node[]     (nodos individuales, draggables)
│   │   │   ├── CanvasControls (zoom in/out, fit, porcentaje)
│   │   │   └── Minimap    (vista miniatura con viewport indicator)
│   │   └── RunBanner      (barra de test run, condicional)
│   └── Inspector          (panel derecho, 3 tabs)
│       ├── ConfigTab      (modelo, temperatura, max tokens, tools, behavior toggles)
│       ├── PromptTab      (system prompt editor con variables)
│       └── RunsTab        (historial de ejecuciones)
│
├── BuilderProvider        (estado global del builder via useReducer)
├── builder-storage.ts     (localStorage CRUD para agent configs)
└── builder-types.ts       (tipos TypeScript: BuilderNode, Wire, AgentConfig, etc.)
```

### Modelo de datos core

```typescript
// builder-types.ts

type NodeKind = "trigger" | "llm" | "tool" | "memory" | "condition" | "output";

type NodeRow = {
  key: string;
  value: string;
  mono?: boolean;
};

type BuilderNode = {
  id: string;
  kind: NodeKind;
  icon: string;        // lucide icon name
  name: string;
  meta: string;        // "TRIGGER" | "LLM" | "TOOL" | etc.
  x: number;
  y: number;
  rows: NodeRow[];
  status: "ok" | "warn" | "idle";
  selected?: boolean;
  // Config fields (per-kind)
  config?: Record<string, unknown>;
};

type Wire = {
  id: string;
  from: string;        // source node ID
  to: string;          // target node ID
  fromPort?: string;   // "out" default
  toPort?: string;     // "in" default
  flow?: boolean;      // animated data flow wire
};

type AgentConfig = {
  id: string;
  name: string;
  icon: string;
  version: string;     // "v0.1", "v0.2", etc.
  status: "draft" | "published";
  nodes: BuilderNode[];
  wires: Wire[];
  createdAt: number;
  updatedAt: number;
};

// Node library template (what you drag from the sidebar)
type NodeTemplate = {
  id: string;          // "trigger-chat", "llm-chat", etc.
  kind: NodeKind;
  icon: string;
  name: string;
  desc: string;
  defaultRows: NodeRow[];
  defaultConfig?: Record<string, unknown>;
};
```

### Flujo de datos

```
Usuario arrastra nodo desde sidebar
  → @dnd-kit DragOverlay + onDragEnd
  → dispatch({ type: "ADD_NODE", template, position })
  → reducer agrega nodo al state
  → Canvas re-renderiza con nuevo nodo

Usuario arrastra nodo existente en canvas
  → @dnd-kit useDraggable en cada Node
  → onDragEnd con delta
  → dispatch({ type: "MOVE_NODE", id, x, y })

Usuario conecta puertos (click out → click in)
  → dispatch({ type: "ADD_WIRE", from, to })
  → WireLayer dibuja nueva curva Bezier

Usuario selecciona nodo
  → dispatch({ type: "SELECT_NODE", id })
  → Inspector muestra config del nodo seleccionado

Auto-save (debounced 2s tras cada cambio)
  → localStorage.setItem("vk-agent-{id}", JSON.stringify(config))
```

### Estado del builder (reducer actions)

```typescript
type BuilderAction =
  | { type: "LOAD_CONFIG"; config: AgentConfig }
  | { type: "ADD_NODE"; template: NodeTemplate; x: number; y: number }
  | { type: "MOVE_NODE"; id: string; x: number; y: number }
  | { type: "SELECT_NODE"; id: string | null }
  | { type: "DELETE_NODE"; id: string }
  | { type: "UPDATE_NODE_CONFIG"; id: string; config: Record<string, unknown> }
  | { type: "UPDATE_NODE_ROWS"; id: string; rows: NodeRow[] }
  | { type: "ADD_WIRE"; from: string; to: string; flow?: boolean }
  | { type: "DELETE_WIRE"; id: string }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; x: number; y: number }
  | { type: "UNDO" }
  | { type: "REDO" };
```

### Estructura de directorios

```
apps/web/
├── app/
│   └── builder/
│       └── [agentId]/
│           ├── layout.tsx        ← Layout independiente (sin sidebar de chat)
│           └── page.tsx          ← Entry point del builder
│
├── components/
│   └── builder/
│       ├── builder-layout.tsx    ← Grid 3 columnas principal
│       ├── builder-sidebar.tsx   ← Biblioteca de nodos + busqueda
│       ├── canvas-pane.tsx       ← Contenedor del canvas + topbar
│       ├── canvas.tsx            ← Area de trabajo (grid bg, nodos, cables)
│       ├── canvas-topbar.tsx     ← Breadcrumbs + acciones
│       ├── canvas-controls.tsx   ← Zoom controls flotantes
│       ├── minimap.tsx           ← Vista miniatura
│       ├── node.tsx              ← Componente de nodo individual
│       ├── node-port.tsx         ← Puerto de conexion (in/out)
│       ├── wire-layer.tsx        ← SVG con curvas Bezier
│       ├── inspector.tsx         ← Panel derecho con tabs
│       ├── inspector-config.tsx  ← Tab de configuracion
│       ├── inspector-prompt.tsx  ← Tab de prompt editor
│       ├── inspector-runs.tsx    ← Tab de historial de runs
│       ├── library-item.tsx      ← Item draggable de la biblioteca
│       ├── run-banner.tsx        ← Banner de test run
│       └── wire-drawing.tsx      ← Wire temporal mientras el usuario conecta puertos
│
├── lib/
│   └── builder/
│       ├── builder-context.tsx   ← BuilderProvider + useBuilder hook
│       ├── builder-types.ts      ← Tipos TypeScript
│       ├── builder-storage.ts    ← localStorage CRUD
│       ├── builder-reducer.ts    ← useReducer con undo/redo
│       ├── node-library.ts       ← NODE_LIBRARY (migrado del demo)
│       ├── wire-utils.ts         ← Calculo de curvas Bezier, hit testing
│       └── builder-defaults.ts   ← Configs default por tipo de nodo
```

---

## Fases de implementacion

### Fase 0: Setup y scaffolding (~30 min) ✅

- [x] Instalar `@dnd-kit/core` y `@dnd-kit/utilities`
- [x] Crear estructura de directorios: `app/builder/[agentId]/`, `components/builder/`, `lib/builder/`
- [x] Crear `builder-types.ts` con todos los tipos TypeScript
- [x] Crear `node-library.ts` migrando `NODE_LIBRARY` del demo con iconos lucide
- [x] Crear `builder-defaults.ts` con configs default por tipo de nodo
- [x] Crear `app/builder/[agentId]/layout.tsx` — layout independiente (sin ChatProvider, con BuilderProvider)
- [x] Crear `app/builder/[agentId]/page.tsx` — shell basico que renderiza `BuilderLayout`
- [x] Verificar que `/builder/new` carga sin errores

**Archivos creados**: 8 nuevos
**Verificacion**: `next build` pasa, ruta `/builder/new` renderiza shell vacio

---

### Fase 1: Estado y persistencia (~45 min) ✅

- [x] Crear `builder-reducer.ts` — reducer con todas las acciones tipadas
- [x] Implementar undo/redo (mantener stacks de past/future states, max 50)
- [x] Crear `builder-context.tsx` — `BuilderProvider` con `useReducer`, auto-save debounced (2s)
- [x] Crear `builder-storage.ts` — funciones `saveAgentConfig`, `loadAgentConfig`, `listAgentConfigs`, `deleteAgentConfig`
- [ ] Agregar schema Zod para validar `AgentConfig` al cargar desde localStorage
- [x] Conectar `page.tsx` con `BuilderProvider` — cargar config si existe, o crear nueva

**Archivos creados**: 4 nuevos
**Verificacion**: Abrir DevTools → Application → localStorage, verificar que se guarda/carga correctamente

---

### Fase 2: Canvas y nodos estaticos (~1.5h) ✅

- [x] Crear `canvas.tsx` — div con grid background (radial-gradient dots, 22px spacing como el demo)
- [x] Crear `node.tsx` → `builder-node.tsx` — componente visual fiel al demo:
  - Header con icon-wrap (coloreado por `data-kind`), nombre, meta badge
  - Body con rows (key-value pairs, soporte `mono`)
  - Footer con status dot + last run info
  - Puertos en 4 lados (top/right/bottom/left) — componente `Port` extraido
  - Estado `selected` con accent ring
- [x] Crear `wire-layer.tsx` — SVG overlay con curvas Bezier cubicas + arrowhead markers
- [x] Crear `canvas-pane.tsx` — wrapper que contiene topbar + canvas
- [x] Renderizar `INITIAL_NODES` y `WIRES` del demo como estado inicial para testing visual
- [x] Migrar estilos relevantes de `builder.css` a Tailwind + CSS puro

**Archivos creados/modificados**: 4 componentes nuevos, 1 CSS parcial
**Verificacion**: `/builder/new` muestra canvas con nodos estaticos posicionados, cables Bezier dibujados, colores por tipo

---

### Fase 3: Drag & drop — nodos en canvas (~1.5h) ✅

- [x] Integrar `@dnd-kit/core` — `DndContext` en canvas
- [x] Hacer cada `Node` draggable con `useDraggable` — drag libre en canvas (no grid snap)
- [x] Implementar `onDragEnd` para actualizar posicion del nodo (`MOVE_NODE` action)
- [x] Sin DragOverlay — se usa `useDraggable().transform` directamente con correccion de zoom
- [x] Implementar canvas pan: Alt+click drag o middle-button drag (ref-based, zero re-renders)
- [x] Implementar zoom: Ctrl+scroll para zoom in/out (25%–200%), rAF + debounced commit
- [x] Aplicar `transform: scale(zoom) translate3d(panX, panY, 0)` al contenedor (GPU compositing)
- [x] Cables se actualizan en tiempo real durante drag via `dragOffset` prop en WireLayer

**Archivos modificados**: `canvas.tsx`, `node.tsx`, `builder-layout.tsx`
**Verificacion**: Nodos se arrastran fluidamente, cables siguen al nodo, canvas se puede panear y zoomear

---

### Fase 4: Drag from sidebar — agregar nodos (~1h) ✅

- [x] Crear `builder-sidebar.tsx` — biblioteca de nodos con busqueda, agrupados por categoria
- [x] Items draggable con icon wrap coloreado por kind
- [x] Implementar drop en canvas — `useDroppable` en el area del canvas
- [x] En `onDragEnd`: calcular posicion relativa al canvas (considerando zoom/pan) y dispatch `ADD_NODE`
- [x] Asignar ID unico a cada nodo nuevo

**Archivos creados**: 2 componentes nuevos
**Verificacion**: Arrastrar "Chat message" desde sidebar al canvas crea un nodo trigger. Buscar "SAP" filtra la biblioteca

---

### Fase 5: Conexion de cables (wiring) (~1.5h) ✅

> **Refactored**: Puertos IN/OUT reemplazados por sistema de 4 puertos (top/right/bottom/left) estilo Lucidchart. Cualquier puerto puede ser origen o destino.

- [x] Crear `port.tsx` — componente `Port` con conexion en 4 lados:
  - Click inicia wire drawing desde cualquier puerto
  - Click en puerto de otro nodo completa la conexion
  - Hover highlight con accent color, pulse animation en targets durante wiring
  - `onPointerDown` stopPropagation para evitar interferencia con @dnd-kit
- [x] Crear `wire-drawing.tsx` — cable temporal con snap-to-port:
  - Sigue al mouse en coordenadas canvas (zoom/pan corregidas)
  - Snap: detecta puerto mas cercano dentro de ~5rem, preview se bloquea al puerto
  - Indicador visual: anillo pulsante en puerto target + wire pasa de dashed a solid
  - Click mientras snapped → confirma conexion. Click en vacio → cancela.
  - ESC cancela
- [x] Crear `arrow.tsx` — componente `Arrow` para wires confirmados:
  - SVG group con hit area invisible (16px) + wire visible con arrowhead marker
  - Estados: default (muted), hover (accent + glow), selected (full accent + glow), flow (animated dash)
- [x] Validacion: no self-loops, no duplicados (incluyendo sides)
- [x] Dispatch `ADD_WIRE` con `fromSide`/`toSide` al completar
- [x] Delete wire: click en cable → seleccionar → Delete/Backspace
- [x] Crear `wire-utils.ts`:
  - `getPortPosition(node, side)` — posicion del puerto en coordenadas canvas
  - `buildBezierPathDirectional(...)` — bezier para todas las 16 combinaciones de lados
  - `inferTargetSide(...)` — determina lado target para preview dinamico
  - `resolveWireSides(wire)` — defaults para backward compat (right→left)
  - `wirePath(...)` — path completo con fan-out y drag offset
  - `isPointNearWire(...)` — hit testing para seleccion por click

**Archivos creados**: 3 nuevos (`node-port.tsx`, `wire-drawing.tsx`, `wire-utils.ts`)
**Verificacion**: Click en puerto out → mover mouse → click en puerto in crea un cable. ESC cancela. Delete borra cable seleccionado

---

### Fase 6: Inspector panel (~1.5h) ✅

- [x] Crear `inspector.tsx` — panel derecho con 3 tabs (Config, Prompt, Runs):
  - Header con icono + nombre del nodo seleccionado + meta/ID
  - Tab bar con iconos (gear, pencil, layers) + badge de count en Runs
  - Empty state cuando no hay nodo seleccionado
- [x] Tab Config integrado: modelo, temperatura (slider), max tokens, tools attached, behavior toggles
- [x] Tab Prompt integrado: textarea monospace con variables disponibles
- [x] Tab Runs integrado: lista mock con status dot, query, ID, timestamp, duracion
- [x] Conectar cambios del inspector al state via `UPDATE_NODE_CONFIG`
- [x] Estilos migrados a Tailwind + CSS custom properties

> **Nota**: Implementado como componente unico `inspector.tsx` (275 lineas) en vez de 4 archivos separados. Las 3 tabs estan integradas en un solo componente.

**Archivos creados**: 1 componente (`inspector.tsx`)
**Verificacion**: Seleccionar nodo LLM → inspector muestra modelo, temperatura, tools. Cambiar temperatura → state se actualiza → auto-save

---

### Fase 7: Canvas topbar y controles (~45 min) ✅

- [x] Crear `canvas-topbar.tsx` — barra superior del canvas:
  - Breadcrumbs: "Agents / [icon] Agent Name [badge: v0.1 · draft]"
  - Botones ghost: Versions, Share (deshabilitados en MVP, con tooltip "Proximamente")
  - Theme toggle (dark/light) — reusar logica de `useChat().theme`
  - "Test run" button (mock: muestra banner por 3.5s)
  - "Publish" button (accent color, por ahora guarda + marca status "published")
- [x] Crear `canvas-controls.tsx` — controles flotantes bottom-left:
  - Zoom in (+), zoom percentage, zoom out (-), fit-to-screen
  - Contenedor con bg-elev, border, border-radius, shadow (como demo)
  - Conectar a zoom state del builder
- [x] Crear `minimap.tsx` — vista miniatura bottom-right:
  - Nodos como rectanguitos proporcionales
  - Nodo seleccionado highlighted con accent
  - Viewport indicator (rectangulo con border accent)
  - Proporciones basadas en bounding box de todos los nodos
- [x] Crear `run-banner.tsx` — banner centrado bottom:
  - Dot animado + "Test run" + step actual + "Stop" button
  - Se muestra cuando `testing === true`, desaparece al terminar
  - Mock: simula progreso por ~3.5s pasando por los nodos
  - Boton "Detener" cancela, "Cerrar" descarta banner
  - Nodo activo resaltado con glow accent durante test

**Archivos creados**: 5 componentes nuevos
**Verificacion**: Zoom funciona, minimap refleja posiciones de nodos, test run muestra banner animado

---

### Fase 8: Seleccion, eliminacion y atajos de teclado (~45 min) ✅

- [x] Implementar seleccion de nodo: click selecciona, click en canvas vacio deselecciona
- [x] Implementar multi-seleccion: Shift+click agrega/quita de seleccion, Ctrl+A selecciona todos
- [x] Implementar eliminacion: Delete/Backspace elimina nodo(s) seleccionado(s) + sus cables
- [x] Implementar atajos de teclado:
  - `Ctrl+Z` → undo
  - `Ctrl+Shift+Z` / `Ctrl+Y` → redo
  - `Delete` / `Backspace` → eliminar seleccion
  - `Ctrl+D` → duplicar nodo seleccionado
  - `Ctrl+A` → seleccionar todos
  - `Escape` → deseleccionar / cancelar wire drawing
- [x] Agregar confirmacion para eliminar nodos que tienen cables conectados (dialogo modal)

**Archivos modificados**: `canvas.tsx`, `builder-context.tsx`, `builder-reducer.ts`
**Verificacion**: Ctrl+Z deshace, Delete borra nodo, / enfoca busqueda, Shift+click multi-selecciona

---

### Fase 9: Persistencia completa y navegacion (~1h) ✅

- [x] Implementar pagina de listado de agentes: `/builder` (sin `[agentId]`)
  - Grid de cards con agentes guardados
  - Card muestra: icono, nombre, version, status (draft/published), fecha, count de nodos
  - Boton "Nuevo agente" → genera UUID → navega a `/builder/{uuid}`
  - Click en card → navega a `/builder/{id}`
  - Delete agent (con confirmacion, dialogo modal)
  - Theme toggle (dark/light)
- [x] Implementar `builder-storage.ts` — CRUD completo: save, load, list, delete, generateId
- [x] Implementar auto-save debounced en `BuilderProvider` (2s)
- [x] Implementar carga de config desde localStorage al montar la pagina
- [x] Agregar link desde chat sidebar → `/builder` ("Agent Builder")
- [x] Agregar link desde builder sidebar → `/chat` ("Back to agents")
- [x] Guardar en `onbeforeunload` si hay cambios sin guardar
- [x] Implementar "Publicar" — cambia status a "published", guarda inmediatamente, muestra toast

**Archivos creados**: `app/builder/page.tsx`, `lib/builder/builder-storage.ts`
**Verificacion**: Crear agente → agregar nodos → cerrar pestaña → reabrir → todo se mantiene

---

### Fase 10: Pulido visual y paridad con demo (~1h) ✅

- [x] Colores por `node.kind` (trigger=amber, llm=accent, tool=emerald, memory=violet, output=coral, condition=slate)
- [x] Font sizes: 12.5px body, 10.5px subtle, 11px mono
- [x] Shadows y border-radius correctos
- [x] Animaciones:
  - Wire flow animation (`stroke-dasharray: 6 4`, animation dash)
  - Node hover: `border-color` transition
  - Node selected: accent ring glow
  - Status dot: green glow para "ok"
  - Run banner: dot pulse animation
  - Port hover: scale + accent highlight
  - Node enter: fade-in + scale animation
  - Publish toast: slide-in animation
- [x] Tema light — overrides para canvas grid, wires, ports, arrow fills
- [x] Transiciones suaves al agregar nodos (node-enter animation)
- [x] Cursor states: `default` en canvas, `grabbing` durante pan, `crosshair` durante wiring, `grab` en nodos

**Archivos modificados**: `builder.css`, `builder-node.tsx`, `canvas.tsx`
**Verificacion**: Dark y light mode correctos, animaciones suaves

---

### Fase 11 (futuro): Soporte mobile

> **No implementar en MVP.** Documentado para planificacion futura.

- [ ] Responsive layout: grid 3 columnas → stack vertical en mobile
  - Mobile: sidebar como drawer (slide-in desde izquierda, como el chat)
  - Canvas a full screen con gesture controls
  - Inspector como bottom sheet (slide-up)
- [ ] Touch gestures en canvas:
  - Pinch-to-zoom (two finger)
  - Two-finger pan
  - Long-press para seleccionar nodo
  - Tap puerto out → tap puerto in para conectar
- [ ] Biblioteca de nodos: bottom sheet con busqueda + drag hacia arriba para agregar
- [ ] Mini FAB (floating action button) para acciones rapidas: add node, undo, zoom fit
- [ ] Breakpoint: `md:` (768px) como punto de corte desktop/mobile

---

## Mapeo de iconos: demo → lucide-react

| Demo icon | Lucide equivalent | Uso |
|-----------|-------------------|-----|
| `msgsq` | `MessageSquare` | Chat message trigger, Conversation memory |
| `refresh` | `RefreshCw` | Schedule trigger |
| `ext` | `ExternalLink` | Webhook trigger, HTTP tool |
| `bot` | `Bot` | LLM completion |
| `spark` | `Sparkles` | Classifier, test run |
| `box` | `Package` | SAP Items tool |
| `cart` | `ShoppingCart` | SAP Orders tool |
| `layers` | `Layers` | BPs tool, Vector store, Versions |
| `table` | `Table` | SQL tool |
| `filter` | `GitBranch` | Branch/condition (GitBranch es mas descriptivo que Filter) |
| `send` | `Send` | Reply output |
| `check` | `CheckCircle` | Post to SAP output |
| `gear` | `Settings` | Config tab, settings |
| `pencil` | `Pencil` | Prompt tab |
| `search` | `Search` | Library search |
| `plus` | `Plus` | Add tool, zoom in |
| `x` | `X` | Remove pill |
| `share` | `Share2` | Share button |
| `sun` | `Sun` | Light theme |
| `moon` | `Moon` | Dark theme |
| `arrowup` | `ArrowUp` | Publish |
| `chev` | `ChevronLeft` | Back navigation |

---

## CSS que NO migra a Tailwind

Estos estilos requieren CSS puro (module o global) porque Tailwind no tiene utilidades directas:

```css
/* Canvas grid background */
.builder-canvas {
  background:
    radial-gradient(circle at center, var(--border) 1px, transparent 1.5px);
  background-size: 22px 22px;
}

/* Dark mode canvas override */
.theme-dark .builder-canvas {
  background:
    radial-gradient(circle at center, oklch(1 0 0 / 0.05) 1px, transparent 1.5px);
  background-size: 22px 22px;
}

/* Wire flow animation */
@keyframes wire-dash {
  to { stroke-dashoffset: -10; }
}
.wire-flow {
  stroke-dasharray: 6 4;
  animation: wire-dash 0.7s linear infinite;
}

/* Range slider custom thumb (webkit + moz) */
.builder-slider::-webkit-slider-thumb { /* ... */ }
.builder-slider::-moz-range-thumb { /* ... */ }

/* Toggle switch pseudo-element */
.builder-toggle .switch::after { /* ... */ }

/* Node kind colors via data attribute */
[data-kind="trigger"] .icon-wrap { /* amber */ }
[data-kind="llm"] .icon-wrap { /* accent */ }
[data-kind="tool"] .icon-wrap { /* emerald */ }
[data-kind="memory"] .icon-wrap { /* violet */ }
[data-kind="output"] .icon-wrap { /* coral */ }
[data-kind="condition"] .icon-wrap { /* slate */ }
```

---

## Dependencia nueva

```bash
cd apps/web && npm install @dnd-kit/core @dnd-kit/utilities
```

Impacto: ~12KB gzipped adicionales. Sin peer dependencies conflictivas con React 19.

---

## Verificacion pre-handoff

- [ ] `npx tsc --noEmit` — 0 errores en archivos nuevos
- [ ] `npm run build` — build pasa sin warnings criticos
- [ ] Ruta `/builder/new` carga y muestra layout completo
- [ ] Drag nodo desde sidebar → canvas funciona
- [ ] Drag nodo en canvas actualiza posicion + cables
- [ ] Click puerto → click puerto crea cable
- [ ] Inspector refleja config del nodo seleccionado
- [ ] Ctrl+Z deshace, Ctrl+Shift+Z rehace
- [ ] Cerrar pestaña → reabrir → estado preservado
- [ ] Dark mode y light mode correctos
- [ ] No hay `any` en archivos nuevos
- [ ] No hay secretos hardcodeados

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigacion |
|--------|-------------|------------|
| @dnd-kit incompatible con React 19 | Baja (soporta React 18+, comunidad activa) | Fallback: raw pointer events con `onPointerDown/Move/Up` |
| Performance con muchos nodos (>50) | Media | Virtualizar nodos fuera del viewport, memoizar WireLayer con `useMemo` |
| localStorage lleno (5MB limit) | Baja (configs son ~10KB cada una) | Agregar cleanup de configs viejas, warn al usuario cerca del limite |
| SVG Bezier hit testing impreciso | Media | Usar `stroke-width` ancho invisible para area clickeable, o `pointsOnPath` calculo |
| Canvas zoom/pan + DnD interaction conflicts | Media | Separar transform contexts: canvas transform en wrapper, DnD en coordenadas de canvas |

---

## Proximos pasos

Plan aprobado? Empiezo por Fase 0 (scaffolding + tipos) y Fase 1 (estado + persistencia) en paralelo.
