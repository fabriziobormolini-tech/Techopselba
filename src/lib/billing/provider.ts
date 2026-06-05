import { env } from "@/lib/env";

// Billing abstraction. Mockable so the admin/backoffice flows work without a
// Stripe account; the real adapter is a thin wrapper around the Stripe SDK.

export interface CheckoutSession {
  url: string;
  id: string;
}

export interface BillingProvider {
  readonly name: string;
  // Creates a hosted checkout for a hotel subscription.
  createCheckout(args: {
    hotelId: string;
    hotelName: string;
    email?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;
}

class MockBillingProvider implements BillingProvider {
  readonly name = "mock";
  async createCheckout(args: {
    hotelId: string;
    successUrl: string;
  }): Promise<CheckoutSession> {
    // Pretend checkout: immediately "succeeds" by redirecting back with a flag.
    const sep = args.successUrl.includes("?") ? "&" : "?";
    return {
      id: `cs_mock_${args.hotelId}`,
      url: `${args.successUrl}${sep}mock_paid=1`,
    };
  }
}

class StripeBillingProvider implements BillingProvider {
  readonly name = "stripe";
  async createCheckout(args: {
    hotelId: string;
    hotelName: string;
    email?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    // Lazy import keeps Stripe out of the bundle when using mocks.
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(env.billing.stripeSecretKey);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: env.billing.stripePriceId, quantity: 1 }],
      customer_email: args.email,
      client_reference_id: args.hotelId,
      metadata: { hotelId: args.hotelId },
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    });
    return { id: session.id, url: session.url ?? args.cancelUrl };
  }
}

let cached: BillingProvider | null = null;
export function getBillingProvider(): BillingProvider {
  if (cached) return cached;
  cached =
    env.billing.provider === "stripe"
      ? new StripeBillingProvider()
      : new MockBillingProvider();
  return cached;
}
