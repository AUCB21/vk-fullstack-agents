import { cookies } from "next/headers";
import {
  createSession,
  sessionCookieOptions,
} from "../../../../lib/auth/session";

export async function POST() {
  const token = await createSession({ type: "guest" });
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieOptions(token));

  return Response.json({ ok: true, user: { type: "guest" } });
}
