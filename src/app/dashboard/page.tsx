import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { RefreshButton } from "@/components/RefreshButton";
import { LogoutButton } from "@/components/LogoutButton";
import { fmtDateTime, fmtTime, statusBadgeClass, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN" && !user.hotelId) redirect("/admin");

  const hotel = user.hotel;
  if (!hotel) redirect("/login");

  const [active, history, recentMessages] = await Promise.all([
    prisma.flightWatch.findMany({
      where: { hotelId: hotel.id, watchState: "ACTIVE" },
      orderBy: [{ flightDate: "asc" }, { scheduledArrival: "asc" }],
    }),
    prisma.flightWatch.findMany({
      where: { hotelId: hotel.id, watchState: "DONE" },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    prisma.message.findMany({
      where: { watch: { hotelId: hotel.id } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const guestLink = `${env.appBaseUrl}/h/${hotel.slug}/checkin`;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Wayrd · Dashboard
          </div>
          <h1 className="text-2xl font-bold">{hotel.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton />
          <LogoutButton />
        </div>
      </header>

      <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-slate-600">
          Link check-in ospiti:{" "}
          <Link href={`/h/${hotel.slug}/checkin`} className="font-medium text-brand-600 underline">
            {guestLink}
          </Link>
        </div>
        <div className="text-xs text-slate-400">
          Provider voli: <b>{env.flights.provider}</b> · WhatsApp:{" "}
          <b>{env.messaging.provider}</b>
        </div>
      </div>

      {/* Voli attivi */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Voli in arrivo ({active.length})</h2>
        <FlightTable
          rows={active}
          tz={hotel.timezone}
          empty="Nessun volo attivo. Condividi il link check-in con i tuoi ospiti."
        />
      </section>

      {/* Storico */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Storico</h2>
        <FlightTable rows={history} tz={hotel.timezone} empty="Ancora nessun arrivo concluso." />
      </section>

      {/* Log messaggi */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold">Messaggi recenti</h2>
        <div className="card divide-y divide-slate-100">
          {recentMessages.length === 0 && (
            <div className="p-4 text-sm text-slate-400">Nessun messaggio.</div>
          )}
          {recentMessages.map((m) => (
            <div key={m.id} className="flex items-start gap-3 p-3 text-sm">
              <span
                className={`badge ${
                  m.audience === "RECEPTION"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-brand-50 text-brand-700"
                }`}
              >
                {m.audience === "RECEPTION" ? "Reception" : "Ospite"}
              </span>
              <span className="flex-1 whitespace-pre-line text-slate-700">
                {m.body}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {fmtTime(m.createdAt, hotel.timezone)} · {m.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function FlightTable({
  rows,
  tz,
  empty,
}: {
  rows: any[];
  tz: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <div className="card p-6 text-sm text-slate-400">{empty}</div>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Ospite</th>
            <th className="px-4 py-3">Volo</th>
            <th className="px-4 py-3">Tratta</th>
            <th className="px-4 py-3">Stato</th>
            <th className="px-4 py-3">Arrivo stimato</th>
            <th className="px-4 py-3">Ritardo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((w) => (
            <tr key={w.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium">{w.guestName}</div>
                <div className="text-xs text-slate-400">
                  {w.guestPhone} · {w.partySize} pax
                </div>
              </td>
              <td className="px-4 py-3 font-mono">{w.flightNumber}</td>
              <td className="px-4 py-3 text-slate-600">
                {(w.departureAirport ?? "—") + " → " + (w.arrivalAirport ?? "—")}
              </td>
              <td className="px-4 py-3">
                <span className={`badge ${statusBadgeClass(w.status)}`}>
                  {statusLabel(w.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {fmtDateTime(w.estimatedArrival ?? w.scheduledArrival, tz)}
              </td>
              <td className="px-4 py-3">
                {w.delayMinutes > 0 ? (
                  <span className="font-medium text-amber-600">
                    +{w.delayMinutes}m
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
