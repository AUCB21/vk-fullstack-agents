import { tool } from "ai";
import { z } from "zod";
import { sapClient } from "../sap/client";
import type { Item } from "../sap/types";

export const getItemsTool = tool({
  description: "Query SAP B1 item master (OITM). Returns a list of items matching the OData filter. Use filter for conditions like 'QuantityOnStock lt 10', select to pick fields, top to limit results, orderby to sort.",
  inputSchema: z.object({
    filter: z.string().optional().describe("OData $filter, e.g. 'QuantityOnStock lt 10'"),
    select: z.string().optional().describe("Comma-separated fields to return"),
    top: z.number().optional().default(20).describe("Max rows to return"),
    orderby: z.string().optional().describe("OData $orderby, e.g. 'QuantityOnStock asc'"),
  }),
  execute: async ({ filter, select, top, orderby }): Promise<{ count: number; items: Item[] } | { error: string }> => {
    try {
      const items = await sapClient.getItems({ filter, select, top, orderby });
      return { count: items.length, items };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Failed to get items" };
    }
  },
});

export const getItemDetailsTool = tool({
  description: "Get full details for a single item by ItemCode from SAP B1 item master (OITM).",
  inputSchema: z.object({
    item_code: z.string().describe("The ItemCode to look up, e.g. 'A0017'"),
  }),
  execute: async ({ item_code }): Promise<Item | { error: string }> => {
    try {
      const item = await sapClient.getItem(item_code);
      return item;
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : `Failed to get item details for ${item_code}` };
    }
  },
});

export const checkStockLevelsTool = tool({
  description: "Check stock levels for items below a given threshold. Returns items where QuantityOnStock is less than the specified minimum.",
  inputSchema: z.object({
    min_stock: z.number().describe("Stock threshold. Items with QuantityOnStock below this are returned."),
    top: z.number().optional().default(20).describe("Max rows to return"),
  }),
  execute: async ({ min_stock, top }): Promise<{ threshold: number; count: number; items: Item[] } | { error: string }> => {
    try {
      const items = await sapClient.getItems({
        filter: `QuantityOnStock lt ${min_stock}`,
        select: "ItemCode,ItemName,QuantityOnStock,QuantityOrdered",
        top,
        orderby: "QuantityOnStock asc",
      });
      return { threshold: min_stock, count: items.length, items };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : "Failed to check stock levels" };
    }
  },
});

export const inventoryTools = {
  get_items: getItemsTool,
  get_item_details: getItemDetailsTool,
  check_stock_levels: checkStockLevelsTool,
};
