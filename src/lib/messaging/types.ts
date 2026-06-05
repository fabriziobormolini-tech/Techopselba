// Messaging provider abstraction. The engine speaks in OutboundMessage; each
// provider turns that into a real send (WhatsApp Cloud API) or a logged mock.

export interface OutboundMessage {
  toPhone: string;
  body: string;
}

export interface SendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export interface MessagingProvider {
  readonly name: string;
  send(message: OutboundMessage): Promise<SendResult>;
}

// E.164-ish normalization: keep leading +, strip spaces/dashes/parens.
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}
