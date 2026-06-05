import { env } from "@/lib/env";
import { MessagingProvider, OutboundMessage, SendResult } from "./types";

// Real adapter for the WhatsApp Cloud API (Meta Graph API). Sends free-form
// text messages (valid inside the 24h customer-service window). For first
// contact you would use an approved template — wire that in templates.ts when
// your WABA templates are approved.
export class WhatsAppProvider implements MessagingProvider {
  readonly name = "whatsapp";

  async send(message: OutboundMessage): Promise<SendResult> {
    const url = `https://graph.facebook.com/${env.messaging.whatsappApiVersion}/${env.messaging.whatsappPhoneNumberId}/messages`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.messaging.whatsappAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: message.toPhone.replace(/^\+/, ""),
          type: "text",
          text: { preview_url: false, body: message.body },
        }),
      });

      const data = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message?: string };
      };

      if (!res.ok) {
        return {
          ok: false,
          error: data?.error?.message || `HTTP ${res.status}`,
        };
      }
      return { ok: true, providerId: data.messages?.[0]?.id };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
