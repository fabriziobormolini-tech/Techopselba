import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "slug: solo minuscole, numeri e trattini"),
  city: z.string().max(80).optional(),
  receptionPhone: z.string().max(30).optional(),
  staffEmail: z.string().email(),
  staffPassword: z.string().min(8).max(72),
});

// Creates a hotel + its first reception/staff user + a trialing subscription.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Dati non validi", details: (err as Error).message },
      { status: 400 },
    );
  }

  const existing = await prisma.hotel.findUnique({
    where: { slug: parsed.slug },
  });
  if (existing) {
    return NextResponse.json({ error: "slug già in uso" }, { status: 409 });
  }
  const emailTaken = await prisma.user.findUnique({
    where: { email: parsed.staffEmail.toLowerCase() },
  });
  if (emailTaken) {
    return NextResponse.json({ error: "email già in uso" }, { status: 409 });
  }

  const hotel = await prisma.hotel.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      city: parsed.city,
      receptionPhone: parsed.receptionPhone,
      subscription: { create: { status: "trialing", plan: "starter" } },
      users: {
        create: {
          email: parsed.staffEmail.toLowerCase(),
          passwordHash: hashPassword(parsed.staffPassword),
          role: "HOTEL",
          name: "Reception",
        },
      },
    },
  });

  return NextResponse.json({ ok: true, hotelId: hotel.id });
}
