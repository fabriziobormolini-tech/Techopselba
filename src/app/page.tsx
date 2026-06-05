import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex items-center justify-between">
        <div className="text-2xl font-black tracking-tight text-brand-700">
          Wayrd<span className="text-brand-500">.</span>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/dashboard" className="btn-ghost">
            Dashboard hotel
          </Link>
          <Link href="/admin" className="btn-primary">
            Admin
          </Link>
        </nav>
      </header>

      <section className="mt-20 max-w-2xl">
        <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
          Il volo del tuo ospite,{" "}
          <span className="text-brand-600">monitorato in automatico.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          Wayrd segue ogni volo in arrivo, avvisa l&apos;ospite su WhatsApp per
          ritardi e atterraggi, e tiene la reception sempre un passo avanti.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/h/demo-hotel/checkin" className="btn-primary">
            Prova la pagina ospite →
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Vai alla dashboard
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            t: "Monitoring Engine",
            d: "Polling continuo dei voli con rilevazione ritardi, atterraggi e cancellazioni.",
          },
          {
            t: "Guest capture",
            d: "Una pagina semplice dove l'ospite inserisce il volo in 10 secondi.",
          },
          {
            t: "WhatsApp",
            d: "Presa in carico, alert ospite e alert reception, automatici.",
          },
          {
            t: "Dashboard",
            d: "Voli di oggi, storico e log messaggi a colpo d'occhio.",
          },
        ].map((f) => (
          <div key={f.t} className="card p-5">
            <div className="text-sm font-bold text-brand-700">{f.t}</div>
            <p className="mt-2 text-sm text-slate-600">{f.d}</p>
          </div>
        ))}
      </section>

      <footer className="mt-24 border-t border-slate-200 pt-6 text-sm text-slate-400">
        Wayrd — MVP · Flight monitoring &amp; guest messaging
      </footer>
    </main>
  );
}
