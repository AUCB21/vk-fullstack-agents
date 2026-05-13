import { cookies } from "next/headers";
import { deleteSessionCookie } from "../../../../lib/auth/session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(deleteSessionCookie());

  return Response.json({ ok: true });
}
