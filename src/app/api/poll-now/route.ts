import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pollWatch } from "@/lib/monitoring/engine";

export const dynamic = "force-dynamic";

// Session-authorized manual poll. Hotel staff poll their own hotel; admins can
// poll everything. Handy for demos and "refresh now" in the dashboard.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "non autorizzato" }, { status: 401 });
  }

  const where =
    user.role === "ADMIN"
      ? { watchState: "ACTIVE" }
      : { watchState: "ACTIVE", hotelId: user.hotelId ?? "__none__" };

  const watches = await prisma.flightWatch.findMany({
    where,
    include: { hotel: true },
  });

  const outcomes = [];
  for (const w of watches) outcomes.push(await pollWatch(w));

  return NextResponse.json({
    ok: true,
    polled: outcomes.length,
    notifications: outcomes.flatMap((o) => o.notified),
  });
}
