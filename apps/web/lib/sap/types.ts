import { z } from "zod";

export const ItemSchema = z.object({
  ItemCode: z.string(),
  ItemName: z.string(),
  QuantityOnStock: z.number().default(0),
  QuantityOrdered: z.number().default(0),
  ItemGroupCode: z.number().nullable().optional(),
  PriceList: z.number().nullable().optional(),
  Manufacturer: z.number().nullable().optional(),
  Valid: z.string().nullable().optional(),
});

export type Item = z.infer<typeof ItemSchema>;

export const BusinessPartnerSchema = z.object({
  CardCode: z.string(),
  CardName: z.string(),
  CardType: z.string().default("C"), // C=Customer, S=Supplier, L=Lead
  Phone1: z.string().nullable().optional(),
  EmailAddress: z.string().nullable().optional(),
  FederalTaxID: z.string().nullable().optional(),
  Valid: z.string().nullable().optional(),
});

export type BusinessPartner = z.infer<typeof BusinessPartnerSchema>;

export interface ODataParams {
  filter?: string;
  select?: string;
  top?: number;
  skip?: number;
  orderby?: string;
}

// --- Warehouses ---

export const WarehouseSchema = z.object({
  WarehouseCode: z.string(),
  WarehouseName: z.string(),
  Nettable: z.string().optional(), // tYES | tNO
  Inactive: z.string().optional(), // tYES | tNO
  DropShip: z.string().optional(), // tYES | tNO
});

export type Warehouse = z.infer<typeof WarehouseSchema>;

// --- Batch Numbers ---

export const BatchNumberSchema = z.object({
  DocEntry: z.number(),
  ItemCode: z.string().optional(),
  ItemDescription: z.string().optional(),
  Batch: z.string().optional(),
  Status: z.string().optional(), // bdsStatus_Released | bdsStatus_NotAccessible | bdsStatus_Locked
  AdmissionDate: z.string().nullable().optional(),
  ManufacturingDate: z.string().nullable().optional(),
  ExpirationDate: z.string().nullable().optional(),
});

export type BatchNumber = z.infer<typeof BatchNumberSchema>;

// --- Item Warehouse Stock ---

export const ItemWarehouseInfoSchema = z.object({
  WarehouseCode: z.string(),
  InStock: z.number().default(0),
  Committed: z.number().default(0),
  Ordered: z.number().default(0),
});

export type ItemWarehouseInfo = z.infer<typeof ItemWarehouseInfoSchema>;

// --- Sales / Purchase Documents (Orders, Invoices) ---

export const SapDocumentSchema = z.object({
  DocEntry: z.number(),
  DocNum: z.number(),
  DocDate: z.string().nullable().optional(),
  DocDueDate: z.string().nullable().optional(),
  CardCode: z.string().optional(),
  CardName: z.string().optional(),
  DocTotal: z.number().default(0),
  DocCurrency: z.string().optional(),
  DocumentStatus: z.string().optional(), // bost_Open | bost_Close
  Comments: z.string().nullable().optional(),
});

export type SapDocument = z.infer<typeof SapDocumentSchema>;

export const SalesOrderSchema = SapDocumentSchema.extend({
  SalesPersonCode: z.number().nullable().optional(),
});
export type SalesOrder = z.infer<typeof SalesOrderSchema>;

export const InvoiceSchema = SapDocumentSchema.extend({
  PaidToDate: z.number().default(0),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const PurchaseOrderSchema = SapDocumentSchema;
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const PurchaseInvoiceSchema = SapDocumentSchema.extend({
  PaidToDate: z.number().default(0),
});
export type PurchaseInvoice = z.infer<typeof PurchaseInvoiceSchema>;

export function buildODataQuery(params?: ODataParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams;

  if (params.filter) searchParams.append("$filter", params.filter);
  if (params.select) searchParams.append("$select", params.select);
  if (params.top !== undefined) searchParams.append("$top", params.top.toString());
  if (params.skip !== undefined) searchParams.append("$skip", params.skip.toString());
  if (params.orderby) searchParams.append("$orderby", params.orderby);

  return searchParams;
}
