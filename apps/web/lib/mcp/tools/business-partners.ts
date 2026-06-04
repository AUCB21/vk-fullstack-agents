import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sapClient, SAPNotFoundError } from "../../sap/client";
import type { BusinessPartner } from "../../sap/types";
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

const CARD_TYPE_LABEL: Record<string, string> = {
  C: "Customer",
  S: "Supplier",
  L: "Lead",
};

function bpsToMarkdown(bps: BusinessPartner[], meta: PaginationMeta): string {
  if (bps.length === 0)
    return "No business partners found matching the given criteria.";

  const rows = bps
    .map(
      (bp) =>
        `| ${bp.CardCode} | ${bp.CardName} | ${CARD_TYPE_LABEL[bp.CardType] ?? bp.CardType} | ${bp.Phone1 ?? "-"} | ${bp.Valid ?? "Y"} |`,
    )
    .join("\n");

  let md = `## Business Partners (${meta.count} results, offset ${meta.offset})\n\n`;
  md += `| CardCode | Name | Type | Phone | Valid |\n`;
  md += `|---|---|---|---|---|\n`;
  md += rows;

  if (meta.has_more) {
    md += `\n\n*More results available. Use offset=${meta.next_offset} to get the next page.*`;
  }

  return md;
}

function bpToMarkdown(bp: BusinessPartner): string {
  return [
    `## Business Partner: ${bp.CardCode}`,
    `**Name**: ${bp.CardName}`,
    `**Type**: ${CARD_TYPE_LABEL[bp.CardType] ?? bp.CardType}`,
    bp.Phone1 ? `**Phone**: ${bp.Phone1}` : null,
    bp.EmailAddress ? `**Email**: ${bp.EmailAddress}` : null,
    bp.FederalTaxID ? `**Tax ID**: ${bp.FederalTaxID}` : null,
    `**Valid**: ${bp.Valid ?? "Y"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function registerBusinessPartnerTools(server: McpServer): void {
  server.registerTool(
    "sap_list_business_partners",
    {
      title: "List SAP Business Partners",
      description:
        "List business partners from SAP B1 (OCRD). Filter by type (Customer/Supplier/Lead), apply OData filters, and paginate results.",
      inputSchema: z
        .object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20)
            .describe("Max records to return (1–100, default 20)"),
          offset: z
            .number()
            .int()
            .min(0)
            .default(0)
            .describe("Records to skip for pagination (default 0)"),
          card_type: z
            .enum(["C", "S", "L"])
            .optional()
            .describe("Filter by type: C=Customer, S=Supplier, L=Lead"),
          filter: z
            .string()
            .optional()
            .describe(
              "Additional OData $filter expression, e.g. \"CardName eq 'Acme'\"",
            ),
          orderby: z
            .string()
            .optional()
            .describe("OData $orderby, e.g. \"CardName asc\""),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ limit, offset, card_type, filter, orderby, response_format }) => {
      try {
        const parts: string[] = [];
        if (card_type) parts.push(`CardType eq '${card_type}'`);
        if (filter) parts.push(filter);
        const combinedFilter =
          parts.length > 0 ? parts.join(" and ") : undefined;

        const bps = await sapClient.getBusinessPartners({
          top: limit,
          skip: offset,
          filter: combinedFilter,
          orderby,
        });
        const meta = paginationMeta(bps, limit, offset);

        if (response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: truncateIfNeeded(
                  JSON.stringify({ ...meta, items: bps }, null, 2),
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: truncateIfNeeded(bpsToMarkdown(bps, meta)),
            },
          ],
        };
      } catch (e) {
        return mcpErrorResult(
          e,
          "Tip: use card_type='C' for customers, 'S' for suppliers, 'L' for leads.",
        );
      }
    },
  );

  server.registerTool(
    "sap_get_business_partner",
    {
      title: "Get SAP Business Partner",
      description:
        "Get full details for a single business partner by CardCode from SAP B1 (OCRD).",
      inputSchema: z
        .object({
          card_code: z
            .string()
            .min(1)
            .describe("SAP business partner code, e.g. 'C20000'"),
          response_format: responseFormat,
        })
        .strict(),
      annotations: READONLY,
    },
    async ({ card_code, response_format }) => {
      try {
        const bp = await sapClient.getBusinessPartner(card_code);

        if (response_format === "json") {
          return {
            content: [
              {
                type: "text" as const,
                text: truncateIfNeeded(JSON.stringify(bp, null, 2)),
              },
            ],
          };
        }

        return {
          content: [{ type: "text" as const, text: bpToMarkdown(bp) }],
        };
      } catch (e) {
        if (e instanceof SAPNotFoundError) {
          return mcpErrorResult(
            e,
            `Business partner '${card_code}' not found. Use sap_list_business_partners to find the correct CardCode.`,
          );
        }
        return mcpErrorResult(e);
      }
    },
  );
}
