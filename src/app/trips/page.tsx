import Link from "next/link";
import { ArrowRight, Plane } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { asTrip } from "@/lib/types";
import { inr } from "@/lib/inventory";
import { ModeIcon } from "@/components/TransportCard";

export const metadata = { title: "My Trips · AI Travel Planner" };
const pretty = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function TripsPage() {
  const user = await requireUser();
  const trips = (await prisma.trip.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })).map(asTrip);
  const confirmed = trips.filter((t) => t.status === "CONFIRMED");
  const drafts = trips.filter((t) => t.status !== "CONFIRMED");
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">My Trips</h1>
      <p className="mt-1 text-slate-500">Your tickets, stay confirmations and itineraries in one place.</p>

      {confirmed.length === 0 && (
        <div className="card mt-8 flex flex-col items-center p-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Plane className="h-7 w-7" /></span>
          <p className="mt-4 text-lg font-bold">No trips booked yet</p>
          <p className="mt-1 text-slate-500">Your next adventure is one search away.</p>
          <Link href="/" className="btn-primary mt-5">Plan a trip</Link>
        </div>
      )}

      <div className="mt-8 grid gap-4">
        {confirmed.map((t) => {
          const upcoming = t.departDate >= today;
          return (
            <Link key={t.id} href={`/trips/${t.id}`} className="card group flex flex-wrap items-center gap-5 p-5 transition hover:border-brand-300 hover:shadow-md">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-2xl font-black text-white">{t.toCity[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-extrabold">{t.fromCity} → {t.toCity}</p>
                  <span className={`chip ${upcoming ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{upcoming ? "Upcoming" : "Completed"}</span>
                </div>
                <p className="text-sm text-slate-500">{pretty(t.departDate)}{t.returnDate && ` – ${pretty(t.returnDate)}`} · {t.travellers} traveller{t.travellers > 1 ? "s" : ""} · Ref {t.bookingRef}</p>
                <p className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><ModeIcon mode={t.outbound.option.mode} className="h-3.5 w-3.5" />{t.outbound.option.operator}</span>
                  <span>· {t.stay.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-extrabold">{inr(t.totalAmount)}</span>
                <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600" />
              </div>
            </Link>
          );
        })}
      </div>

      {drafts.length > 0 && (
        <>
          <h2 className="mt-12 text-lg font-bold text-slate-700">Unfinished bookings</h2>
          <div className="mt-3 grid gap-2">
            {drafts.slice(0, 5).map((t) => (
              <Link key={t.id} href={`/book/${t.id}/${t.travellerDetails ? "payment" : "details"}`} className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm hover:border-brand-400">
                <span><b>{t.fromCity} → {t.toCity}</b> · {pretty(t.departDate)} · {inr(t.totalAmount)}</span>
                <span className="font-semibold text-brand-600">Resume →</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
