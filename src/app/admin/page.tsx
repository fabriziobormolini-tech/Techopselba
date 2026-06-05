import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { CreateHotelForm, CheckoutButton } from "./AdminClient";

export const dynamic = "force-dynamic";

function subBadge(status?: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "trialing":
      return "bg-blue-100 text-blue-800";
    case "past_due":
      return "bg-amber-100 text-amber-800";
    case "canceled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const hotels = await prisma.hotel.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
      _count: { select: { flightWatches: true } },
    },
  });

  const [totalWatches, totalMessages, activeWatches] = await Promise.all([
    prisma.flightWatch.count(),
    prisma.message.count(),
    prisma.flightWatch.count({ where: { watchState: "ACTIVE" } }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Wayrd · Backoffice
          </div>
          <h1 className="text-2xl font-bold">Amministrazione</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost">
            Dashboard
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Hotel" value={hotels.length} />
        <Stat label="Voli monitorati" value={totalWatches} />
        <Stat label="Voli attivi" value={activeWatches} />
        <Stat label="Messaggi inviati" value={totalMessages} />
      </section>

      <div className="mt-4 text-xs text-slate-400">
        Provider voli <b>{env.flights.provider}</b> · WhatsApp{" "}
        <b>{env.messaging.provider}</b> · Billing <b>{env.billing.provider}</b>
      </div>

      <section className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold">Hotel</h2>
        <CreateHotelForm />
      </section>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Hotel</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Voli</th>
              <th className="px-4 py-3">Abbonamento</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hotels.map((h) => (
              <tr key={h.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-slate-400">{h.city ?? "—"}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{h.slug}</td>
                <td className="px-4 py-3">{h._count.flightWatches}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${subBadge(h.subscription?.status)}`}>
                    {h.subscription?.status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/h/${h.slug}/checkin`}
                    className="text-brand-600 underline"
                  >
                    apri
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  {h.subscription?.status !== "active" && (
                    <CheckoutButton hotelId={h.id} />
                  )}
                </td>
              </tr>
            ))}
            {hotels.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nessun hotel. Creane uno per iniziare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}
