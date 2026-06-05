// Standalone monitoring tick — run from cron/systemd/CI without HTTP:
//   npm run poll
import { pollAllActive } from "../src/lib/monitoring/engine";

async function main() {
  const outcomes = await pollAllActive();
  const notifications = outcomes.flatMap((o) => o.notified);
  // eslint-disable-next-line no-console
  console.log(
    `Polled ${outcomes.length} watches, ` +
      `${outcomes.filter((o) => o.changed).length} changed, ` +
      `${notifications.length} notifications.`,
  );
  for (const o of outcomes) {
    if (o.notified.length || o.error) {
      // eslint-disable-next-line no-console
      console.log(
        `  ${o.flightNumber}: ${o.previousStatus} -> ${o.newStatus}` +
          (o.notified.length ? ` [${o.notified.join(", ")}]` : "") +
          (o.error ? ` ERROR: ${o.error}` : ""),
      );
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
