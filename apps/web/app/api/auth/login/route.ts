import { cookies } from "next/headers";
import { SAPSession } from "../../../../lib/sap/session";
import { createSession, sessionCookieOptions } from "../../../../lib/auth/session";
import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  companydb: z.string().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Usuario y contraseña son requeridos" }, { status: 400 });
  }

  const { username, password, companydb } = parsed.data;

  // Override CompanyDB if provided by the form (falls back to env var in SAPSession)
  if (companydb) {
    process.env.SAP_SL_COMPANY_DB = companydb;
  }

  const session = new SAPSession();
  try {
    await session.login(username, password);
    await session.logout();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[auth/login] SAP login failed:", msg);

    // Surface a clearer message in dev
    const detail = process.env.NODE_ENV !== "production" ? ` (${msg})` : "";
    return Response.json(
      { error: `Credenciales invalidas o SAP no disponible${detail}` },
      { status: 401 },
    );
  }

  const token = await createSession({ type: "sap", username });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(token));

  return Response.json({ ok: true, user: { type: "sap", username } });
}
