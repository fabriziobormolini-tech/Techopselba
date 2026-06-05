import { FlightStatus } from "@/lib/flights/types";

// Message copy (Italian default). Centralized so tone/branding lives in one
// place and the engine just picks a template + fills variables.

export interface TemplateVars {
  hotelName: string;
  guestName: string;
  flightNumber: string;
  arrivalAirport?: string | null;
  scheduledArrival?: Date | null;
  estimatedArrival?: Date | null;
  delayMinutes?: number;
  terminal?: string | null;
  gate?: string | null;
  timezone?: string;
}

function fmtTime(d?: Date | null, tz = "Europe/Rome"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(d);
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || full;
}

// --- Guest-facing -----------------------------------------------------------

// "Presa in carico": sent when a guest submits their flight.
export function guestIntake(v: TemplateVars): string {
  return (
    `Ciao ${firstName(v.guestName)}! 👋\n` +
    `Siamo ${v.hotelName} e da questo momento monitoriamo il tuo volo ${v.flightNumber}.\n` +
    `Arrivo previsto: ${fmtTime(v.estimatedArrival ?? v.scheduledArrival, v.timezone)}${
      v.arrivalAirport ? ` a ${v.arrivalAirport}` : ""
    }.\n` +
    `Ti avviseremo qui su WhatsApp per qualsiasi cambiamento. A presto! ✈️`
  );
}

export function guestDelay(v: TemplateVars): string {
  const mins = v.delayMinutes ?? 0;
  return (
    `Aggiornamento volo ${v.flightNumber} ⏱️\n` +
    `Il tuo arrivo è posticipato di circa ${mins} min.\n` +
    `Nuovo orario stimato: ${fmtTime(v.estimatedArrival, v.timezone)}.\n` +
    `Nessun problema: la tua camera a ${v.hotelName} ti aspetta. 😊`
  );
}

export function guestLanded(v: TemplateVars): string {
  return (
    `Bentornato a terra, ${firstName(v.guestName)}! 🛬\n` +
    `Il volo ${v.flightNumber} è atterrato${
      v.arrivalAirport ? ` a ${v.arrivalAirport}` : ""
    }.\n` +
    `Ti aspettiamo a ${v.hotelName}. Buon viaggio fino a noi! 🚕`
  );
}

export function guestCancelled(v: TemplateVars): string {
  return (
    `Volo ${v.flightNumber}: risulta CANCELLATO. 😔\n` +
    `Contattaci pure rispondendo qui: ${v.hotelName} è a tua disposizione per ` +
    `aiutarti con la prenotazione e gli orari.`
  );
}

// --- Reception-facing -------------------------------------------------------

export function receptionAlert(
  kind: "DELAY" | "LANDED" | "CANCELLED" | "SOON",
  v: TemplateVars,
): string {
  const head = `🏨 ${v.hotelName} — ${v.guestName} (volo ${v.flightNumber})`;
  switch (kind) {
    case "DELAY":
      return `${head}\n⏱️ Ritardo di ${v.delayMinutes ?? 0} min. ETA ${fmtTime(
        v.estimatedArrival,
        v.timezone,
      )}.`;
    case "LANDED":
      return `${head}\n🛬 Atterrato. In arrivo verso l'hotel.`;
    case "CANCELLED":
      return `${head}\n❌ Volo cancellato. Possibile no-show / ricontattare l'ospite.`;
    case "SOON":
      return `${head}\n⏰ Arrivo imminente, ETA ${fmtTime(
        v.estimatedArrival,
        v.timezone,
      )}${v.terminal ? ` T${v.terminal}` : ""}.`;
  }
}

// Maps a status to whether it warrants a guest "status" message (non-delay).
export function statusHeadline(status: FlightStatus): string {
  switch (status) {
    case "LANDED":
      return "Atterrato";
    case "ACTIVE":
      return "In volo";
    case "DELAYED":
      return "In ritardo";
    case "CANCELLED":
      return "Cancellato";
    case "DIVERTED":
      return "Dirottato";
    case "SCHEDULED":
      return "Programmato";
    default:
      return "Sconosciuto";
  }
}
