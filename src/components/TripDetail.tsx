"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BedDouble, CalendarDays, CheckCircle2, Coffee, Download, Lightbulb, Mail, MapPin, Moon, PartyPopper, RefreshCw, Sparkles, Sun, Sunrise, Ticket, UtensilsCrossed, MessageCircle, Backpack, Star } from "lucide-react";
import { tripTitle, type Itinerary, type TripView } from "@/lib/types";
import StayPhoto from "./StayPhoto";
import { formatDuration, inr } from "@/lib/inventory";
import { ModeIcon } from "./TransportCard";
import RestaurantCard from "./RestaurantCard";

type Tab = "itinerary" | "tickets" | "stay" | "food";
const pretty = (d: string) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function TripDetail({ trip, justBooked }: { trip: TripView & { departDate: string; returnDate: string | null }; justBooked: boolean }) {
  const [tab, setTab] = useState<Tab>("itinerary");
  const [itinerary, setItinerary] = useState<Itinerary | null>(trip.itinerary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/trips/${trip.id}/itinerary${force ? "?force=1" : ""}`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setItinerary(json.itinerary);
    else setError(json.error || "Could not create itinerary");
    setLoading(false);
  }, [trip.id]);

  useEffect(() => {
    if (!trip.itinerary) generate();
  }, [trip.itinerary, generate]);

  const tabs = ([
    { k: "itinerary", label: "Itinerary", icon: Sparkles, show: true },
    { k: "tickets", label: "Travel tickets", icon: Ticket, show: Boolean(trip.outbound || trip.returnLeg) },
    { k: "stay", label: "Stay confirmation", icon: BedDouble, show: Boolean(trip.stay) },
    { k: "food", label: "Where to eat", icon: UtensilsCrossed, show: true },
  ] as { k: Tab; label: string; icon: React.ElementType; show: boolean }[]).filter((t) => t.show);

  return (
    <main className="pb-20">
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,70,239,.4),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10">
          {justBooked && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-500/15 px-4 py-3 ring-1 ring-emerald-400/40">
              <PartyPopper className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="font-bold">Booking confirmed! You&apos;re going to {trip.toCity}.</p>
                <p className="text-sm text-emerald-100/80">Your confirmation documents are on their way to your email and WhatsApp.</p>
              </div>
            </div>
          )}
          <Link href="/trips" className="text-sm text-brand-200 hover:text-white">← My Trips</Link>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{tripTitle(trip)}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-brand-100">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{pretty(trip.departDate)}{trip.returnDate && ` – ${pretty(trip.returnDate)}`}</span>
            <span>{trip.travellers} traveller{trip.travellers > 1 ? "s" : ""}</span>
            <span>Booking ref <b className="text-white">{trip.bookingRef}</b></span>
            <span>Paid <b className="text-white">{inr(trip.totalAmount)}</b>{trip.payment && ` via ${trip.payment.method}`}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(trip.notifications ?? []).map((n) => (
              <span key={n.channel} title={n.detail} className={`chip border-white/20 ${n.status === "sent" ? "bg-emerald-400/20 text-emerald-100" : n.status === "failed" ? "bg-rose-400/20 text-rose-100" : "bg-white/10 text-brand-100"}`}>
                {n.channel === "email" ? <Mail className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                {n.channel === "email" ? "Email" : "WhatsApp"} {n.status === "sent" ? `sent to ${n.to}` : n.status === "failed" ? "failed" : `to ${n.to} (demo)`}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-bold transition ${tab === t.k ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {tab === "itinerary" && (
          <ItinerarySection itinerary={itinerary} loading={loading} error={error} onRegenerate={() => generate(true)} trip={trip} />
        )}
        {tab === "tickets" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {trip.outbound && <TicketCard trip={trip} which="outbound" />}
            {trip.returnLeg && <TicketCard trip={trip} which="return" />}
          </div>
        )}
        {tab === "stay" && trip.stay && <StayVoucher trip={trip} />}
        {tab === "food" && (
          <div className="grid gap-3 md:grid-cols-2">
            {trip.restaurants.map((r) => <RestaurantCard key={r.id} r={r} saved onToggle={() => {}} />)}
          </div>
        )}
      </div>
    </main>
  );
}

function ItinerarySection({ itinerary, loading, error, onRegenerate, trip }: { itinerary: Itinerary | null; loading: boolean; error: string; onRegenerate: () => void; trip: TripView }) {
  if (loading && !itinerary) {
    return (
      <div>
        <p className="flex items-center gap-2 font-semibold text-brand-700"><Sparkles className="h-5 w-5 animate-pulse" /> Crafting your day-by-day plan for {trip.toCity}…</p>
        <div className="mt-6 space-y-4">{Array.from({ length: Math.min(trip.days, 3) }, (_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
      </div>
    );
  }
  if (!itinerary) return <p className="text-rose-600">{error || "No itinerary yet."}</p>;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Your {itinerary.days.length}-day plan</h2>
            <p className="mt-1 max-w-2xl text-slate-600">{itinerary.summary}</p>
          </div>
          <button onClick={onRegenerate} disabled={loading} className="btn-ghost">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Regenerate
          </button>
        </div>
        <ol className="relative mt-6 space-y-5 border-l-2 border-dashed border-brand-200 pl-6">
          {itinerary.days.map((d) => (
            <li key={d.day} className="relative">
              <span className="absolute -left-[37px] top-4 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white ring-4 ring-[#f6f7fb]">{d.day}</span>
              <div className="card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Day {d.day} · {d.date}</p>
                <h3 className="mt-0.5 text-lg font-extrabold">{d.title}</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Slot icon={<Sunrise className="h-4 w-4 text-amber-500" />} label="Morning" text={d.morning} />
                  <Slot icon={<Sun className="h-4 w-4 text-orange-500" />} label="Afternoon" text={d.afternoon} />
                  <Slot icon={<Moon className="h-4 w-4 text-indigo-500" />} label="Evening" text={d.evening} />
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p className="flex gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-900"><UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0" />{d.food}</p>
                  <p className="flex gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sky-900"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />{d.tip}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-36 lg:h-fit">
        <div className="card p-5">
          <p className="flex items-center gap-2 font-bold"><Backpack className="h-4 w-4 text-brand-600" /> Packing list</p>
          <ul className="mt-3 space-y-2 text-sm">
            {itinerary.packing.map((p) => <li key={p} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{p}</li>)}
          </ul>
        </div>
        <p className="px-1 text-xs text-slate-400">{itinerary.source === "ai" ? "✨ Generated by AI from your bookings. Check opening hours before you go." : "Plan built from top attractions. Add an AI key for personalised plans."}</p>
      </aside>
    </div>
  );
}

const Slot = ({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">{icon}{label}</p>
    <p className="mt-1 text-sm leading-relaxed text-slate-700">{text}</p>
  </div>
);

function TicketCard({ trip, which }: { trip: TripView; which: "outbound" | "return" }) {
  const leg = (which === "outbound" ? trip.outbound : trip.returnLeg)!;
  const pnr = which === "outbound" ? trip.outboundPnr : trip.returnPnr;
  const o = leg.option;
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-fuchsia-600 px-5 py-3 text-white">
        <span className="flex items-center gap-2 font-bold"><ModeIcon mode={o.mode} /> {which === "outbound" ? "Onward" : "Return"} · {o.mode === "flight" ? "E-ticket" : o.mode === "train" ? "ERS" : "Bus ticket"}</span>
        <span className="text-sm">PNR <b className="font-mono text-base tracking-wider">{pnr}</b></span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div><p className="text-3xl font-black">{o.fromCode}</p><p className="text-sm text-slate-500">{o.fromCity}</p></div>
          <div className="flex flex-col items-center text-xs text-slate-500"><ModeIcon mode={o.mode} className="h-5 w-5 text-brand-500" />{formatDuration(o.durationMins)}</div>
          <div className="text-right"><p className="text-3xl font-black">{o.toCode}</p><p className="text-sm text-slate-500">{o.toCity}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Field k="Date" v={pretty(o.date + "T00:00:00Z")} />
          <Field k="Departs" v={o.departTime} />
          <Field k="Arrives" v={`${o.arriveTime}${o.arriveDayOffset ? ` +${o.arriveDayOffset}` : ""}`} />
          <Field k={o.mode === "train" ? "Train" : o.mode === "flight" ? "Flight" : "Bus"} v={o.number} />
          <Field k="Operator" v={o.operator} />
          <Field k="Class" v={leg.fare.label} />
        </div>
      </div>
      <div className="relative border-t-2 border-dashed border-slate-200 px-5 py-4">
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#f6f7fb]" />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-[#f6f7fb]" />
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Passengers</p>
        <ul className="mt-2 space-y-1 text-sm">
          {(trip.travellerDetails ?? []).map((p, i) => (
            <li key={i} className="flex justify-between"><span className="font-semibold">{p.name}</span><span className="text-slate-500">{p.age} · {p.gender[0]} · <span className="font-semibold text-emerald-600">CNF</span></span></li>
          ))}
        </ul>
        <a href={`/api/trips/${trip.id}/pdf?doc=${which}`} target="_blank" className="btn-primary mt-4 w-full"><Download className="h-4 w-4" /> Download PDF ticket</a>
      </div>
    </div>
  );
}

function StayVoucher({ trip }: { trip: TripView & { departDate: string } }) {
  const s = trip.stay!;
  const checkout = new Date(trip.departDate);
  checkout.setUTCDate(checkout.getUTCDate() + s.nights);
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="relative h-48">
        <StayPhoto src={s.photos?.[0]} hue={s.hue} alt={s.name} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{s.kind === "hotel" ? `${s.stars}-star hotel` : "Hostel"}</p>
          <p className="text-2xl font-extrabold">{s.name}</p>
          <p className="flex items-center gap-1 text-sm opacity-90"><MapPin className="h-3.5 w-3.5" />{s.area}, {trip.toCity} · <Star className="h-3.5 w-3.5 fill-white" />{s.rating}</p>
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3">
          <span className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5" /> Confirmed</span>
          <span className="text-sm text-emerald-900">Confirmation no. <b className="font-mono">{trip.stayConfirmation}</b></span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Field k="Check-in" v={`${pretty(trip.departDate)}, ${s.checkIn ?? "12:00"}`} />
          <Field k="Check-out" v={`${pretty(checkout.toISOString())}, ${s.checkOut ?? "11:00"}`} />
          <Field k="Room" v={s.roomType} />
          <Field k={s.unitLabel === "room" ? "Rooms" : "Beds"} v={`${s.units} · ${trip.travellers} guest${trip.travellers > 1 ? "s" : ""}`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {s.breakfast && <span className="chip border-amber-200 bg-amber-50 text-amber-700"><Coffee className="h-3 w-3" /> Breakfast included</span>}
          <span className={`chip ${s.freeCancellation ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{s.freeCancellation ? "Free cancellation until 24h before" : "Non-refundable"}</span>
          {s.amenities.map((a) => <span key={a} className="chip border-slate-200 bg-slate-50 text-slate-600">{a}</span>)}
        </div>
        {s.address && (
          <p className="mt-4 flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <span>{s.address} · <a className="font-semibold text-brand-600 hover:underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}>Open in Google Maps</a></span>
          </p>
        )}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Guests</p>
          <p className="mt-1 text-sm">{(trip.travellerDetails ?? []).map((p) => p.name).join(", ")}</p>
          {trip.specialRequests && <p className="mt-2 text-sm text-slate-600"><b>Special requests:</b> {trip.specialRequests}</p>}
        </div>
        <a href={`/api/trips/${trip.id}/pdf?doc=stay`} target="_blank" className="btn-primary mt-5"><Download className="h-4 w-4" /> Download stay voucher (PDF)</a>
      </div>
    </div>
  );
}

const Field = ({ k, v }: { k: string; v: string }) => (
  <div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-slate-400">{k}</p><p className="truncate font-semibold">{v}</p></div>
);
