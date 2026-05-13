import { cookies } from "next/headers";
import { SAPSession } from "../../../../lib/sap/session";
import {
  createSession,
  sessionCookieOptions,
} from "../../../../lib/auth/session";
import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
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
    return Response.json(
      { error: "Usuario y contrasena son requeridos" },
      { status: 400 },
    );
  }

  const { username, password } = parsed.data;

  // Validate credentials against SAP Service Layer
  const session = new SAPSession();
  try {
    await session.login(username, password);
    // Logout immediately — we only needed to validate identity.
    // The shared globalSession handles actual SAP queries.
    await session.logout();
  } catch {
    return Response.json(
      { error: "Credenciales invalidas o SAP no disponible" },
      { status: 401 },
    );
  }

  const token = await createSession({ type: "sap", username });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(token));

  return Response.json({ ok: true, user: { type: "sap", username } });
}
