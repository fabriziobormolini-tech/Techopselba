"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/poll-now", { method: "POST" });
      const data = await res.json();
      const n = data.notifications?.length ?? 0;
      setMsg(`Aggiornati ${data.polled} voli · ${n} notifiche inviate`);
      router.refresh();
    } catch {
      setMsg("Errore durante l'aggiornamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={onClick} disabled={loading} className="btn-primary">
        {loading ? "Aggiorno…" : "⟳ Aggiorna voli"}
      </button>
      {msg && <span className="text-sm text-slate-500">{msg}</span>}
    </div>
  );
}
