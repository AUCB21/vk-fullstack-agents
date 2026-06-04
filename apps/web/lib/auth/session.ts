import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "vk-session";

export type AuthPayload =
  | { type: "sap"; username: string }
  | { type: "guest" };

function getSecret() {
  const secret =
    process.env.SESSION_SECRET || "vk-agents-dev-fallback-not-for-production";
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: AuthPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(getSecret());
  return token;
}

export async function verifySession(
  token: string,
): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.type === "sap" && typeof payload.username === "string") {
      return { type: "sap", username: payload.username };
    }
    if (payload.type === "guest") {
      return { type: "guest" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 1800, // 30 min — matches SAP session timeout
  };
}

export function deleteSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };
}
