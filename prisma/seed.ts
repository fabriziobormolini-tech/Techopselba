import { randomBytes, scryptSync } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Local copy of password hashing (keeps the seed free of Next-only imports).
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  // --- Admin ----------------------------------------------------------------
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

  // --- Demo hotel -----------------------------------------------------------
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

  // --- Demo flight watches (varied statuses via the mock provider) ----------
  // Spread across today + tomorrow so the dashboard shows a realistic mix of
  // SCHEDULED / DELAYED / ACTIVE / LANDED regardless of the time of day.
  const watches = [
    { guestName: "Mario Rossi", guestPhone: "+393331110001", flightNumber: "FR1234", dayOffset: 0 },
    { guestName: "Anna Bianchi", guestPhone: "+393331110002", flightNumber: "AZ602", dayOffset: 0 },
    { guestName: "John Smith", guestPhone: "+447700110003", flightNumber: "BA546", dayOffset: 1 },
    { guestName: "Lena Müller", guestPhone: "+491700110004", flightNumber: "LH231", dayOffset: 1 },
    { guestName: "Sofia Costa", guestPhone: "+351910110005", flightNumber: "TP832", dayOffset: 1 },
  ];

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
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    "Seed completato.\n" +
      "  Admin:      admin@wayrd.app / wayrd-admin\n" +
      "  Reception:  reception@demo-hotel.it / wayrd1234\n" +
      `  Check-in:   /h/demo-hotel/checkin\n` +
      `  ${watches.length} voli demo (oggi + domani).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
