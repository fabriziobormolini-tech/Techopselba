import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// One-time setup endpoint to populate the production database with the admin
// account + a demo hotel and a few demo flights. Idempotent and protected by
// CRON_SECRET. Visit once after the first deploy:
//   /api/seed?secret=<CRON_SECRET>
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function handle(req: Request) {
  const url = new URL(req.url);
  const provided =
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("secret") ||
    "";
  if (provided !== env.cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await prisma.user.upsert({
    where: { email: "admin@wayrd.app" },
    update: {},
    create: {
      email: "admin@wayrd.app",
      passwordHash: hashPassword("wayrd-admin"),
      name: "Wayrd Admin",
      role: "ADMIN",
    },
  });

  const hotel = await prisma.hotel.upsert({
    where: { slug: "demo-hotel" },
    update: {},
    create: {
      name: "Hotel Demo Roma",
      slug: "demo-hotel",
      city: "Roma",
      receptionPhone: "+390600000000",
      subscription: { create: { status: "active", plan: "starter" } },
      users: {
        create: {
          email: "reception@demo-hotel.it",
          passwordHash: hashPassword("wayrd1234"),
          name: "Reception Demo",
          role: "HOTEL",
        },
      },
    },
  });

  const watches = [
    { guestName: "Mario Rossi", guestPhone: "+393331110001", flightNumber: "FR1234", dayOffset: 0 },
    { guestName: "Anna Bianchi", guestPhone: "+393331110002", flightNumber: "AZ602", dayOffset: 0 },
    { guestName: "John Smith", guestPhone: "+447700110003", flightNumber: "BA546", dayOffset: 1 },
    { guestName: "Lena Müller", guestPhone: "+491700110004", flightNumber: "LH231", dayOffset: 1 },
    { guestName: "Sofia Costa", guestPhone: "+351910110005", flightNumber: "TP832", dayOffset: 1 },
  ];

  let created = 0;
  for (const w of watches) {
    const { dayOffset, ...rest } = w;
    const flightDate = dateOffset(dayOffset);
    const exists = await prisma.flightWatch.findFirst({
      where: { hotelId: hotel.id, flightNumber: w.flightNumber, flightDate },
    });
    if (!exists) {
      await prisma.flightWatch.create({
        data: { ...rest, hotelId: hotel.id, flightDate, partySize: 2 },
      });
      created++;
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Setup completato.",
    logins: {
      admin: "admin@wayrd.app / wayrd-admin",
      reception: "reception@demo-hotel.it / wayrd1234",
    },
    demoFlightsCreated: created,
  });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
