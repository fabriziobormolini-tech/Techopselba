import { FlightStatus } from "@/lib/flights/types";

export function fmtDateTime(d: Date | null | undefined, tz = "Europe/Rome"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(d));
}

export function fmtTime(d: Date | null | undefined, tz = "Europe/Rome"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(d));
}

export const STATUS_LABELS: Record<FlightStatus, string> = {
  SCHEDULED: "Programmato",
  ACTIVE: "In volo",
  LANDED: "Atterrato",
  DELAYED: "In ritardo",
  CANCELLED: "Cancellato",
  DIVERTED: "Dirottato",
  UNKNOWN: "Sconosciuto",
};

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "LANDED":
      return "bg-green-100 text-green-800";
    case "ACTIVE":
      return "bg-blue-100 text-blue-800";
    case "DELAYED":
      return "bg-amber-100 text-amber-800";
    case "CANCELLED":
    case "DIVERTED":
      return "bg-red-100 text-red-800";
    case "SCHEDULED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as FlightStatus] ?? status;
}
