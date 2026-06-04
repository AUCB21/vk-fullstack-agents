import { globalSession, SAPAuthError } from "./session";
import {
  Item,
  BusinessPartner,
  Warehouse,
  BatchNumber,
  ItemWarehouseInfo,
  SalesOrder,
  PurchaseOrder,
  Invoice,
  PurchaseInvoice,
  ODataParams,
  buildODataQuery,
} from "./types";

export class SAPNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SAPNotFoundError";
  }
}

export class SAPValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SAPValidationError";
  }
}

export class SAPError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SAPError";
    this.status = status;
  }
}

export class SAPClient {
  private session = globalSession;

  private async request(
    method: string,
    path: string,
    params?: ODataParams,
    body?: Record<string, unknown>,
    retryOn401: boolean = true,
  ): Promise<Record<string, unknown>> {
    const baseUrl = process.env.SAP_SL_BASE_URL;
    if (!baseUrl) throw new Error("SAP_SL_BASE_URL is not set");

    if (this.session.isExpired) {
      await this.session.login();
    }

    const query = buildODataQuery(params);
    const url = `${baseUrl}${path}${query.toString() ? `?${query.toString()}` : ""}`;

    this.session.touch();

    const headers: Record<string, string> = {
      Cookie: this.session.getCookieString(),
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }

    let response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 && retryOn401) {
      console.warn("SAP SL returned 401 — attempting re-auth and retry");
      try {
        await this.session.login();
        headers["Cookie"] = this.session.getCookieString();
        response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch (e) {
        throw new SAPAuthError("Session expired and re-auth failed");
      }
    }

    await this.handleError(response);

    if (response.status === 204) return {};
    return await response.json();
  }

  private async handleError(response: Response): Promise<void> {
    if (response.ok) return;

    let errorMsg = `HTTP ${response.status}`;
    const text = await response.text().catch(() => "");
    if (text) {
      try {
        const body = JSON.parse(text);
        const msgValue = body?.error?.message?.value;
        errorMsg = msgValue || text;
      } catch {
        errorMsg = text;
      }
    }

    if (response.status === 404) throw new SAPNotFoundError(errorMsg);
    if (response.status === 400) throw new SAPValidationError(errorMsg);
    throw new SAPError(errorMsg, response.status);
  }

  // --- Items ---

  async getItems(odata?: ODataParams): Promise<Item[]> {
    const data = await this.request("GET", "/Items", odata);
    return (data.value ?? []) as Item[];
  }

  async getItem(itemCode: string): Promise<Item> {
    return await this.request("GET", `/Items('${encodeURIComponent(itemCode)}')`) as unknown as Item;
  }

  // --- Business Partners ---

  async getBusinessPartners(odata?: ODataParams): Promise<BusinessPartner[]> {
    const data = await this.request("GET", "/BusinessPartners", odata);
    return (data.value ?? []) as BusinessPartner[];
  }

  async getBusinessPartner(cardCode: string): Promise<BusinessPartner> {
    return await this.request("GET", `/BusinessPartners('${encodeURIComponent(cardCode)}')`) as unknown as BusinessPartner;
  }

  // --- Warehouses ---

  async getWarehouses(odata?: ODataParams): Promise<Warehouse[]> {
    const data = await this.request("GET", "/Warehouses", odata);
    return (data.value ?? []) as Warehouse[];
  }

  // --- Batches ---

  async getBatches(odata?: ODataParams): Promise<BatchNumber[]> {
    const data = await this.request("GET", "/BatchNumberDetails", odata);
    return (data.value ?? []) as BatchNumber[];
  }

  async getItemWarehouseStock(itemCode: string): Promise<ItemWarehouseInfo[]> {
    const data = await this.request("GET", `/Items('${encodeURIComponent(itemCode)}')/ItemWarehouseInfoCollection`);
    const collection = (data.ItemWarehouseInfoCollection ?? []) as ItemWarehouseInfo[];
    return collection.filter((w) => (w.InStock ?? 0) > 0 || (w.Committed ?? 0) > 0 || (w.Ordered ?? 0) > 0);
  }

  // --- Sales Orders ---

  async getSalesOrders(odata?: ODataParams): Promise<SalesOrder[]> {
    const data = await this.request("GET", "/Orders", odata);
    return (data.value ?? []) as SalesOrder[];
  }

  async getSalesOrder(docEntry: number): Promise<SalesOrder> {
    return await this.request("GET", `/Orders(${docEntry})`) as unknown as SalesOrder;
  }

  // --- Purchase Orders ---

  async getPurchaseOrders(odata?: ODataParams): Promise<PurchaseOrder[]> {
    const data = await this.request("GET", "/PurchaseOrders", odata);
    return (data.value ?? []) as PurchaseOrder[];
  }

  async getPurchaseOrder(docEntry: number): Promise<PurchaseOrder> {
    return await this.request("GET", `/PurchaseOrders(${docEntry})`) as unknown as PurchaseOrder;
  }

  // --- Customer Invoices ---

  async getInvoices(odata?: ODataParams): Promise<Invoice[]> {
    const data = await this.request("GET", "/Invoices", odata);
    return (data.value ?? []) as Invoice[];
  }

  async getInvoice(docEntry: number): Promise<Invoice> {
    return await this.request("GET", `/Invoices(${docEntry})`) as unknown as Invoice;
  }

  // --- Purchase Invoices ---

  async getPurchaseInvoices(odata?: ODataParams): Promise<PurchaseInvoice[]> {
    const data = await this.request("GET", "/PurchaseInvoices", odata);
    return (data.value ?? []) as PurchaseInvoice[];
  }

  async getPurchaseInvoice(docEntry: number): Promise<PurchaseInvoice> {
    return await this.request("GET", `/PurchaseInvoices(${docEntry})`) as unknown as PurchaseInvoice;
  }
}

// Singleton client
export const sapClient = new SAPClient();
