// Mock SAP Business One data — uses real B1 schema conventions
// (ItemCode, CardCode, DocNum, OnHand, ItemName, etc.)

export type AgentDef = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  color: string;
};

export type ItemRow = {
  ItemCode: string;
  ItemName: string;
  OnHand: number;
  Committed: number;
  Ordered: number;
  AvgPrice: number;
  Whs: string;
  Status: "ok" | "warn" | "err";
};

export type SalesOrder = {
  DocNum: string;
  CardCode: string;
  CustomerName: string;
  DocDate: string;
  DocTotal: number;
  DocStatus: string;
  LineCount: number;
};

export type PurchaseOrder = {
  DocNum: string;
  CardCode: string;
  VendorName: string;
  DocDate: string;
  DocTotal: number;
  DocStatus: string;
  ETA: string;
};

export type RecentChat = {
  id: string;
  title: string;
  agent: string;
  when: string;
};

export type KPI = {
  l: string;
  v: string;
  d: string;
  up: boolean;
};

export type WeeklyMovement = {
  week: string;
  inbound: number;
  outbound: number;
};

export const AGENTS: AgentDef[] = [
  { id: "inventory", name: "Inventario", icon: "box", desc: "Niveles de stock, maestro de articulos, transferencias", color: "gold" },
  { id: "sales", name: "Ventas", icon: "cart", desc: "Ordenes de venta, entregas, facturas", color: "green" },
  { id: "purchasing", name: "Compras", icon: "truck", desc: "Ordenes de compra, recepciones, proveedores", color: "blue" },
  { id: "general", name: "Consultas Generales", icon: "sparkles", desc: "Investigacion, analisis y asistencia general", color: "slate" },
];

export const ITEMS: ItemRow[] = [
  { ItemCode: "A0001", ItemName: "Hex Bolt M8 x 40mm — Zinc", OnHand: 1240, Committed: 84, Ordered: 500, AvgPrice: 0.42, Whs: "01-MAIN", Status: "ok" },
  { ItemCode: "A0002", ItemName: "Hex Bolt M10 x 60mm — Stainless", OnHand: 42, Committed: 120, Ordered: 0, AvgPrice: 1.18, Whs: "01-MAIN", Status: "warn" },
  { ItemCode: "A0017", ItemName: "Bearing 6204-2RS", OnHand: 8, Committed: 24, Ordered: 200, AvgPrice: 4.85, Whs: "01-MAIN", Status: "err" },
  { ItemCode: "B1102", ItemName: "Conveyor Belt 2m — Standard", OnHand: 62, Committed: 8, Ordered: 0, AvgPrice: 145.0, Whs: "02-PROD", Status: "ok" },
  { ItemCode: "C2210", ItemName: "Lubricant SAE-30 5L", OnHand: 186, Committed: 12, Ordered: 100, AvgPrice: 12.40, Whs: "01-MAIN", Status: "ok" },
  { ItemCode: "D3401", ItemName: "Steel Plate 4mm x 1m x 2m", OnHand: 14, Committed: 4, Ordered: 20, AvgPrice: 78.50, Whs: "02-PROD", Status: "warn" },
];

export const SALES_ORDERS: SalesOrder[] = [
  { DocNum: "SO-104821", CardCode: "C20410", CustomerName: "Northwind Industries Ltd.", DocDate: "2026-05-04", DocTotal: 18420.50, DocStatus: "Open", LineCount: 12 },
  { DocNum: "SO-104822", CardCode: "C20455", CustomerName: "Pacific Fasteners Co.", DocDate: "2026-05-05", DocTotal: 3680.00, DocStatus: "Open", LineCount: 4 },
  { DocNum: "SO-104823", CardCode: "C20312", CustomerName: "Meridian Manufacturing", DocDate: "2026-05-06", DocTotal: 42100.00, DocStatus: "Open", LineCount: 28 },
  { DocNum: "SO-104825", CardCode: "C20410", CustomerName: "Northwind Industries Ltd.", DocDate: "2026-05-07", DocTotal: 1240.00, DocStatus: "Closed", LineCount: 3 },
];

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { DocNum: "PO-30418", CardCode: "V10122", VendorName: "Acme Hardware Supply", DocDate: "2026-05-02", DocTotal: 8450.00, DocStatus: "Open", ETA: "2026-05-12" },
  { DocNum: "PO-30419", CardCode: "V10145", VendorName: "Bearings Direct GmbH", DocDate: "2026-05-03", DocTotal: 970.00, DocStatus: "Open", ETA: "2026-05-15" },
  { DocNum: "PO-30420", CardCode: "V10208", VendorName: "Pacific Steel Mills", DocDate: "2026-05-06", DocTotal: 24200.00, DocStatus: "Approved", ETA: "2026-05-22" },
];

export const RECENT_CHATS: RecentChat[] = [
  { id: "r1", title: "Reorder for low-stock fasteners", agent: "purchasing", when: "2h" },
  { id: "r2", title: "Top 10 SKUs by margin Apr 2026", agent: "sales", when: "yesterday" },
  { id: "r3", title: "Stock transfer 02-PROD to 01-MAIN", agent: "inventory", when: "2d" },
  { id: "r4", title: "Vendor lead times Q2", agent: "purchasing", when: "1w" },
];

export const INVENTORY_KPIS: KPI[] = [
  { l: "SKUs", v: "2,841", d: "+18 this week", up: true },
  { l: "Below reorder", v: "37", d: "+6 vs. last wk", up: false },
  { l: "Stock value", v: "$1.84M", d: "+2.1% MoM", up: true },
  { l: "Turn (rolling)", v: "6.2x", d: "-0.3 vs. Q1", up: false },
];

export const WEEKLY_MOVEMENTS: WeeklyMovement[] = [
  { week: "W14", inbound: 420, outbound: 380 },
  { week: "W15", inbound: 510, outbound: 410 },
  { week: "W16", inbound: 380, outbound: 470 },
  { week: "W17", inbound: 620, outbound: 540 },
  { week: "W18", inbound: 540, outbound: 580 },
  { week: "W19", inbound: 480, outbound: 510 },
];

export const AGENT_TABLES: Record<string, string> = {
  inventory: "OITM, OITW, OINM",
  sales: "ORDR, OINV, OCRD",
  purchasing: "OPOR, OITM, OCRD",
  general: "",
};
