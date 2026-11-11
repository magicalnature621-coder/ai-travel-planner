"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BedDouble, Loader2, Pencil, UtensilsCrossed, Route, ArrowLeftRight } from "lucide-react";
import type { Restaurant, StayOption, TransportOption } from "@/lib/inventory";
import { inr } from "@/lib/inventory";
import { priceBreakdown } from "@/lib/pricing";
import TransportCard, { ModeIcon } from "./TransportCard";
import StayCard from "./StayCard";
import RestaurantCard from "./RestaurantCard";
import SearchForm from "./SearchForm";

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

function Column({ icon, title, subtitle, children, actions }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col">
      <div className="sticky top-16 z-20 -mx-1 mb-3 bg-[#f6f7fb]/95 px-1 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">{icon}</span>
          <div>
            <h2 className="font-extrabold leading-tight">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="mt-3">{actions}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

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
  const [mobileTab, setMobileTab] = useState<"travel" | "stay" | "food">("travel");

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
  const ready = Boolean(outbound && stay && (!params.roundTrip || inbound));

  async function proceed() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, outbound: outSel, inbound: params.roundTrip ? inSel : null, stayId, restaurantIds: saved }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not continue");
      setLoading(false);
      return;
    }
    router.push(`/book/${json.id}/details`);
  }

  const nothing = p.outbound.length === 0;

  return (
    <div className="pb-36">
      {/* Summary bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
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
          <p className="text-xl font-bold">No routes found for these cities</p>
          <p className="mt-2 text-slate-500">Try a different pair of cities or date.</p>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4">
          {/* Mobile column switcher */}
          <div className="sticky top-16 z-30 -mx-4 flex gap-1 border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
            {([["travel", "Travel", Route], ["stay", "Stay", BedDouble], ["food", "Food", UtensilsCrossed]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setMobileTab(k)} className={`btn flex-1 !py-2 ${mobileTab === k ? "bg-brand-50 text-brand-700" : "text-slate-500"}`}><Icon className="h-4 w-4" />{label}</button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr_0.85fr]">
            <div className={mobileTab === "travel" ? "" : "hidden lg:block"}>
              <Column
                icon={<Route className="h-4 w-4" />}
                title="1. Choose your travel"
                subtitle={`${counts.flight} flights · ${counts.train} trains · ${counts.bus} buses`}
                actions={
                  <div className="space-y-2">
                    {params.roundTrip && (
                      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/60 p-1">
                        {(["out", "in"] as const).map((l) => (
                          <button key={l} onClick={() => setLeg(l)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${leg === l ? "bg-white shadow-sm" : "text-slate-600"}`}>
                            {l === "out" ? `Onward · ${pretty(params.date)}` : `Return · ${pretty(p.returnDate)}`}
                            {(l === "out" ? outSel : inSel) && <span className="ml-1 text-emerald-600">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Pills value={mode} set={setMode} options={(["all", "flight", "train", "bus"] as const).map((m) => ({ v: m, label: <>{m !== "all" && <ModeIcon mode={m} className="h-3 w-3" />}{m === "all" ? "All" : { flight: "Flights", train: "Trains", bus: "Buses" }[m]} <span className="opacity-60">{counts[m]}</span></> }))} />
                      <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600" aria-label="Sort by">
                        <option value="cheapest">Cheapest</option>
                        <option value="fastest">Fastest</option>
                        <option value="earliest">Earliest</option>
                      </select>
                    </div>
                  </div>
                }
              >
                {shown.length === 0 && <p className="card p-6 text-center text-sm text-slate-500">No {mode}s on this route. Try another mode.</p>}
                {shown.map((o) => (
                  <TransportCard
                    key={o.id}
                    o={o}
                    travellers={params.travellers}
                    selectedFare={sel?.optionId === o.id ? sel.fare : undefined}
                    onSelect={(fare) => {
                      setSel({ optionId: o.id, fare });
                      if (leg === "out" && params.roundTrip && !inSel) setTimeout(() => setLeg("in"), 350);
                    }}
                  />
                ))}
              </Column>
            </div>

            <div className={mobileTab === "stay" ? "" : "hidden lg:block"}>
              <Column
                icon={<BedDouble className="h-4 w-4" />}
                title="2. Pick your stay"
                subtitle={`${params.days} night${params.days > 1 ? "s" : ""} in ${params.to} · ${params.travellers} guest${params.travellers > 1 ? "s" : ""}`}
                actions={<Pills value={stayKind} set={setStayKind} options={[{ v: "all", label: "All" }, { v: "hotel", label: "Hotels" }, { v: "hostel", label: "Hostels" }]} />}
              >
                {stays.map((s) => <StayCard key={s.id} s={s} selected={stayId === s.id} onSelect={() => setStayId(s.id)} />)}
              </Column>
            </div>

            <div className={mobileTab === "food" ? "" : "hidden lg:block"}>
              <Column icon={<UtensilsCrossed className="h-4 w-4" />} title="3. Where to eat" subtitle="Top picks · tap ♥ to add to your itinerary">
                {p.restaurants.map((r) => (
                  <RestaurantCard key={r.id} r={r} saved={saved.includes(r.id)} onToggle={() => setSaved((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />
                ))}
              </Column>
            </div>
          </div>
        </div>
      )}

      {/* Sticky checkout bar */}
      {!nothing && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <div className="flex flex-1 flex-wrap gap-2 text-xs">
              <Step done={!!outbound} label={outbound ? `${outbound.option.operator} · ${outbound.option.departTime}` : "Onward travel"} />
              {params.roundTrip && <Step done={!!inbound} label={inbound ? `${inbound.option.operator} · ${inbound.option.departTime}` : "Return travel"} />}
              <Step done={!!stay} label={stay ? stay.name : "Stay"} />
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

function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-full px-3 py-1.5 font-semibold ${done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${done ? "bg-emerald-500" : "bg-slate-300"}`} />
      <span className="truncate">{label}</span>
    </span>
  );
}
