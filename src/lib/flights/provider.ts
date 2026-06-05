import { env } from "@/lib/env";
import { AeroDataBoxProvider } from "./aerodatabox";
import { MockFlightProvider } from "./mock";
import { FlightProvider } from "./types";

let cached: FlightProvider | null = null;

// Factory: returns the configured flight provider (mock unless aerodatabox is
// explicitly selected with a valid API key — see lib/env.ts).
export function getFlightProvider(): FlightProvider {
  if (cached) return cached;
  cached =
    env.flights.provider === "aerodatabox"
      ? new AeroDataBoxProvider()
      : new MockFlightProvider();
  return cached;
}
