import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Meta webhook verification handshake (GET).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.messaging.whatsappVerifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

// Inbound messages + delivery status callbacks (POST).
export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const entries = payload?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};

        // Delivery / read receipts -> update our Message rows.
        for (const st of value.statuses ?? []) {
          const providerId = st.id as string | undefined;
          const status = String(st.status || "").toUpperCase(); // sent/delivered/read/failed
          if (providerId && status) {
            await prisma.message.updateMany({
              where: { providerId },
              data: { status },
            });
          }
        }

        // Inbound guest replies -> persist as IN messages (linked best-effort).
        for (const m of value.messages ?? []) {
          const from = m.from as string;
          const body = m.text?.body ?? `[${m.type ?? "non testuale"}]`;
          const watch = await prisma.flightWatch.findFirst({
            where: { guestPhone: { contains: from.slice(-9) } },
            orderBy: { createdAt: "desc" },
          });
          await prisma.message.create({
            data: {
              watchId: watch?.id ?? null,
              direction: "IN",
              audience: "GUEST",
              toPhone: from,
              body,
              status: "DELIVERED",
              providerId: m.id,
            },
          });
        }
      }
    }
  } catch (err) {
    // Always 200 so Meta doesn't retry-storm; we log for diagnostics.
    // eslint-disable-next-line no-console
    console.error("whatsapp webhook error", err);
  }

  return NextResponse.json({ ok: true });
}
