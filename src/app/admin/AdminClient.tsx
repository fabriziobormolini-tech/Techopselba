"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateHotelForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/hotels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Creazione non riuscita");
      setLoading(false);
      return;
    }
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nuovo hotel
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-3 p-5 sm:grid-cols-2">
      <div>
        <label className="label">Nome hotel</label>
        <input name="name" required className="input" placeholder="Hotel Bellavista" />
      </div>
      <div>
        <label className="label">Slug (URL)</label>
        <input name="slug" required className="input" placeholder="hotel-bellavista" />
      </div>
      <div>
        <label className="label">Città</label>
        <input name="city" className="input" placeholder="Roma" />
      </div>
      <div>
        <label className="label">WhatsApp reception</label>
        <input name="receptionPhone" className="input" placeholder="+39 06 1234567" />
      </div>
      <div>
        <label className="label">Email staff</label>
        <input name="staffEmail" type="email" required className="input" />
      </div>
      <div>
        <label className="label">Password staff (min 8)</label>
        <input name="staffPassword" type="password" required className="input" />
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creo…" : "Crea hotel"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
          Annulla
        </button>
      </div>
    </form>
  );
}

export function CheckoutButton({ hotelId }: { hotelId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (data.url) {
      // Real Stripe -> hosted checkout. Mock -> success redirect.
      if (data.url.includes("mock_paid")) {
        router.refresh();
      } else {
        window.location.href = data.url;
      }
    }
  }

  return (
    <button onClick={onClick} disabled={loading} className="btn-ghost text-xs">
      {loading ? "…" : "Attiva abbonamento"}
    </button>
  );
}
