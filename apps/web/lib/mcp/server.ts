import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerItemTools } from "./tools/items";
import { registerBusinessPartnerTools } from "./tools/business-partners";
import { registerWarehouseTools } from "./tools/warehouses";
import { registerSalesTools } from "./tools/sales";
import { registerPurchaseTools } from "./tools/purchases";

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "sap-b1-mcp-server", version: "1.0.0" });

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Health check. Returns server timestamp. No SAP connection required.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => ({
      content: [{ type: "text" as const, text: `pong — ${new Date().toISOString()}` }],
    }),
  );

  registerItemTools(server);
  registerBusinessPartnerTools(server);
  registerWarehouseTools(server);
  registerSalesTools(server);
  registerPurchaseTools(server);

  return server;
}
