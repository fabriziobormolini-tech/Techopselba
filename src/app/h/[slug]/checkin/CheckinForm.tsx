"use client";

import { useState } from "react";

export function CheckinForm({
  slug,
  hotelName,
}: {
  slug: string;
  hotelName: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      slug,
      guestName: String(form.get("guestName") || ""),
      guestPhone: String(form.get("guestPhone") || ""),
      flightNumber: String(form.get("flightNumber") || ""),
      flightDate: String(form.get("flightDate") || ""),
      partySize: Number(form.get("partySize") || 1),
      notes: String(form.get("notes") || ""),
    };

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invio non riuscito");
      }
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl">✅</div>
        <h2 className="mt-3 text-xl font-bold">Tutto pronto!</h2>
        <p className="mt-2 text-slate-600">
          {hotelName} ora monitora il tuo volo. Ti abbiamo inviato una conferma
          su WhatsApp e ti avviseremo per ogni aggiornamento. ✈️
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="guestName">
          Nome e cognome
        </label>
        <input id="guestName" name="guestName" required className="input" placeholder="Mario Rossi" />
      </div>

      <div>
        <label className="label" htmlFor="guestPhone">
          Numero WhatsApp (con prefisso)
        </label>
        <input
          id="guestPhone"
          name="guestPhone"
          required
          className="input"
          placeholder="+39 333 1234567"
          inputMode="tel"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="flightNumber">
            Numero volo
          </label>
          <input
            id="flightNumber"
            name="flightNumber"
            required
            className="input uppercase"
            placeholder="FR1234"
          />
        </div>
        <div>
          <label className="label" htmlFor="flightDate">
            Data del volo
          </label>
          <input
            id="flightDate"
            name="flightDate"
            type="date"
            required
            defaultValue={today}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="partySize">
            Ospiti
          </label>
          <input
            id="partySize"
            name="partySize"
            type="number"
            min={1}
            defaultValue={1}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Note (opzionale)
        </label>
        <input id="notes" name="notes" className="input" placeholder="Es. arrivo tardi" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full disabled:opacity-60"
      >
        {status === "loading" ? "Invio in corso…" : "Monitora il mio volo"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Inserendo i dati accetti di ricevere aggiornamenti su WhatsApp da{" "}
        {hotelName}.
      </p>
    </form>
  );
}
