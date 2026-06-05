import { env } from "@/lib/env";
import {
  FlightProvider,
  FlightSnapshot,
  FlightStatus,
  normalizeFlightNumber,
} from "./types";

// Real adapter for AeroDataBox (via RapidAPI). Maps the vendor response to our
// normalized FlightSnapshot. Activated by FLIGHT_PROVIDER=aerodatabox + key.
//
// Docs: https://doc.aerodatabox.com/  — endpoint:
//   GET /flights/number/{number}/{date}

interface AdbTime {
  utc?: string;
  local?: string;
}
interface AdbMovement {
  airport?: { iata?: string; icao?: string; name?: string };
  scheduledTime?: AdbTime;
  revisedTime?: AdbTime;
  runwayTime?: AdbTime;
  terminal?: string;
  gate?: string;
}
interface AdbFlight {
  number?: string;
  status?: string;
  departure?: AdbMovement;
  arrival?: AdbMovement;
}

function parseTime(t?: AdbTime): Date | null {
  if (!t?.utc) return null;
  // AeroDataBox returns "2024-01-01 13:05Z" style — normalize to ISO.
  const iso = t.utc.replace(" ", "T").replace("Z", "Z");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function mapStatus(raw: string | undefined): FlightStatus {
  switch ((raw || "").toLowerCase()) {
    case "scheduled":
    case "expected":
    case "boarding":
    case "gateclosed":
      return "SCHEDULED";
    case "departed":
    case "enroute":
    case "approaching":
      return "ACTIVE";
    case "arrived":
    case "landed":
      return "LANDED";
    case "delayed":
      return "DELAYED";
    case "canceled":
    case "cancelled":
      return "CANCELLED";
    case "diverted":
      return "DIVERTED";
    default:
      return "UNKNOWN";
  }
}

export class AeroDataBoxProvider implements FlightProvider {
  readonly name = "aerodatabox";

  async getSnapshot(
    flightNumberRaw: string,
    flightDate: string,
  ): Promise<FlightSnapshot | null> {
    const flightNumber = normalizeFlightNumber(flightNumberRaw);
    const url = `https://${env.flights.aerodataboxHost}/flights/number/${encodeURIComponent(
      flightNumber,
    )}/${flightDate}?withAircraftImage=false&withLocation=false`;

    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": env.flights.aerodataboxKey,
        "X-RapidAPI-Host": env.flights.aerodataboxHost,
      },
      // Avoid Next.js caching live flight data.
      cache: "no-store",
    });

    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`AeroDataBox error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as AdbFlight[] | AdbFlight;
    const flights = Array.isArray(data) ? data : [data];
    if (flights.length === 0) return null;
    const f = flights[0];

    const arr = f.arrival ?? {};
    const scheduledArrival = parseTime(arr.scheduledTime);
    const estimatedArrival =
      parseTime(arr.revisedTime) ?? parseTime(arr.runwayTime) ?? scheduledArrival;
    const actualArrival = parseTime(arr.runwayTime);

    const delayMinutes =
      scheduledArrival && estimatedArrival
        ? Math.round(
            (estimatedArrival.getTime() - scheduledArrival.getTime()) / 60_000,
          )
        : 0;

    let status = mapStatus(f.status);
    if (status === "ACTIVE" && delayMinutes >= 15) status = "DELAYED";

    return {
      flightNumber,
      flightDate,
      status,
      scheduledArrival,
      estimatedArrival,
      actualArrival,
      departureAirport: f.departure?.airport?.iata ?? null,
      arrivalAirport: arr.airport?.iata ?? null,
      terminal: arr.terminal ?? null,
      gate: arr.gate ?? null,
      delayMinutes,
      raw: f,
    };
  }
}
