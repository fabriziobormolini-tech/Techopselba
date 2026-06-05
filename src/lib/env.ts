// Centralized, typed access to environment configuration.
// Providers fall back to "mock" automatically when credentials are absent so
// the whole app runs end-to-end with zero external setup.

function pick(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

const flightProviderRaw = pick("FLIGHT_PROVIDER", "mock");
const messagingProviderRaw = pick("MESSAGING_PROVIDER", "mock");
const billingProviderRaw = pick("BILLING_PROVIDER", "mock");

export const env = {
  appBaseUrl: pick("APP_BASE_URL", "http://localhost:3000"),
  sessionSecret: pick("SESSION_SECRET", "dev-insecure-change-me"),
  cronSecret: pick("CRON_SECRET", "dev-cron-secret"),

  flights: {
    // Only use the real provider when explicitly chosen AND a key exists.
    provider:
      flightProviderRaw === "aerodatabox" && pick("AERODATABOX_API_KEY")
        ? "aerodatabox"
        : "mock",
    aerodataboxKey: pick("AERODATABOX_API_KEY"),
    aerodataboxHost: pick("AERODATABOX_API_HOST", "aerodatabox.p.rapidapi.com"),
  },

  messaging: {
    provider:
      messagingProviderRaw === "whatsapp" &&
      pick("WHATSAPP_ACCESS_TOKEN") &&
      pick("WHATSAPP_PHONE_NUMBER_ID")
        ? "whatsapp"
        : "mock",
    whatsappPhoneNumberId: pick("WHATSAPP_PHONE_NUMBER_ID"),
    whatsappAccessToken: pick("WHATSAPP_ACCESS_TOKEN"),
    whatsappVerifyToken: pick("WHATSAPP_VERIFY_TOKEN", "wayrd-verify"),
    whatsappApiVersion: pick("WHATSAPP_API_VERSION", "v20.0"),
  },

  billing: {
    provider:
      billingProviderRaw === "stripe" && pick("STRIPE_SECRET_KEY")
        ? "stripe"
        : "mock",
    stripeSecretKey: pick("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: pick("STRIPE_WEBHOOK_SECRET"),
    stripePriceId: pick("STRIPE_PRICE_ID"),
  },
} as const;

export type AppEnv = typeof env;
