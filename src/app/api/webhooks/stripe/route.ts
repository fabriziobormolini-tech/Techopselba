import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Stripe webhook: keeps Subscription rows in sync with billing events.
// Verified with STRIPE_WEBHOOK_SECRET when running the real provider.
export async function POST(req: Request) {
  if (env.billing.provider !== "stripe") {
    // Mock mode: nothing to verify; acknowledge.
    return NextResponse.json({ ok: true, mock: true });
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: any;
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(env.billing.stripeSecretKey);
    event = stripe.webhooks.constructEvent(
      raw,
      sig as string,
      env.billing.stripeWebhookSecret,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature error: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const obj = event.data?.object ?? {};
  const hotelId: string | undefined =
    obj.metadata?.hotelId || obj.client_reference_id;

  switch (event.type) {
    case "checkout.session.completed":
      if (hotelId) {
        await prisma.subscription.upsert({
          where: { hotelId },
          create: {
            hotelId,
            status: "active",
            stripeCustomerId: obj.customer,
            stripeSubscriptionId: obj.subscription,
          },
          update: {
            status: "active",
            stripeCustomerId: obj.customer,
            stripeSubscriptionId: obj.subscription,
          },
        });
      }
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: obj.id },
        data: {
          status:
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : obj.status,
          currentPeriodEnd: obj.current_period_end
            ? new Date(obj.current_period_end * 1000)
            : undefined,
        },
      });
      break;
  }

  return NextResponse.json({ received: true });
}
