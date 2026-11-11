"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, CalendarDays, MapPin, Minus, Plus, Search, Users, Clock } from "lucide-react";
import { CITIES } from "@/lib/cities";

type Initial = { from?: string; to?: string; date?: string; days?: number; travellers?: number; roundTrip?: boolean };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const pretty = (s: string) => new Date(s + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function Stepper({ value, set, min, max, icon, label, suffix }: { value: number; set: (n: number) => void; min: number; max: number; icon: React.ReactNode; label: string; suffix: [string, string] }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-1.5">
        <span className="pl-1.5 text-slate-400">{icon}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={`Decrease ${label}`} onClick={() => set(Math.max(min, value - 1))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30" disabled={value <= min}><Minus className="h-4 w-4" /></button>
          <span className="w-20 text-center text-[15px] font-semibold">{value} <span className="font-normal text-slate-500">{value > 1 ? suffix[1] : suffix[0]}</span></span>
          <button type="button" aria-label={`Increase ${label}`} onClick={() => set(Math.min(max, value + 1))} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30" disabled={value >= max}><Plus className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

export default function SearchForm({ initial = {}, compact = false }: { initial?: Initial; compact?: boolean }) {
  const router = useRouter();
  const today = iso(new Date());
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [date, setDate] = useState(initial.date ?? addDays(today, 14));
  const [days, setDays] = useState(initial.days ?? 4);
  const [travellers, setTravellers] = useState(initial.travellers ?? 2);
  const [roundTrip, setRoundTrip] = useState(initial.roundTrip ?? true);
  const [error, setError] = useState("");
  const names = useMemo(() => CITIES.map((c) => c.name).sort(), []);
  const returnDate = addDays(date || today, days);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const norm = (v: string) => names.find((n) => n.toLowerCase() === v.trim().toLowerCase());
    const f = norm(from), t = norm(to);
    if (!f || !t) return setError(`Please choose cities from the list. We currently cover ${names.length} popular Indian destinations.`);
    if (f === t) return setError("Source and destination can't be the same.");
    if (!date || date < today) return setError("Please pick a travel date from today onwards.");
    setError("");
    const q = new URLSearchParams({ from: f, to: t, date, days: String(days), travellers: String(travellers), roundTrip: roundTrip ? "1" : "0" });
    router.push(`/search?${q}`);
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "card p-5 sm:p-6"}>
      <datalist id="cities">{names.map((n) => <option key={n} value={n} />)}</datalist>
      <div className="mb-4 flex gap-2">
        {[true, false].map((rt) => (
          <button key={String(rt)} type="button" onClick={() => setRoundTrip(rt)} className={`chip ${roundTrip === rt ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
            {rt ? "Round trip" : "One way"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div>
          <label className="label" htmlFor="from">From</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="from" list="cities" className="input pl-9" placeholder="Where are you leaving from?" value={from} onChange={(e) => setFrom(e.target.value)} autoComplete="off" required />
          </div>
        </div>
        <button type="button" aria-label="Swap cities" onClick={() => { setFrom(to); setTo(from); }} className="mx-auto grid h-10 w-10 place-items-center self-end rounded-full border border-slate-200 bg-white text-slate-500 transition hover:rotate-180 hover:border-brand-500 hover:text-brand-600">
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div>
          <label className="label" htmlFor="to">To</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
            <input id="to" list="cities" className="input pl-9" placeholder="Where are you heading?" value={to} onChange={(e) => setTo(e.target.value)} autoComplete="off" required />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label className="label" htmlFor="date">Departure date</label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="date" type="date" min={today} className="input pl-9" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
        <Stepper label="Days of travel" value={days} set={setDays} min={1} max={30} icon={<Clock className="h-4 w-4" />} suffix={["day", "days"]} />
        <Stepper label="Travellers" value={travellers} set={setTravellers} min={1} max={9} icon={<Users className="h-4 w-4" />} suffix={["person", "people"]} />
        <button className="btn-primary h-[46px] self-end px-7 text-base">
          <Search className="h-5 w-5" /> Search
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {roundTrip ? <>Returning on <b className="text-slate-700">{pretty(returnDate)}</b> · {days} night{days > 1 ? "s" : ""} at your destination</> : <>{days} night{days > 1 ? "s" : ""} at your destination, no return booked</>}
      </p>
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
    </form>
  );
}
