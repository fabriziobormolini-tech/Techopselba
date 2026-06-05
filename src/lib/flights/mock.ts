import {
  FlightProvider,
  FlightSnapshot,
  FlightStatus,
  normalizeFlightNumber,
} from "./types";

// Deterministic mock provider. Produces a believable, *time-evolving* snapshot
// derived from the flight number + date so the monitoring engine can be
// exercised end-to-end (delays, en-route, landing) with no external API.
//
// Behaviour is a pure function of (flightNumber, flightDate, now), which makes
// it reproducible in tests while still "moving" as wall-clock time advances.

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const AIRPORTS = ["FCO", "MXP", "BGY", "VCE", "NAP", "CTA", "LIN", "BLQ"];

export class MockFlightProvider implements FlightProvider {
  readonly name = "mock";

  constructor(private readonly now: () => Date = () => new Date()) {}

  async getSnapshot(
    flightNumberRaw: string,
    flightDate: string,
  ): Promise<FlightSnapshot | null> {
    const flightNumber = normalizeFlightNumber(flightNumberRaw);
    const seed = hashString(`${flightNumber}:${flightDate}`);

    // Unknown-flight simulation: a small slice of inputs return null.
    if (seed % 37 === 0) return null;

    // Scheduled arrival = flightDate at a seed-derived hour/minute.
    const arrHour = 6 + (seed % 16); // 06:00 – 21:00
    const arrMin = (seed >> 3) % 60;
    const scheduledArrival = new Date(`${flightDate}T00:00:00.000Z`);
    scheduledArrival.setUTCHours(arrHour, arrMin, 0, 0);

    // A stable "planned" delay for this flight (0–90 min, skewed toward small).
    const plannedDelay = [0, 0, 0, 10, 20, 35, 50, 75][seed % 8];

    const departureAirport = AIRPORTS[seed % AIRPORTS.length];
    const arrivalAirport = AIRPORTS[(seed >> 5) % AIRPORTS.length];
    const terminal = String(1 + ((seed >> 2) % 3));
    const gate = `${"ABCD"[seed % 4]}${1 + ((seed >> 4) % 30)}`;

    const cancelled = seed % 53 === 0;

    const estimatedArrival = new Date(
      scheduledArrival.getTime() + plannedDelay * 60_000,
    );

    const now = this.now();
    const msToEstArrival = estimatedArrival.getTime() - now.getTime();

    let status: FlightStatus;
    let actualArrival: Date | null = null;

    if (cancelled) {
      status = "CANCELLED";
    } else if (msToEstArrival <= 0) {
      status = "LANDED";
      actualArrival = estimatedArrival;
    } else if (msToEstArrival <= 2 * 60 * 60_000) {
      // Within 2h of arrival the flight is considered en route.
      status = plannedDelay >= 15 ? "DELAYED" : "ACTIVE";
    } else {
      status = plannedDelay >= 15 ? "DELAYED" : "SCHEDULED";
    }

    const delayMinutes =
      status === "CANCELLED"
        ? 0
        : Math.round(
            (estimatedArrival.getTime() - scheduledArrival.getTime()) / 60_000,
          );

    return {
      flightNumber,
      flightDate,
      status,
      scheduledArrival,
      estimatedArrival,
      actualArrival,
      departureAirport,
      arrivalAirport,
      terminal,
      gate,
      delayMinutes,
      raw: { mock: true, plannedDelay, seed },
    };
  }
}
