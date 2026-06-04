import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sapClient, SAPNotFoundError } from "../../sap/client";
import type { Warehouse, BatchNumber, ItemWarehouseInfo } from "../../sap/types";
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

// --- Formatters ---

function warehousesToMarkdown(whs: Warehouse[], meta: PaginationMeta): string {
  if (whs.length === 0) return "No warehouses found.";
  const rows = whs
    .map(
      (w) =>
        `| ${w.WarehouseCode} | ${w.WarehouseName} | ${w.Nettable === "tYES" ? "Yes" : "No"} | ${w.DropShip === "tYES" ? "Yes" : "No"} | ${w.Inactive === "tYES" ? "Inactive" : "Active"} |`,
    )
    .join("\n");
  let md = `## Warehouses (${meta.count} results, offset ${meta.offset})\n\n`;
  md += `| Code | Name | Nettable | Drop Ship | Status |\n`;
  md += `|---|---|---|---|---|\n`;
  md += rows;
  if (meta.has_more) md += `\n\n*More results. Use offset=${meta.next_offset}.*`;
  return md;
}

function batchesToMarkdown(batches: BatchNumber[], meta: PaginationMeta): string {
  if (batches.length === 0) return "No batches found matching the given criteria.";
  const rows = batches
    .map(
      (b) =>
        `| ${b.Batch ?? "-"} | ${b.ItemCode ?? "-"} | ${b.Status?.replace("bdsStatus_", "") ?? "-"} | ${b.AdmissionDate?.slice(0, 10) ?? "-"} | ${b.ExpirationDate?.slice(0, 10) ?? "-"} |`,
    )
    .join("\n");
  let md = `## Batches (${meta.count} results, offset ${meta.offset})\n\n`;
  md += `| Batch | ItemCode | Status | Admission | Expiration |\n`;
  md += `|---|---|---|---|---|\n`;
  md += rows;
  if (meta.has_more) md += `\n\n*More results. Use offset=${meta.next_offset}.*`;
  return md;
}

function warehouseStockToMarkdown(itemCode: string, stock: ItemWarehouseInfo[]): string {
  if (stock.length === 0) return `No warehouse stock found for item '${itemCode}' (all warehouses at zero).`;
  const rows = stock
    .map((w) => `| ${w.WarehouseCode} | ${w.InStock ?? 0} | ${w.Committed ?? 0} | ${w.Ordered ?? 0} |`)
    .join("\n");
  let md = `## Stock by Warehouse — ${itemCode}\n\n`;
  md += `| Warehouse | In Stock | Committed | On Order |\n`;
  md += `|---|---|---|---|\n`;
  md += rows;
  return md;
}

// --- Tools ---

export function registerWarehouseTools(server: McpServer): void {
  server.registerTool(
    "sap_list_warehouses",
    {
      title: "List SAP Warehouses",
      description: "List warehouses from SAP B1 (OWHS). Returns code, name, nettable flag, drop-ship flag, and active status.",
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(100).default(50).describe("Max records to return (default 50)"),
          offset: z.number().int().min(0).default(0).describe("Records to skip for pagination"),
          include_inactive: z.boolean().default(false).describe("Include inactive warehouses (default: false)"),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ limit, offset, include_inactive, response_format }) => {
      try {
        const filter = include_inactive ? undefined : "Inactive eq 'tNO'";
        const whs = await sapClient.getWarehouses({ top: limit, skip: offset, filter });
        const meta = paginationMeta(whs, limit, offset);

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify({ ...meta, items: whs }, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: truncateIfNeeded(warehousesToMarkdown(whs, meta)) }] };
      } catch (e) {
        return mcpErrorResult(e);
      }
    },
  );

  server.registerTool(
    "sap_list_batches",
    {
      title: "List SAP Batch Numbers",
      description:
        "List batch numbers from SAP B1 (OIBT). Filter by item code to see batches for a specific item. Returns batch number, status, and dates.",
      inputSchema: z
        .object({
          item_code: z.string().optional().describe("Filter batches by SAP item code, e.g. 'B10000'"),
          status: z
            .enum(["Released", "NotAccessible", "Locked"])
            .optional()
            .describe("Filter by batch status"),
          limit: z.number().int().min(1).max(100).default(20).describe("Max records to return (default 20)"),
          offset: z.number().int().min(0).default(0).describe("Records to skip for pagination"),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ item_code, status, limit, offset, response_format }) => {
      try {
        const parts: string[] = [];
        if (item_code) parts.push(`ItemCode eq '${item_code}'`);
        if (status) parts.push(`Status eq 'bdsStatus_${status}'`);
        const filter = parts.length > 0 ? parts.join(" and ") : undefined;

        const batches = await sapClient.getBatches({ top: limit, skip: offset, filter });
        const meta = paginationMeta(batches, limit, offset);

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify({ ...meta, items: batches }, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: truncateIfNeeded(batchesToMarkdown(batches, meta)) }] };
      } catch (e) {
        return mcpErrorResult(e, "Tip: use item_code to filter batches for a specific item.");
      }
    },
  );

  server.registerTool(
    "sap_get_item_stock_by_warehouse",
    {
      title: "Get Item Stock by Warehouse",
      description:
        "Get stock levels (in stock, committed, on order) broken down by warehouse for a specific SAP item. Only warehouses with non-zero quantities are returned.",
      inputSchema: z
        .object({
          item_code: z.string().min(1).describe("SAP item code, e.g. 'A00001'"),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ item_code, response_format }) => {
      try {
        const stock = await sapClient.getItemWarehouseStock(item_code);

        if (response_format === "json") {
          return { content: [{ type: "text" as const, text: truncateIfNeeded(JSON.stringify({ item_code, warehouses: stock }, null, 2)) }] };
        }
        return { content: [{ type: "text" as const, text: warehouseStockToMarkdown(item_code, stock) }] };
      } catch (e) {
        if (e instanceof SAPNotFoundError) {
          return mcpErrorResult(e, `Item '${item_code}' not found. Use sap_list_items to find the correct ItemCode.`);
        }
        return mcpErrorResult(e);
      }
    },
  );
}
