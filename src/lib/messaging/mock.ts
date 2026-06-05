import { MessagingProvider, OutboundMessage, SendResult } from "./types";

// Mock provider: logs to console and "succeeds". Lets the full notification
// pipeline run (and be inspected in the dashboard) with no WhatsApp account.
export class MockMessagingProvider implements MessagingProvider {
  readonly name = "mock";

  async send(message: OutboundMessage): Promise<SendResult> {
    const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // eslint-disable-next-line no-console
    console.log(
      `\n[WhatsApp:mock] -> ${message.toPhone}\n${message.body}\n(id=${id})\n`,
    );
    return { ok: true, providerId: id };
  }
}
