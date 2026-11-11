"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BedDouble, Check, Loader2, Pencil, UtensilsCrossed, Route, ArrowLeftRight, X } from "lucide-react";
import type { Restaurant, StayOption, TransportOption } from "@/lib/inventory";
import { inr } from "@/lib/inventory";
import { priceBreakdown } from "@/lib/pricing";
import TransportCard, { ModeIcon } from "./TransportCard";
import StayCard from "./StayCard";
import RestaurantCard from "./RestaurantCard";
import SearchForm from "./SearchForm";
import StayDetails from "./StayDetails";

type Props = {
  params: { from: string; to: string; date: string; days: number; travellers: number; roundTrip: boolean };
  returnDate: string;
  outbound: TransportOption[];
  inbound: TransportOption[];
  stays: StayOption[];
  restaurants: Restaurant[];
};
type Sel = { optionId: string; fare: string } | null;
type ModeFilter = "all" | "flight" | "train" | "bus";
type Sort = "cheapest" | "fastest" | "earliest";

const pretty = (s: string) => new Date(s + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const minFare = (o: TransportOption) => Math.min(...o.fares.map((f) => f.price));

function Pills<T extends string>({ value, set, options }: { value: T; set: (v: T) => void; options: { v: T; label: React.ReactNode }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => set(o.v)} className={`chip ${value === o.v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SearchResults(p: Props) {
  const router = useRouter();
  const { params } = p;
  const [leg, setLeg] = useState<"out" | "in">("out");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [sort, setSort] = useState<Sort>("cheapest");
  const [stayKind, setStayKind] = useState<"all" | "hotel" | "hostel">("all");
  const [outSel, setOutSel] = useState<Sel>(null);
  const [inSel, setInSel] = useState<Sel>(null);
  const [stayId, setStayId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"travel" | "stay" | "food">(p.outbound.length ? "travel" : "stay");
  const [viewStay, setViewStay] = useState<string | null>(null);

  const list = leg === "out" ? p.outbound : p.inbound;
  const sel = leg === "out" ? outSel : inSel;
  const setSel = leg === "out" ? setOutSel : setInSel;

  const counts = useMemo(() => ({
    all: list.length,
    flight: list.filter((o) => o.mode === "flight").length,
    train: list.filter((o) => o.mode === "train").length,
    bus: list.filter((o) => o.mode === "bus").length,
  }), [list]);

  const shown = useMemo(() => {
    const l = list.filter((o) => mode === "all" || o.mode === mode);
    return [...l].sort((a, b) => sort === "cheapest" ? minFare(a) - minFare(b) : sort === "fastest" ? a.durationMins - b.durationMins : a.departTime.localeCompare(b.departTime));
  }, [list, mode, sort]);

  const stays = p.stays.filter((s) => stayKind === "all" || s.kind === stayKind).sort((a, b) => a.total - b.total);

  const resolve = (l: TransportOption[], s: Sel) => {
    const option = s && l.find((o) => o.id === s.optionId);
    const fare = option && option.fares.find((f) => f.code === s!.fare);
    return option && fare ? { option, fare } : null;
  };
  const outbound = resolve(p.outbound, outSel);
  const inbound = resolve(p.inbound, inSel);
  const stay = p.stays.find((s) => s.id === stayId) ?? null;
  const price = priceBreakdown({ travellers: params.travellers, outbound, inbound, stay });
  // Book travel only, a stay only, or both
  const ready = Boolean(outbound || inbound || stay);

  async function proceed() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, outbound: outbound ? outSel : null, inbound: params.roundTrip && inbound ? inSel : null, stayId: stay ? stayId : null, restaurantIds: saved }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not continue");
      setLoading(false);
      return;
    }
    router.push(`/book/${json.id}/details`);
  }

  const nothing = p.outbound.length === 0 && p.inbound.length === 0 && p.stays.length === 0;
  const travelDone = Boolean(outbound || inbound);
  const tabs = [
    { k: "travel" as const, label: "Travel", sub: travelDone ? [outbound && "Onward", inbound && "Return"].filter(Boolean).join(" + ") + " selected" : `${p.outbound.length + p.inbound.length} options`, icon: Route, done: travelDone },
    { k: "stay" as const, label: "Stay", sub: stay ? stay.name : `${p.stays.length} hotels & hostels`, icon: BedDouble, done: Boolean(stay) },
    { k: "food" as const, label: "Where to eat", sub: saved.length ? `${saved.length} saved` : `${p.restaurants.length} picks`, icon: UtensilsCrossed, done: saved.length > 0 },
  ];
  const viewing = p.stays.find((s) => s.id === viewStay) ?? null;
  const toggleStay = (id: string) => setStayId((cur) => (cur === id ? null : id));

  return (
    <div className="pb-40">
      {/* Summary bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xl font-extrabold">
                {params.from} {params.roundTrip ? <ArrowLeftRight className="h-5 w-5 text-brand-600" /> : <ArrowRight className="h-5 w-5 text-brand-600" />} {params.to}
              </p>
              <p className="text-sm text-slate-500">
                {pretty(params.date)}{params.roundTrip && ` – ${pretty(p.returnDate)}`} · {params.days} day{params.days > 1 ? "s" : ""} · {params.travellers} traveller{params.travellers > 1 ? "s" : ""}
              </p>
            </div>
            <button className="btn-ghost" onClick={() => setEditing((e) => !e)}><Pencil className="h-4 w-4" /> Modify search</button>
          </div>
          {editing && <div className="mt-4 border-t border-slate-100 pt-4"><SearchForm compact initial={params} /></div>}
        </div>
      </div>

      {nothing ? (
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <p className="text-xl font-bold">No results for these cities</p>
          <p className="mt-2 text-slate-500">Try a different pair of cities or date.</p>
        </div>
      ) : (
        <>
          {/* Section tabs: one section on screen at a time */}
          <div className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto grid max-w-6xl grid-cols-3 gap-1 px-4 py-2 sm:gap-3">
              {tabs.map((t) => (
                <button key={t.k} onClick={() => { setTab(t.k); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`flex items-center gap-3 rounded-xl px-2 py-2 text-left transition sm:px-4 ${tab === t.k ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50"}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${t.done ? "bg-emerald-500 text-white" : tab === t.k ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {t.done ? <Check className="h-4 w-4" /> : <t.icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold ${tab === t.k ? "text-brand-700" : "text-slate-800"}`}>{t.label}</span>
                    <span className="hidden truncate text-xs text-slate-500 sm:block">{t.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 pt-6">
            {tab === "travel" && (
              <section>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">Choose your travel</h2>
                    <p className="text-sm text-slate-500">Optional. Skip it if you&apos;ve already sorted your travel and just need a stay.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {params.roundTrip && (
                    <div className="grid max-w-xl grid-cols-2 gap-1 rounded-xl bg-slate-200/60 p-1">
                      {(["out", "in"] as const).map((l) => (
                        <button key={l} onClick={() => setLeg(l)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${leg === l ? "bg-white shadow-sm" : "text-slate-600"}`}>
                          {l === "out" ? `Onward · ${pretty(params.date)}` : `Return · ${pretty(p.returnDate)}`}
                          {(l === "out" ? outSel : inSel) && <span className="ml-1 text-emerald-600">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Pills value={mode} set={setMode} options={(["all", "flight", "train", "bus"] as const).map((m) => ({ v: m, label: <>{m !== "all" && <ModeIcon mode={m} className="h-3 w-3" />}{m === "all" ? "All" : { flight: "Flights", train: "Trains", bus: "Buses" }[m]} <span className="opacity-60">{counts[m]}</span></> }))} />
                    <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600" aria-label="Sort by">
                      <option value="cheapest">Cheapest first</option>
                      <option value="fastest">Fastest first</option>
                      <option value="earliest">Earliest departure</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
                  {shown.length === 0 && <p className="card p-6 text-center text-sm text-slate-500 lg:col-span-2">No {mode === "all" ? "travel options" : { flight: "flights", train: "trains", bus: "buses" }[mode]} on this route. Try another mode.</p>}
                  {shown.map((o) => (
                    <TransportCard
                      key={o.id}
                      o={o}
                      travellers={params.travellers}
                      selectedFare={sel?.optionId === o.id ? sel.fare : undefined}
                      onSelect={(fare) => {
                        const same = sel?.optionId === o.id && sel.fare === fare;
                        setSel(same ? null : { optionId: o.id, fare });
                        if (!same && leg === "out" && params.roundTrip && !inSel) setTimeout(() => setLeg("in"), 350);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {tab === "stay" && (
              <section>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">Pick your stay in {params.to}</h2>
                    <p className="text-sm text-slate-500">Optional · {params.days} night{params.days > 1 ? "s" : ""} from {pretty(params.date)} · {params.travellers} guest{params.travellers > 1 ? "s" : ""}. Tap a stay for photos, map and details.</p>
                  </div>
                  <Pills value={stayKind} set={setStayKind} options={[{ v: "all", label: "All" }, { v: "hotel", label: "Hotels" }, { v: "hostel", label: "Hostels" }]} />
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {stays.map((s) => <StayCard key={s.id} s={s} selected={stayId === s.id} onToggle={() => toggleStay(s.id)} onView={() => setViewStay(s.id)} />)}
                </div>
              </section>
            )}

            {tab === "food" && (
              <section>
                <h2 className="text-2xl font-extrabold tracking-tight">Where to eat in {params.to}</h2>
                <p className="text-sm text-slate-500">Recommendations only, no booking needed. Tap ♥ to add a place to your itinerary.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {p.restaurants.map((r) => (
                    <RestaurantCard key={r.id} r={r} saved={saved.includes(r.id)} onToggle={() => setSaved((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}

      {viewing && <StayDetails s={viewing} city={params.to} selected={stayId === viewing.id} onToggle={() => toggleStay(viewing.id)} onClose={() => setViewStay(null)} />}

      {/* Sticky checkout bar */}
      {!nothing && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <div className="flex flex-1 flex-wrap items-center gap-2 text-xs">
              {!outbound && !inbound && !stay && <span className="text-sm text-slate-500">Select travel, a stay, or both to continue.</span>}
              {outbound && <Step label={`Onward: ${outbound.option.operator} · ${outbound.option.departTime}`} onRemove={() => setOutSel(null)} />}
              {inbound && <Step label={`Return: ${inbound.option.operator} · ${inbound.option.departTime}`} onRemove={() => setInSel(null)} />}
              {stay && <Step label={stay.name} onRemove={() => setStayId(null)} />}
              {travelDone && !stay && tab !== "stay" && <button onClick={() => setTab("stay")} className="chip border-dashed border-brand-300 bg-white text-brand-700 hover:bg-brand-50">+ Add a stay</button>}
              {stay && !travelDone && tab !== "travel" && <button onClick={() => setTab("travel")} className="chip border-dashed border-brand-300 bg-white text-brand-700 hover:bg-brand-50">+ Add travel</button>}
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Total incl. taxes</p>
              <p className="text-xl font-extrabold">{inr(price.total)}</p>
            </div>
            <button className="btn-primary px-6 py-3 text-base" disabled={!ready || loading} onClick={proceed}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Continue <ArrowRight className="h-4 w-4" />
            </button>
            {error && <p className="w-full text-right text-sm font-medium text-rose-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-[260px] items-center gap-1.5 rounded-full bg-emerald-50 py-1.5 pl-3 pr-1.5 font-semibold text-emerald-700">
      <Check className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      <button onClick={onRemove} className="rounded-full p-0.5 hover:bg-emerald-100" aria-label={`Remove ${label}`}><X className="h-3.5 w-3.5" /></button>
    </span>
  );
}
