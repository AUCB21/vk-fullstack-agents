import { getSessionFromCookies } from "../../../../lib/auth/session";

export async function GET() {
  const session = await getSessionFromCookies();

  if (!session) {
    return Response.json({ user: null });
  }

  return Response.json({
    user:
      session.type === "sap"
        ? { type: "sap", username: session.username }
        : { type: "guest" },
  });
}
