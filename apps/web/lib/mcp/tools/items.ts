import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sapClient, SAPNotFoundError } from "../../sap/client";
import type { Item } from "../../sap/types";
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

function itemsToMarkdown(
  items: Item[],
  meta: PaginationMeta,
): string {
  if (items.length === 0) return "No items found matching the given criteria.";

  const rows = items
    .map(
      (i) =>
        `| ${i.ItemCode} | ${i.ItemName} | ${i.QuantityOnStock ?? 0} | ${i.QuantityOrdered ?? 0} | ${i.Valid ?? "Y"} |`,
    )
    .join("\n");

  let md = `## Items (${meta.count} results, offset ${meta.offset})\n\n`;
  md += `| ItemCode | Name | In Stock | On Order | Valid |\n`;
  md += `|---|---|---|---|---|\n`;
  md += rows;

  if (meta.has_more) {
    md += `\n\n*More results available. Use offset=${meta.next_offset} to get the next page.*`;
  }

  return md;
}

function itemToMarkdown(item: Item): string {
  return [
    `## Item: ${item.ItemCode}`,
    `**Name**: ${item.ItemName}`,
    `**In Stock**: ${item.QuantityOnStock ?? 0}`,
    `**On Order**: ${item.QuantityOrdered ?? 0}`,
    `**Valid**: ${item.Valid ?? "Y"}`,
    item.ItemGroupCode != null ? `**Group Code**: ${item.ItemGroupCode}` : null,
    item.Manufacturer != null ? `**Manufacturer**: ${item.Manufacturer}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function registerItemTools(server: McpServer): void {
  server.registerTool(
    "sap_list_items",
    {
      title: "List SAP Items",
      description:
        "List items from the SAP B1 item master (OITM). Supports OData $filter, $orderby, and pagination. Default limit is 20.",
      inputSchema: z
        .object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20)
            .describe("Max items to return (1–100, default 20)"),
          offset: z
            .number()
            .int()
            .min(0)
            .default(0)
            .describe("Items to skip for pagination (default 0)"),
          filter: z
            .string()
            .optional()
            .describe(
              "OData $filter expression, e.g. \"QuantityOnStock lt 10\" or \"ItemName eq 'Widget'\"",
            ),
          select: z
            .string()
            .optional()
            .describe(
              "Comma-separated fields to return, e.g. \"ItemCode,ItemName,QuantityOnStock\"",
            ),
          orderby: z
            .string()
            .optional()
            .describe(
              "OData $orderby, e.g. \"ItemName asc\" or \"QuantityOnStock desc\"",
            ),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ limit, offset, filter, select, orderby, response_format }) => {
      try {
        const items = await sapClient.getItems({
          top: limit,
          skip: offset,
          filter,
          select,
          orderby,
        });
        const meta = paginationMeta(items, limit, offset);

        if (response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: truncateIfNeeded(
                  JSON.stringify({ ...meta, items }, null, 2),
                ),
              },
            ],
          };
        }

        return {
          content: [
            { type: "text" as const, text: truncateIfNeeded(itemsToMarkdown(items, meta)) },
          ],
        };
      } catch (e) {
        return mcpErrorResult(
          e,
          'Tip: check your $filter syntax. Example: "QuantityOnStock lt 10"',
        );
      }
    },
  );

  server.registerTool(
    "sap_get_item",
    {
      title: "Get SAP Item",
      description:
        "Get full details for a single item by ItemCode from SAP B1 item master (OITM).",
      inputSchema: z
        .object({
          item_code: z
            .string()
            .min(1)
            .describe("SAP item code, e.g. 'A00001'"),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ item_code, response_format }) => {
      try {
        const item = await sapClient.getItem(item_code);

        if (response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: truncateIfNeeded(JSON.stringify(item, null, 2)),
              },
            ],
          };
        }

        return {
          content: [{ type: "text" as const, text: itemToMarkdown(item) }],
        };
      } catch (e) {
        if (e instanceof SAPNotFoundError) {
          return mcpErrorResult(
            e,
            `Item '${item_code}' not found. Use sap_list_items to browse available items and find the correct ItemCode.`,
          );
        }
        return mcpErrorResult(e);
      }
    },
  );

  server.registerTool(
    "sap_check_stock",
    {
      title: "Check Stock Levels",
      description:
        "List items with QuantityOnStock below a given threshold, ordered by stock ascending. Use to identify low-stock or out-of-stock items.",
      inputSchema: z
        .object({
          min_stock: z
            .number()
            .int()
            .min(0)
            .describe(
              "Items with QuantityOnStock below this value are returned",
            ),
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20)
            .describe("Max items to return (default 20)"),
          offset: z
            .number()
            .int()
            .min(0)
            .default(0)
            .describe("Items to skip for pagination"),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ min_stock, limit, offset, response_format }) => {
      try {
        const items = await sapClient.getItems({
          filter: `QuantityOnStock lt ${min_stock}`,
          select: "ItemCode,ItemName,QuantityOnStock,QuantityOrdered",
          top: limit,
          skip: offset,
          orderby: "QuantityOnStock asc",
        });
        const meta = paginationMeta(items, limit, offset);

        if (response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: truncateIfNeeded(
                  JSON.stringify({ threshold: min_stock, ...meta, items }, null, 2),
                ),
              },
            ],
          };
        }

        if (items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No items found with stock below ${min_stock}.`,
              },
            ],
          };
        }

        let md = `## Low Stock Items (threshold: ${min_stock})\n\n`;
        md += `${meta.count} item${meta.count === 1 ? "" : "s"} with stock below ${min_stock}.\n\n`;
        md += `| ItemCode | Name | In Stock | On Order |\n`;
        md += `|---|---|---|---|\n`;
        md += items
          .map(
            (i) =>
              `| ${i.ItemCode} | ${i.ItemName} | ${i.QuantityOnStock ?? 0} | ${i.QuantityOrdered ?? 0} |`,
          )
          .join("\n");

        if (meta.has_more) {
          md += `\n\n*More results available. Use offset=${meta.next_offset} to get the next page.*`;
        }

        return {
          content: [{ type: "text" as const, text: truncateIfNeeded(md) }],
        };
      } catch (e) {
        return mcpErrorResult(e);
      }
    },
  );
}
