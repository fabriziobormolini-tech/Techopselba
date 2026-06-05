import type { FlightWatch, Hotel } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFlightProvider } from "@/lib/flights/provider";
import {
  FlightSnapshot,
  FlightStatus,
  isTerminalStatus,
} from "@/lib/flights/types";
import { sendAndRecord } from "@/lib/messaging/provider";
import * as tpl from "@/lib/messaging/templates";

// --- Tuning -----------------------------------------------------------------

// Only treat a flight as "delayed enough to notify" past this many minutes.
const DELAY_THRESHOLD_MIN = 15;
// Re-notify a guest about a delay only when it grows by at least this much.
const DELAY_STEP_MIN = 20;
// "Arrivo imminente" reception alert fires when ETA is within this window.
const SOON_WINDOW_MIN = 90;

export interface PollOutcome {
  watchId: string;
  flightNumber: string;
  previousStatus: string;
  newStatus: FlightStatus;
  notified: string[]; // human-readable list of notifications sent
  changed: boolean;
  error?: string;
}

// Builds the template variable bag shared by all messages for a watch.
function vars(
  hotel: Pick<Hotel, "name" | "timezone">,
  watch: FlightWatch,
  snap: FlightSnapshot,
): tpl.TemplateVars {
  return {
    hotelName: hotel.name,
    guestName: watch.guestName,
    flightNumber: watch.flightNumber,
    arrivalAirport: snap.arrivalAirport,
    scheduledArrival: snap.scheduledArrival,
    estimatedArrival: snap.estimatedArrival,
    delayMinutes: snap.delayMinutes,
    terminal: snap.terminal,
    gate: snap.gate,
    timezone: hotel.timezone,
  };
}

/**
 * Polls a single watch: fetches the latest snapshot, records a history event,
 * decides which (de-duplicated) notifications to fire, sends them, and updates
 * the watch. This pure-ish orchestration is the heart of Wayrd.
 */
export async function pollWatch(
  watch: FlightWatch & { hotel: Hotel },
): Promise<PollOutcome> {
  const outcome: PollOutcome = {
    watchId: watch.id,
    flightNumber: watch.flightNumber,
    previousStatus: watch.status,
    newStatus: watch.status as FlightStatus,
    notified: [],
    changed: false,
  };

  let snap: FlightSnapshot | null;
  try {
    snap = await getFlightProvider().getSnapshot(
      watch.flightNumber,
      watch.flightDate,
    );
  } catch (err) {
    outcome.error = (err as Error).message;
    await prisma.flightWatch.update({
      where: { id: watch.id },
      data: { lastPolledAt: new Date() },
    });
    return outcome;
  }

  if (!snap) {
    // Flight not found this poll — keep watching, just timestamp it.
    await prisma.flightWatch.update({
      where: { id: watch.id },
      data: { lastPolledAt: new Date(), status: "UNKNOWN" },
    });
    outcome.newStatus = "UNKNOWN";
    return outcome;
  }

  outcome.newStatus = snap.status;
  const hotel = watch.hotel;

  // --- Decide notifications (with de-duplication) ---------------------------
  const guestMsgs: { template: string; body: string }[] = [];
  const receptionMsgs: { template: string; body: string }[] = [];
  const v = vars(hotel, watch, snap);

  const statusChanged = snap.status !== watch.status;
  let newSoonNotified = watch.soonNotified;
  let newLastNotifiedStatus = watch.lastNotifiedStatus;
  let newLastNotifiedDelay = watch.lastNotifiedDelay;

  if (snap.status === "CANCELLED") {
    if (watch.lastNotifiedStatus !== "CANCELLED") {
      guestMsgs.push({ template: "guestCancelled", body: tpl.guestCancelled(v) });
      if (hotel.receptionPhone)
        receptionMsgs.push({
          template: "receptionCancelled",
          body: tpl.receptionAlert("CANCELLED", v),
        });
      newLastNotifiedStatus = "CANCELLED";
    }
  } else if (snap.status === "LANDED") {
    if (watch.lastNotifiedStatus !== "LANDED") {
      guestMsgs.push({ template: "guestLanded", body: tpl.guestLanded(v) });
      if (hotel.receptionPhone)
        receptionMsgs.push({
          template: "receptionLanded",
          body: tpl.receptionAlert("LANDED", v),
        });
      newLastNotifiedStatus = "LANDED";
    }
  } else {
    // En route / scheduled / delayed: handle delay escalation.
    const delay = snap.delayMinutes;
    const lastDelay = watch.lastNotifiedDelay ?? 0;
    const crossedThreshold = delay >= DELAY_THRESHOLD_MIN;
    const grewEnough = delay - lastDelay >= DELAY_STEP_MIN;
    const firstDelayAlert = lastDelay < DELAY_THRESHOLD_MIN;

    if (crossedThreshold && (firstDelayAlert || grewEnough)) {
      guestMsgs.push({ template: "guestDelay", body: tpl.guestDelay(v) });
      if (hotel.receptionPhone)
        receptionMsgs.push({
          template: "receptionDelay",
          body: tpl.receptionAlert("DELAY", v),
        });
      newLastNotifiedDelay = delay;
    }

    // "Arrivo imminente" — reception heads-up, once.
    if (!watch.soonNotified && hotel.receptionPhone && snap.estimatedArrival) {
      const minsToEta =
        (snap.estimatedArrival.getTime() - Date.now()) / 60_000;
      if (
        minsToEta > 0 &&
        minsToEta <= SOON_WINDOW_MIN &&
        (snap.status === "ACTIVE" || snap.status === "DELAYED")
      ) {
        receptionMsgs.push({
          template: "receptionSoon",
          body: tpl.receptionAlert("SOON", v),
        });
        newSoonNotified = true;
      }
    }
  }

  const notable = guestMsgs.length > 0 || receptionMsgs.length > 0;

  // --- Persist event + updated watch ----------------------------------------
  const summaryParts: string[] = [];
  if (statusChanged)
    summaryParts.push(`${watch.status} → ${snap.status}`);
  if (snap.delayMinutes !== watch.delayMinutes)
    summaryParts.push(`ritardo ${snap.delayMinutes}m`);

  await prisma.flightStatusEvent.create({
    data: {
      watchId: watch.id,
      status: snap.status,
      delayMinutes: snap.delayMinutes,
      estimatedArrival: snap.estimatedArrival,
      gate: snap.gate,
      terminal: snap.terminal,
      summary: summaryParts.join(", ") || "polled",
      notable,
    },
  });

  await prisma.flightWatch.update({
    where: { id: watch.id },
    data: {
      status: snap.status,
      scheduledArrival: snap.scheduledArrival,
      estimatedArrival: snap.estimatedArrival,
      actualArrival: snap.actualArrival,
      arrivalAirport: snap.arrivalAirport,
      departureAirport: snap.departureAirport,
      terminal: snap.terminal,
      gate: snap.gate,
      delayMinutes: snap.delayMinutes,
      lastPolledAt: new Date(),
      lastNotifiedStatus: newLastNotifiedStatus,
      lastNotifiedDelay: newLastNotifiedDelay,
      soonNotified: newSoonNotified,
      // Close the watch once the flight reached a terminal state we handled.
      watchState: isTerminalStatus(snap.status) ? "DONE" : watch.watchState,
    },
  });

  // --- Fire messages --------------------------------------------------------
  for (const m of guestMsgs) {
    await sendAndRecord({
      toPhone: watch.guestPhone,
      body: m.body,
      audience: "GUEST",
      template: m.template,
      watchId: watch.id,
    });
    outcome.notified.push(`guest:${m.template}`);
  }
  for (const m of receptionMsgs) {
    await sendAndRecord({
      toPhone: hotel.receptionPhone!,
      body: m.body,
      audience: "RECEPTION",
      template: m.template,
      watchId: watch.id,
    });
    outcome.notified.push(`reception:${m.template}`);
  }

  outcome.changed = statusChanged || notable;
  return outcome;
}

/**
 * Polls every ACTIVE watch whose flight day is recent (yesterday..tomorrow),
 * which is the set the monitoring loop cares about. Returns per-watch outcomes.
 */
export async function pollAllActive(): Promise<PollOutcome[]> {
  const today = new Date();
  const days: string[] = [];
  for (let offset = -1; offset <= 1; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    days.push(d.toISOString().slice(0, 10));
  }

  const watches = await prisma.flightWatch.findMany({
    where: { watchState: "ACTIVE", flightDate: { in: days } },
    include: { hotel: true },
    orderBy: { createdAt: "asc" },
  });

  const outcomes: PollOutcome[] = [];
  for (const w of watches) {
    outcomes.push(await pollWatch(w));
  }
  return outcomes;
}
