import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sapClient, SAPNotFoundError } from "../../sap/client";
import type { PurchaseOrder, PurchaseInvoice } from "../../sap/types";
import { paginationMeta, type PaginationMeta } from "../shared/pagination";
import { truncateIfNeeded, mcpErrorResult } from "../shared/format";

const READONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const responseFormat = z
  .enum(["markdown", "json"])
  .default("markdown")
  .describe("'markdown' (default, concise) or 'json' (full structured data)");

const docStatus = z
  .enum(["Open", "Closed"])
  .optional()
  .describe("Filter by status: 'Open' or 'Closed'");

function statusFilter(status?: "Open" | "Closed"): string | undefined {
  if (!status) return undefined;
  return `DocumentStatus eq '${status === "Open" ? "bost_Open" : "bost_Close"}'`;
}

function dateStr(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "-";
}

// --- Purchase Orders ---

function purchaseOrdersToMarkdown(orders: PurchaseOrder[], meta: PaginationMeta): string {
  if (orders.length === 0) return "No purchase orders found matching the given criteria.";
  const rows = orders
    .map(
      (o) =>
        `| ${o.DocNum} | ${o.CardCode ?? "-"} | ${o.CardName ?? "-"} | ${dateStr(o.DocDate)} | ${dateStr(o.DocDueDate)} | ${o.DocTotal.toLocaleString()} ${o.DocCurrency ?? ""} | ${o.DocumentStatus?.replace("bost_", "") ?? "-"} |`,
    )
    .join("\n");
  let md = `## Purchase Orders (${meta.count} results, offset ${meta.offset})\n\n`;
  md += `| DocNum | CardCode | Supplier | Date | Due Date | Total | Status |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  md += rows;
  if (meta.has_more) md += `\n\n*More results. Use offset=${meta.next_offset}.*`;
  return md;
}

function purchaseOrderToMarkdown(o: PurchaseOrder): string {
  return [
    `## Purchase Order #${o.DocNum} (DocEntry: ${o.DocEntry})`,
    `**Supplier**: ${o.CardCode ?? "-"} — ${o.CardName ?? "-"}`,
    `**Date**: ${dateStr(o.DocDate)}`,
    `**Due Date**: ${dateStr(o.DocDueDate)}`,
    `**Total**: ${o.DocTotal.toLocaleString()} ${o.DocCurrency ?? ""}`,
    `**Status**: ${o.DocumentStatus?.replace("bost_", "") ?? "-"}`,
    o.Comments ? `**Comments**: ${o.Comments}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// --- Purchase Invoices ---

function purchaseInvoicesToMarkdown(invoices: PurchaseInvoice[], meta: PaginationMeta): string {
  if (invoices.length === 0) return "No purchase invoices found matching the given criteria.";
  const rows = invoices
    .map((i) => {
      const balance = i.DocTotal - (i.PaidToDate ?? 0);
      return `| ${i.DocNum} | ${i.CardCode ?? "-"} | ${i.CardName ?? "-"} | ${dateStr(i.DocDate)} | ${i.DocTotal.toLocaleString()} ${i.DocCurrency ?? ""} | ${balance.toLocaleString()} | ${i.DocumentStatus?.replace("bost_", "") ?? "-"} |`;
    })
    .join("\n");
  let md = `## Purchase Invoices (${meta.count} results, offset ${meta.offset})\n\n`;
  md += `| DocNum | CardCode | Supplier | Date | Total | Balance | Status |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  md += rows;
  if (meta.has_more) md += `\n\n*More results. Use offset=${meta.next_offset}.*`;
  return md;
}

function purchaseInvoiceToMarkdown(i: PurchaseInvoice): string {
  const balance = i.DocTotal - (i.PaidToDate ?? 0);
  return [
    `## Purchase Invoice #${i.DocNum} (DocEntry: ${i.DocEntry})`,
    `**Supplier**: ${i.CardCode ?? "-"} — ${i.CardName ?? "-"}`,
    `**Date**: ${dateStr(i.DocDate)}`,
    `**Due Date**: ${dateStr(i.DocDueDate)}`,
    `**Total**: ${i.DocTotal.toLocaleString()} ${i.DocCurrency ?? ""}`,
    `**Paid**: ${(i.PaidToDate ?? 0).toLocaleString()} ${i.DocCurrency ?? ""}`,
    `**Balance**: ${balance.toLocaleString()} ${i.DocCurrency ?? ""}`,
    `**Status**: ${i.DocumentStatus?.replace("bost_", "") ?? "-"}`,
    i.Comments ? `**Comments**: ${i.Comments}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// --- Tool registration ---

export function registerPurchaseTools(server: McpServer): void {
  server.registerTool(
    "sap_list_purchase_orders",
    {
      title: "List SAP Purchase Orders",
      description:
        "List purchase orders from SAP B1 (OPOR). Filter by status, supplier, or date using OData $filter. Supports pagination.",
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(20).describe("Max records to return (default 20)"),
          offset: z.number().int().min(0).default(0).describe("Records to skip for pagination"),
          status: docStatus,
          filter: z
            .string()
            .optional()
            .describe(
              "Additional OData $filter, e.g. \"CardCode eq 'V10000'\" or \"DocDate ge '2024-01-01T00:00:00Z'\"",
            ),
          orderby: z.string().optional().describe("OData $orderby, e.g. \"DocDate desc\""),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ limit, offset, status, filter, orderby, response_format }) => {
      try {
        const parts: string[] = [];
        const sf = statusFilter(status);
        if (sf) parts.push(sf);
        if (filter) parts.push(filter);
        const combinedFilter = parts.length > 0 ? parts.join(" and ") : undefined;

        const select = "DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,DocumentStatus,Comments";
        const orders = await sapClient.getPurchaseOrders({ top: limit, skip: offset, filter: combinedFilter, orderby, select });
        const meta = paginationMeta(orders, limit, offset);

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify({ ...meta, items: orders }, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: truncateIfNeeded(purchaseOrdersToMarkdown(orders, meta)) }] };
      } catch (e) {
        return mcpErrorResult(e, "Tip: use status='Open' for pending orders.");
      }
    },
  );

  server.registerTool(
    "sap_get_purchase_order",
    {
      title: "Get SAP Purchase Order",
      description: "Get full details for a single purchase order by DocEntry or DocNum.",
      inputSchema: z
        .object({
          doc_entry: z.number().int().optional().describe("Internal document ID (DocEntry)"),
          doc_num: z.number().int().optional().describe("User-visible document number (DocNum)"),
          response_format: responseFormat,
        })
        .strict()
        .refine((d) => d.doc_entry !== undefined || d.doc_num !== undefined, {
          message: "Provide either doc_entry or doc_num",
        }),
      annotations: READONLY,
    },
    async ({ doc_entry, doc_num, response_format }) => {
      try {
        let order: PurchaseOrder;
        if (doc_entry !== undefined) {
          order = await sapClient.getPurchaseOrder(doc_entry);
        } else {
          const results = await sapClient.getPurchaseOrders({ filter: `DocNum eq ${doc_num}`, top: 1 });
          if (results.length === 0) {
            return mcpErrorResult(new Error(`Purchase order DocNum=${doc_num} not found.`), "Use sap_list_purchase_orders to browse.");
          }
          order = results[0];
        }

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify(order, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: purchaseOrderToMarkdown(order) }] };
      } catch (e) {
        if (e instanceof SAPNotFoundError) {
          return mcpErrorResult(e, "Use sap_list_purchase_orders to find the correct DocEntry or DocNum.");
        }
        return mcpErrorResult(e);
      }
    },
  );

  server.registerTool(
    "sap_list_purchase_invoices",
    {
      title: "List SAP Purchase Invoices",
      description:
        "List purchase (vendor) invoices from SAP B1 (OPCH). Shows total, paid amount, and balance due. Filter by status, supplier, or date.",
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(20).describe("Max records to return (default 20)"),
          offset: z.number().int().min(0).default(0).describe("Records to skip for pagination"),
          status: docStatus,
          filter: z.string().optional().describe("Additional OData $filter, e.g. \"CardCode eq 'V10000'\""),
          orderby: z.string().optional().describe("OData $orderby, e.g. \"DocDate desc\""),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ limit, offset, status, filter, orderby, response_format }) => {
      try {
        const parts: string[] = [];
        const sf = statusFilter(status);
        if (sf) parts.push(sf);
        if (filter) parts.push(filter);
        const combinedFilter = parts.length > 0 ? parts.join(" and ") : undefined;

        const select = "DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,PaidToDate,DocCurrency,DocumentStatus,Comments";
        const invoices = await sapClient.getPurchaseInvoices({ top: limit, skip: offset, filter: combinedFilter, orderby, select });
        const meta = paginationMeta(invoices, limit, offset);

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify({ ...meta, items: invoices }, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: truncateIfNeeded(purchaseInvoicesToMarkdown(invoices, meta)) }] };
      } catch (e) {
        return mcpErrorResult(e);
      }
    },
  );

  server.registerTool(
    "sap_get_purchase_invoice",
    {
      title: "Get SAP Purchase Invoice",
      description: "Get full details for a single purchase invoice by DocEntry or DocNum, including payment balance.",
      inputSchema: z
        .object({
          doc_entry: z.number().int().optional().describe("Internal document ID (DocEntry)"),
          doc_num: z.number().int().optional().describe("User-visible document number (DocNum)"),
          response_format: responseFormat,
        })
        .strict()
        .refine((d) => d.doc_entry !== undefined || d.doc_num !== undefined, {
          message: "Provide either doc_entry or doc_num",
        }),
      annotations: READONLY,
    },
    async ({ doc_entry, doc_num, response_format }) => {
      try {
        let invoice: PurchaseInvoice;
        if (doc_entry !== undefined) {
          invoice = await sapClient.getPurchaseInvoice(doc_entry);
        } else {
          const results = await sapClient.getPurchaseInvoices({ filter: `DocNum eq ${doc_num}`, top: 1 });
          if (results.length === 0) {
            return mcpErrorResult(new Error(`Purchase invoice DocNum=${doc_num} not found.`), "Use sap_list_purchase_invoices to browse.");
          }
          invoice = results[0];
        }

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify(invoice, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: purchaseInvoiceToMarkdown(invoice) }] };
      } catch (e) {
        if (e instanceof SAPNotFoundError) {
          return mcpErrorResult(e, "Use sap_list_purchase_invoices to find the correct DocEntry or DocNum.");
        }
        return mcpErrorResult(e);
      }
    },
  );
}
