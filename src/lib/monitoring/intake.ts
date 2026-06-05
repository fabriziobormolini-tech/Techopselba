import { prisma } from "@/lib/db";
import { getFlightProvider } from "@/lib/flights/provider";
import { normalizeFlightNumber } from "@/lib/flights/types";
import { sendAndRecord } from "@/lib/messaging/provider";
import { normalizePhone } from "@/lib/messaging/types";
import * as tpl from "@/lib/messaging/templates";

export interface IntakeInput {
  hotelId: string;
  guestName: string;
  guestPhone: string;
  flightNumber: string;
  flightDate: string; // yyyy-mm-dd
  partySize?: number;
  notes?: string;
}

export interface IntakeResult {
  watchId: string;
  intakeSent: boolean;
}

/**
 * Registers a guest's flight to monitor: creates the FlightWatch, primes it
 * with an initial snapshot, and sends the "presa in carico" WhatsApp.
 */
export async function createWatch(input: IntakeInput): Promise<IntakeResult> {
  const hotel = await prisma.hotel.findUniqueOrThrow({
    where: { id: input.hotelId },
  });

  const flightNumber = normalizeFlightNumber(input.flightNumber);
  const guestPhone = normalizePhone(input.guestPhone);

  // Best-effort initial snapshot so the dashboard isn't empty on day one.
  let snap = null;
  try {
    snap = await getFlightProvider().getSnapshot(flightNumber, input.flightDate);
  } catch {
    snap = null;
  }

  const watch = await prisma.flightWatch.create({
    data: {
      hotelId: hotel.id,
      guestName: input.guestName.trim(),
      guestPhone,
      partySize: input.partySize ?? 1,
      notes: input.notes?.trim() || null,
      flightNumber,
      flightDate: input.flightDate,
      status: snap?.status ?? "SCHEDULED",
      scheduledArrival: snap?.scheduledArrival ?? null,
      estimatedArrival: snap?.estimatedArrival ?? null,
      arrivalAirport: snap?.arrivalAirport ?? null,
      departureAirport: snap?.departureAirport ?? null,
      terminal: snap?.terminal ?? null,
      gate: snap?.gate ?? null,
      delayMinutes: snap?.delayMinutes ?? 0,
      lastPolledAt: snap ? new Date() : null,
    },
  });

  if (snap) {
    await prisma.flightStatusEvent.create({
      data: {
        watchId: watch.id,
        status: snap.status,
        delayMinutes: snap.delayMinutes,
        estimatedArrival: snap.estimatedArrival,
        gate: snap.gate,
        terminal: snap.terminal,
        summary: "presa in carico",
      },
    });
  }

  // "Presa in carico" confirmation to the guest.
  let intakeSent = false;
  try {
    await sendAndRecord({
      toPhone: guestPhone,
      audience: "GUEST",
      template: "guestIntake",
      watchId: watch.id,
      body: tpl.guestIntake({
        hotelName: hotel.name,
        guestName: input.guestName,
        flightNumber,
        arrivalAirport: snap?.arrivalAirport,
        scheduledArrival: snap?.scheduledArrival,
        estimatedArrival: snap?.estimatedArrival,
        timezone: hotel.timezone,
      }),
    });
    intakeSent = true;
  } catch {
    intakeSent = false;
  }

  return { watchId: watch.id, intakeSent };
}
