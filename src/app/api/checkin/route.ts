import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createWatch } from "@/lib/monitoring/intake";

export const dynamic = "force-dynamic";

const Body = z.object({
  slug: z.string().min(1),
  guestName: z.string().min(2).max(120),
  guestPhone: z.string().min(6).max(30),
  flightNumber: z.string().min(2).max(10),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data non valida"),
  partySize: z.number().int().min(1).max(20).optional(),
  notes: z.string().max(280).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Dati non validi", details: (err as Error).message },
      { status: 400 },
    );
  }

  const hotel = await prisma.hotel.findUnique({
    where: { slug: parsed.slug },
  });
  if (!hotel || !hotel.active) {
    return NextResponse.json({ error: "Hotel non trovato" }, { status: 404 });
  }

  try {
    const result = await createWatch({
      hotelId: hotel.id,
      guestName: parsed.guestName,
      guestPhone: parsed.guestPhone,
      flightNumber: parsed.flightNumber,
      flightDate: parsed.flightDate,
      partySize: parsed.partySize,
      notes: parsed.notes,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: "Errore interno", details: (err as Error).message },
      { status: 500 },
    );
  }
}
