import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getBillingProvider } from "@/lib/billing/provider";

export const dynamic = "force-dynamic";

const Body = z.object({ hotelId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: parsed.hotelId } });
  if (!hotel) {
    return NextResponse.json({ error: "hotel non trovato" }, { status: 404 });
  }

  const provider = getBillingProvider();
  const session = await provider.createCheckout({
    hotelId: hotel.id,
    hotelName: hotel.name,
    email: user.email,
    successUrl: `${env.appBaseUrl}/admin?checkout=success&hotel=${hotel.id}`,
    cancelUrl: `${env.appBaseUrl}/admin?checkout=cancel`,
  });

  // In mock mode, activate immediately so the backoffice flow is testable.
  if (provider.name === "mock") {
    await prisma.subscription.upsert({
      where: { hotelId: hotel.id },
      create: { hotelId: hotel.id, status: "active", plan: "starter" },
      update: { status: "active" },
    });
  }

  return NextResponse.json({ ok: true, url: session.url });
}
