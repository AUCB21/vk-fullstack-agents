export class SAPAuthError extends Error {
  detail?: Record<string, unknown>;
  constructor(message: string, detail?: Record<string, unknown>) {
    super(message);
    this.name = "SAPAuthError";
    this.detail = detail;
  }
}

export class SAPSession {
  private sessionId: string | null = null;
  private cookies: string[] = [];
  private lastActivity: number = 0;

  constructor() {}

  get isExpired(): boolean {
    if (!this.sessionId) return true;
    const timeout = parseInt(process.env.SAP_SL_SESSION_TIMEOUT || "1800", 10);
    const elapsed = (Date.now() - this.lastActivity) / 1000;
    return elapsed > timeout;
  }

  getCookieString(): string {
    return this.cookies.join("; ");
  }

  async login(username?: string, password?: string): Promise<string> {
    const baseUrl = process.env.SAP_SL_BASE_URL;
    if (!baseUrl) throw new Error("SAP_SL_BASE_URL is not set");

    const user = username || process.env.SAP_SL_USERNAME;
    const pass = password || process.env.SAP_SL_PASSWORD;

    if (!user || !pass) {
      throw new SAPAuthError("Missing SAP credentials for login");
    }

    const payload = {
      CompanyDB: process.env.SAP_SL_COMPANY_DB,
      UserName: user,
      Password: pass,
    };

    const response = await fetch(`${baseUrl}/Login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // In Node 18+, fetch handles self-signed certs via NODE_TLS_REJECT_UNAUTHORIZED
      // See next.config.ts for setting this up locally if needed.
    });

    if (!response.ok) {
      let detail: Record<string, unknown> = {};
      try {
        detail = await response.json();
      } catch {
        // Ignore JSON parse errors
      }
      throw new SAPAuthError(`SAP login failed: ${response.status}`, detail);
    }

    const body = await response.json();
    const sessionId = body.SessionId;

    if (!sessionId) {
      throw new SAPAuthError("SAP login returned no SessionId");
    }

    this.sessionId = sessionId;

    // Extract set-cookie headers (Node fetch might return multiple separated by commas or in array)
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      // Basic split by comma (might split actual dates but good enough for B1SESSION)
      this.cookies = setCookieHeader.split(",").map(c => c.split(";")[0]);
    } else {
      // Fallback
      this.cookies = [`B1SESSION=${sessionId}`];
      if (body.RouteId) {
        this.cookies.push(`ROUTEID=${body.RouteId}`);
      }
    }

    this.lastActivity = Date.now();

    return sessionId;
  }

  async logout(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const baseUrl = process.env.SAP_SL_BASE_URL;
      await fetch(`${baseUrl}/Logout`, {
        method: "POST",
        headers: {
          "Cookie": this.getCookieString()
        }
      });
    } catch (e) {
      console.warn("Failed to logout SAP SL session");
    } finally {
      this.sessionId = null;
      this.cookies = [];
      this.lastActivity = 0;
    }
  }

  touch(): void {
    this.lastActivity = Date.now();
  }
}

// Singleton for development/server context
export const globalSession = new SAPSession();
