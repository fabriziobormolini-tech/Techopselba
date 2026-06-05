import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pollAllActive } from "@/lib/monitoring/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Monitoring tick. Wire this to a scheduler (Vercel Cron, GitHub Action,
// systemd timer, k8s CronJob…) every 2–5 minutes.
//   Authorization: Bearer <CRON_SECRET>   or   ?secret=<CRON_SECRET>
async function handle(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  const provided = bearer || url.searchParams.get("secret") || "";

  if (provided !== env.cronSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const outcomes = await pollAllActive();
  const notified = outcomes.filter((o) => o.notified.length > 0);

  return NextResponse.json({
    ok: true,
    polled: outcomes.length,
    changed: outcomes.filter((o) => o.changed).length,
    notifications: notified.flatMap((o) => o.notified),
    tookMs: Date.now() - started,
    outcomes,
  });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
