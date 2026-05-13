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
