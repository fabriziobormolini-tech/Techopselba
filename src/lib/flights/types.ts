// Normalized flight domain types. All providers map their raw responses to
// these shapes so the monitoring engine never depends on a specific vendor.

export type FlightStatus =
  | "SCHEDULED" // known, not yet departed
  | "ACTIVE" // en route
  | "LANDED" // arrived
  | "DELAYED" // delayed beyond threshold but not yet landed
  | "CANCELLED"
  | "DIVERTED"
  | "UNKNOWN";

export interface FlightSnapshot {
  flightNumber: string;
  flightDate: string; // yyyy-mm-dd (scheduled departure day, local)
  status: FlightStatus;
  scheduledArrival: Date | null;
  estimatedArrival: Date | null;
  actualArrival: Date | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  terminal: string | null;
  gate: string | null;
  // Positive = late, negative = early, computed at the arrival.
  delayMinutes: number;
  // Raw payload for debugging / audit (never relied upon by callers).
  raw?: unknown;
}

export interface FlightProvider {
  readonly name: string;
  /**
   * Returns the current snapshot for a flight on a given day, or null when the
   * flight cannot be found.
   */
  getSnapshot(flightNumber: string, flightDate: string): Promise<FlightSnapshot | null>;
}

// IATA flight number, uppercased & whitespace-stripped, e.g. "fr 1234" -> "FR1234".
export function normalizeFlightNumber(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function isTerminalStatus(status: FlightStatus): boolean {
  return status === "LANDED" || status === "CANCELLED" || status === "DIVERTED";
}
