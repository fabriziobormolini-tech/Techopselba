import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CheckinForm } from "./CheckinForm";

export const dynamic = "force-dynamic";

export default async function CheckinPage({
  params,
}: {
  params: { slug: string };
}) {
  const hotel = await prisma.hotel.findUnique({
    where: { slug: params.slug },
  });

  if (!hotel || !hotel.active) notFound();

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <div className="mb-8 text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {hotel.name}
        </div>
        <h1 className="mt-2 text-2xl font-bold">Il tuo arrivo</h1>
        <p className="mt-2 text-slate-600">
          Inserisci i dati del tuo volo: monitoreremo l&apos;arrivo e ti
          terremo aggiornato su WhatsApp.
        </p>
      </div>

      <CheckinForm slug={hotel.slug} hotelName={hotel.name} />

      <p className="mt-6 text-center text-xs text-slate-400">
        Powered by Wayrd
      </p>
    </main>
  );
}
