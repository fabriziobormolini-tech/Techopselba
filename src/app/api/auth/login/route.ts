import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const result = await authenticate(parsed.email, parsed.password);
  if (!result) {
    return NextResponse.json(
      { error: "Credenziali non valide" },
      { status: 401 },
    );
  }

  const redirect = result.role === "ADMIN" ? "/admin" : "/dashboard";
  const res = NextResponse.json({ ok: true, role: result.role, redirect });
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
