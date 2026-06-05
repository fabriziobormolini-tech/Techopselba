import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { MockMessagingProvider } from "./mock";
import { WhatsAppProvider } from "./whatsapp";
import { MessagingProvider, normalizePhone } from "./types";

let cached: MessagingProvider | null = null;

export function getMessagingProvider(): MessagingProvider {
  if (cached) return cached;
  cached =
    env.messaging.provider === "whatsapp"
      ? new WhatsAppProvider()
      : new MockMessagingProvider();
  return cached;
}

interface SendAndRecordInput {
  toPhone: string;
  body: string;
  audience: "GUEST" | "RECEPTION";
  template?: string;
  watchId?: string | null;
}

// Sends via the configured provider AND persists a Message row (audit + the
// dashboard message log). Returns the created Message id.
export async function sendAndRecord(input: SendAndRecordInput): Promise<string> {
  const provider = getMessagingProvider();
  const toPhone = normalizePhone(input.toPhone);

  const result = await provider.send({ toPhone, body: input.body });

  const msg = await prisma.message.create({
    data: {
      watchId: input.watchId ?? null,
      audience: input.audience,
      toPhone,
      template: input.template,
      body: input.body,
      direction: "OUT",
      status: result.ok ? "SENT" : "FAILED",
      providerId: result.providerId,
      error: result.error,
    },
  });

  return msg.id;
}
