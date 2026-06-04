import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sapClient, SAPNotFoundError } from "../../sap/client";
import type { SalesOrder, Invoice } from "../../sap/types";
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
  if (!iso) return "-";
  return iso.slice(0, 10);
}

// --- Sales Orders ---

function ordersToMarkdown(orders: SalesOrder[], meta: PaginationMeta): string {
  if (orders.length === 0) return "No sales orders found matching the given criteria.";
  const rows = orders
    .map(
      (o) =>
        `| ${o.DocNum} | ${o.CardCode ?? "-"} | ${o.CardName ?? "-"} | ${dateStr(o.DocDate)} | ${dateStr(o.DocDueDate)} | ${o.DocTotal.toLocaleString()} ${o.DocCurrency ?? ""} | ${o.DocumentStatus?.replace("bost_", "") ?? "-"} |`,
    )
    .join("\n");
  let md = `## Sales Orders (${meta.count} results, offset ${meta.offset})\n\n`;
  md += `| DocNum | CardCode | Customer | Date | Due Date | Total | Status |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  md += rows;
  if (meta.has_more) md += `\n\n*More results. Use offset=${meta.next_offset}.*`;
  return md;
}

function orderToMarkdown(o: SalesOrder): string {
  return [
    `## Sales Order #${o.DocNum} (DocEntry: ${o.DocEntry})`,
    `**Customer**: ${o.CardCode ?? "-"} — ${o.CardName ?? "-"}`,
    `**Date**: ${dateStr(o.DocDate)}`,
    `**Due Date**: ${dateStr(o.DocDueDate)}`,
    `**Total**: ${o.DocTotal.toLocaleString()} ${o.DocCurrency ?? ""}`,
    `**Status**: ${o.DocumentStatus?.replace("bost_", "") ?? "-"}`,
    o.Comments ? `**Comments**: ${o.Comments}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

// --- Invoices ---

function invoicesToMarkdown(invoices: Invoice[], meta: PaginationMeta): string {
  if (invoices.length === 0) return "No invoices found matching the given criteria.";
  const rows = invoices
    .map(
      (i) => {
        const balance = i.DocTotal - (i.PaidToDate ?? 0);
        return `| ${i.DocNum} | ${i.CardCode ?? "-"} | ${i.CardName ?? "-"} | ${dateStr(i.DocDate)} | ${i.DocTotal.toLocaleString()} ${i.DocCurrency ?? ""} | ${balance.toLocaleString()} | ${i.DocumentStatus?.replace("bost_", "") ?? "-"} |`;
      }
    )
    .join("\n");
  let md = `## Invoices (${meta.count} results, offset ${meta.offset})\n\n`;
  md += `| DocNum | CardCode | Customer | Date | Total | Balance | Status |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  md += rows;
  if (meta.has_more) md += `\n\n*More results. Use offset=${meta.next_offset}.*`;
  return md;
}

function invoiceToMarkdown(i: Invoice): string {
  const balance = i.DocTotal - (i.PaidToDate ?? 0);
  return [
    `## Invoice #${i.DocNum} (DocEntry: ${i.DocEntry})`,
    `**Customer**: ${i.CardCode ?? "-"} — ${i.CardName ?? "-"}`,
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

export function registerSalesTools(server: McpServer): void {
  server.registerTool(
    "sap_list_sales_orders",
    {
      title: "List SAP Sales Orders",
      description:
        "List sales orders from SAP B1 (ORDR). Filter by status, customer, and date range using OData $filter. Supports pagination.",
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(20).describe("Max records to return (default 20)"),
          offset: z.number().int().min(0).default(0).describe("Records to skip for pagination"),
          status: docStatus,
          filter: z
            .string()
            .optional()
            .describe(
              "Additional OData $filter, e.g. \"CardCode eq 'C20000'\" or \"DocDate ge '2024-01-01T00:00:00Z'\"",
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

        const select = "DocEntry,DocNum,DocDate,DocDueDate,CardCode,CardName,DocTotal,DocCurrency,DocumentStatus,Comments,SalesPersonCode";
        const orders = await sapClient.getSalesOrders({ top: limit, skip: offset, filter: combinedFilter, orderby, select });
        const meta = paginationMeta(orders, limit, offset);

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify({ ...meta, items: orders }, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: truncateIfNeeded(ordersToMarkdown(orders, meta)) }] };
      } catch (e) {
        return mcpErrorResult(e, "Tip: use status='Open' for pending orders. Filter dates with \"DocDate ge '2024-01-01T00:00:00Z'\".");
      }
    },
  );

  server.registerTool(
    "sap_get_sales_order",
    {
      title: "Get SAP Sales Order",
      description: "Get full details for a single sales order by DocEntry (internal ID) or DocNum (user-visible number).",
      inputSchema: z
        .object({
          doc_entry: z.number().int().optional().describe("Internal document ID (DocEntry). Use this if you have it."),
          doc_num: z.number().int().optional().describe("User-visible document number (DocNum). Will search if doc_entry not provided."),
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
        let order: SalesOrder;
        if (doc_entry !== undefined) {
          order = await sapClient.getSalesOrder(doc_entry);
        } else {
          const results = await sapClient.getSalesOrders({
            filter: `DocNum eq ${doc_num}`,
            top: 1,
          });
          if (results.length === 0) {
            return mcpErrorResult(new Error(`Sales order DocNum=${doc_num} not found.`), "Use sap_list_sales_orders to browse.");
          }
          order = results[0];
        }

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify(order, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: orderToMarkdown(order) }] };
      } catch (e) {
        if (e instanceof SAPNotFoundError) {
          return mcpErrorResult(e, "Use sap_list_sales_orders to find the correct DocEntry or DocNum.");
        }
        return mcpErrorResult(e);
      }
    },
  );

  server.registerTool(
    "sap_list_invoices",
    {
      title: "List SAP Customer Invoices",
      description:
        "List customer invoices from SAP B1 (OINV). Shows total, paid amount, and balance. Filter by status, customer, or date.",
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(20).describe("Max records to return (default 20)"),
          offset: z.number().int().min(0).default(0).describe("Records to skip for pagination"),
          status: docStatus,
          filter: z
            .string()
            .optional()
            .describe("Additional OData $filter, e.g. \"CardCode eq 'C20000'\""),
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
        const invoices = await sapClient.getInvoices({ top: limit, skip: offset, filter: combinedFilter, orderby, select });
        const meta = paginationMeta(invoices, limit, offset);

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify({ ...meta, items: invoices }, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: truncateIfNeeded(invoicesToMarkdown(invoices, meta)) }] };
      } catch (e) {
        return mcpErrorResult(e);
      }
    },
  );

  server.registerTool(
    "sap_get_invoice",
    {
      title: "Get SAP Customer Invoice",
      description: "Get full details for a single customer invoice by DocEntry or DocNum, including payment balance.",
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
        let invoice: Invoice;
        if (doc_entry !== undefined) {
          invoice = await sapClient.getInvoice(doc_entry);
        } else {
          const results = await sapClient.getInvoices({ filter: `DocNum eq ${doc_num}`, top: 1 });
          if (results.length === 0) {
            return mcpErrorResult(new Error(`Invoice DocNum=${doc_num} not found.`), "Use sap_list_invoices to browse.");
          }
          invoice = results[0];
        }

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify(invoice, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: invoiceToMarkdown(invoice) }] };
      } catch (e) {
        if (e instanceof SAPNotFoundError) {
          return mcpErrorResult(e, "Use sap_list_invoices to find the correct DocEntry or DocNum.");
        }
        return mcpErrorResult(e);
      }
    },
  );
}
