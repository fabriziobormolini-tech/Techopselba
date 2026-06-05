import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

// Lightweight, dependency-free auth: scrypt password hashing + an HMAC-signed
// stateless session cookie. Enough for staff/admin login on the MVP; swap for
// NextAuth/an IdP when SSO is needed.

const COOKIE_NAME = "wayrd_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type Role = "ADMIN" | "HOTEL";

export interface SessionPayload {
  uid: string;
  role: Role;
  hid: string | null;
  exp: number;
}

// --- Passwords --------------------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    computed.length === expected.length && timingSafeEqual(computed, expected)
  );
}

// --- Session tokens ---------------------------------------------------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", env.sessionSecret).update(data).digest());
}

export function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + SESSION_TTL_MS };
  const body = b64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = sign(body);
  // Constant-time compare of equal-length signatures.
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Cookie helpers (server components / route handlers) --------------------

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_TTL_MS / 1000;

export function getSession(): SessionPayload | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { hotel: true },
  });
  return user;
}

// Authenticates credentials; returns a session token on success.
export async function authenticate(
  email: string,
  password: string,
): Promise<{ token: string; role: Role } | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  const role = user.role as Role;
  const token = createSessionToken({ uid: user.id, role, hid: user.hotelId });
  return { token, role };
}
