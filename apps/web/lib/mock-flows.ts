// Scripted conversation flows and suggestion cards
// Ported from design model chat.jsx + app.jsx

export type TextChunk = string | { cite: string; kind: "item" | "vendor" };

export type FlowStep =
  | { type: "thinking"; text: string; ms: number }
  | { type: "tool"; verb: string; path: string; params: string; result: string; ms: string; status: "running"; finalStatus: "done"; delay: number }
  | { type: "stream"; chunks: TextChunk[] }
  | { type: "table" }
  | { type: "kpis" }
  | { type: "chart" }
  | { type: "draft-po" };

export type ScriptedFlow = {
  user: string;
  steps: FlowStep[];
};

export type Suggestion = {
  label: string;
  q: string;
  flow: string;
  icon: string;
};

export const SCRIPTED_FLOWS: Record<string, ScriptedFlow> = {
  "stock-low": {
    user: "Mostr\u00e1 los articulos por debajo del punto de reorden en el deposito principal",
    steps: [
      { type: "thinking", text: "Analyzing inventory levels\u2026", ms: 700 },
      {
        type: "tool", verb: "GET",
        path: "/Items?$filter=OnHand lt MinStock&$select=ItemCode,ItemName,OnHand,Committed,OrderedQty",
        params: "ItemCode, ItemName, OnHand, Committed, OrderedQty",
        result: "6 items returned \u00b7 cached 12s",
        ms: "412ms", status: "running", finalStatus: "done", delay: 900,
      },
      {
        type: "tool", verb: "GET",
        path: "/Warehouses('01-MAIN')",
        params: "WarehouseCode, WarehouseName",
        result: "01-MAIN \u00b7 Main Warehouse",
        ms: "118ms", status: "running", finalStatus: "done", delay: 500,
      },
      {
        type: "stream",
        chunks: [
          "Found ", "**6 items** below reorder point in `01-MAIN`. ",
          "Three are critical (committed exceeds on-hand). ",
          "Combined committed shortfall is **94 units**, est. cost to backorder is **$8,420**.",
        ],
      },
      { type: "table" },
      {
        type: "stream",
        chunks: [
          "\n\n**Recommendation**: Generate a draft PO to ",
          { cite: "V10145", kind: "vendor" },
          " for ",
          { cite: "A0017", kind: "item" },
          " (Bearings Direct GmbH, lead time 9 days).",
        ],
      },
    ],
  },

  "kpis": {
    user: "Panorama de salud del inventario de esta semana",
    steps: [
      { type: "thinking", text: "Aggregating metrics across warehouses\u2026", ms: 600 },
      {
        type: "tool", verb: "POST",
        path: "/sql/InventoryHealth",
        params: "fromDate=2026-04-01, toDate=2026-05-08",
        result: "4 KPIs \u00b7 6 weekly buckets",
        ms: "684ms", status: "running", finalStatus: "done", delay: 800,
      },
      { type: "stream", chunks: ["Here\u2019s where things stand as of today:"] },
      { type: "kpis" },
      { type: "chart" },
      {
        type: "stream",
        chunks: [
          "\n\nInbound is recovering after the W16 dip. Outbound is trending above receipts \u2014 ",
          "if this continues, expect **3\u20134 more SKUs to drop below reorder** by W20.",
        ],
      },
    ],
  },

  "po-draft": {
    user: "Arm\u00e1 una orden de compra para reponer rodamientos con nuestro proveedor habitual",
    steps: [
      { type: "thinking", text: "Looking up vendor and item history\u2026", ms: 700 },
      {
        type: "tool", verb: "GET",
        path: "/Items('A0017')/PurchaseHistory",
        params: "Top: 5",
        result: "Last 5 POs \u00b7 avg unit $4.78 \u00b7 avg lead 9d",
        ms: "287ms", status: "running", finalStatus: "done", delay: 700,
      },
      {
        type: "tool", verb: "GET",
        path: "/BusinessPartners('V10145')",
        params: "CardCode, CardName, Currency, ShipToDefault",
        result: "Bearings Direct GmbH \u00b7 EUR \u00b7 DE-10115",
        ms: "152ms", status: "running", finalStatus: "done", delay: 500,
      },
      {
        type: "stream",
        chunks: [
          "Drafted PO for **200 units** of ",
          { cite: "A0017", kind: "item" },
          " at est. **\u20ac956.00** to ",
          { cite: "V10145", kind: "vendor" },
          ". Ready to review \u2014 note this is a draft, not posted to SAP yet.",
        ],
      },
      { type: "draft-po" },
    ],
  },
};

export const SUGGESTIONS: Record<string, Suggestion[]> = {
  inventory: [
    { label: "Estado de stock", q: "Mostr\u00e1 los articulos por debajo del punto de reorden en el deposito principal", flow: "stock-low", icon: "table" },
    { label: "Indicadores", q: "Panorama de salud del inventario de esta semana", flow: "kpis", icon: "chart" },
    { label: "Accion", q: "Arm\u00e1 una orden de compra para reponer rodamientos con nuestro proveedor habitual", flow: "po-draft", icon: "pencil" },
    { label: "Busqueda", q: "\u00bfD\u00f3nde est\u00e1 el ItemCode A0017 y cu\u00e1l es el historial de reorden?", flow: "stock-low", icon: "search" },
  ],
  sales: [
    { label: "Ordenes abiertas", q: "Mostr\u00e1 las ordenes de venta abiertas de esta semana, ordenadas por monto", flow: "stock-low", icon: "table" },
    { label: "Top clientes", q: "Top 10 clientes por facturacion del mes", flow: "kpis", icon: "chart" },
    { label: "Antiguedad", q: "Antiguedad de cuentas por cobrar \u2014 \u00bfalgo mayor a 60 dias?", flow: "kpis", icon: "chart" },
    { label: "Busqueda", q: "Busc\u00e1 el historial de ventas para CardCode C20410", flow: "stock-low", icon: "search" },
  ],
  purchasing: [
    { label: "OC abiertas", q: "List\u00e1 las ordenes de compra abiertas y sus fechas de entrega", flow: "stock-low", icon: "table" },
    { label: "Rendimiento", q: "Tasa de entrega a tiempo de proveedores, ultimos 90 dias", flow: "kpis", icon: "chart" },
    { label: "Accion", q: "Arm\u00e1 una orden de compra para reponer rodamientos con nuestro proveedor habitual", flow: "po-draft", icon: "pencil" },
    { label: "Busqueda", q: "Mostr\u00e1 las ultimas 5 OC del proveedor V10145", flow: "stock-low", icon: "search" },
  ],
  general: [
    { label: "Analisis", q: "Analiz\u00e1 las tendencias de ventas del ultimo trimestre", flow: "stock-low", icon: "chart" },
    { label: "Redaccion", q: "Redact\u00e1 un email profesional para un proveedor sobre retrasos en entregas", flow: "stock-low", icon: "pencil" },
    { label: "Calculo", q: "Calcul\u00e1 el margen de ganancia si el costo es $45 y el precio de venta es $78", flow: "stock-low", icon: "table" },
    { label: "Consulta", q: "Explic\u00e1 la diferencia entre FIFO y promedio ponderado para valuacion de inventario", flow: "stock-low", icon: "search" },
  ],
};
