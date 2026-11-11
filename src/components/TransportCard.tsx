"use client";

import { useState } from "react";
import { Bus, Plane, TrainFront, Check, ChevronDown, Info, ShieldCheck, Sparkles } from "lucide-react";
import { formatDuration, inr, type TransportOption } from "@/lib/inventory";

export const ModeIcon = ({ mode, className = "h-4 w-4" }: { mode: string; className?: string }) =>
  mode === "flight" ? <Plane className={className} /> : mode === "train" ? <TrainFront className={className} /> : <Bus className={className} />;

const MODE_STYLE: Record<string, string> = {
  flight: "bg-sky-50 text-sky-700",
  train: "bg-amber-50 text-amber-700",
  bus: "bg-emerald-50 text-emerald-700",
};

export default function TransportCard({ o, selectedFare, onSelect, travellers }: { o: TransportOption; selectedFare?: string; onSelect: (fare: string) => void; travellers: number }) {
  const selected = Boolean(selectedFare);
  const [open, setOpen] = useState(false);
  return (
    <div className={`card p-4 transition ${selected ? "border-brand-500 ring-4 ring-brand-100" : "hover:border-slate-300"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${MODE_STYLE[o.mode]}`}><ModeIcon mode={o.mode} /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{o.operator}</p>
            <p className="truncate text-xs text-slate-500">{o.number}</p>
          </div>
        </div>
        {selected && <span className="chip shrink-0 border-brand-600 bg-brand-600 text-white"><Check className="h-3 w-3" /> Selected</span>}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div>
          <p className="text-lg font-extrabold leading-none">{o.departTime}</p>
          <p className="mt-1 text-xs text-slate-500">{o.fromCode}</p>
        </div>
        <div className="flex flex-1 flex-col items-center">
          <span className="text-[11px] font-medium text-slate-500">{formatDuration(o.durationMins)}</span>
          <div className="relative my-1 h-px w-full bg-slate-200">
            <span className="absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full bg-slate-300" />
            <span className="absolute -top-[3px] right-0 h-1.5 w-1.5 rounded-full bg-slate-300" />
          </div>
          <span className="text-[11px] text-slate-400">{o.mode === "flight" ? (o.stops ? `${o.stops} stop` : "Non-stop") : `${o.stops} halts`}</span>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold leading-none">
            {o.arriveTime}
            {o.arriveDayOffset > 0 && <sup className="ml-0.5 text-[10px] font-bold text-rose-500">+{o.arriveDayOffset}</sup>}
          </p>
          <p className="mt-1 text-xs text-slate-500">{o.toCode}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-1.5">
        {o.fares.map((f) => {
          const active = selectedFare === f.code;
          const soldOut = f.seatsLeft < travellers;
          return (
            <button
              key={f.code}
              type="button"
              disabled={soldOut}
              onClick={() => onSelect(f.code)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${active ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">{f.label}</span>
                {f.coaches ? (
                  <span className={`block text-[11px] font-semibold ${f.seatsLeft === 0 ? "text-rose-600" : f.seatsLeft <= 10 ? "text-amber-600" : "text-emerald-600"}`}>
                    {f.seatsLeft === 0 ? "No seats available" : soldOut ? `Only ${f.seatsLeft} left, not enough for your group` : `${f.seatsLeft} seats available`}
                  </span>
                ) : (
                  <span className={`block text-[11px] ${f.seatsLeft <= 4 ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                    {soldOut ? "Not enough seats" : f.seatsLeft <= 4 ? `Only ${f.seatsLeft} left` : f.perks.slice(0, 2).join(" · ")}
                  </span>
                )}
                {f.coaches && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {f.coaches.map((co) => (
                      <span key={co.code} title={`Coach ${co.code}: ${co.available} of ${co.capacity} available`} className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${co.available === 0 ? "bg-rose-50 text-rose-500" : co.available <= 5 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {co.code} · {co.available}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[15px] font-extrabold">{inr(f.price)}</span>
                <span className="block text-[10px] text-slate-400">per person</span>
              </span>
            </button>
          );
        })}
      </div>

      {o.details && (
        <>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-50">
            {open ? "Hide details" : `${o.mode === "flight" ? "Flight" : o.mode === "train" ? "Train" : "Bus"} details, amenities & cancellation`}
            <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="mt-2 space-y-4 border-t border-slate-100 pt-4 text-sm">
              <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
                {o.details.facts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{f.label}</dt>
                    <dd className="font-medium text-slate-800">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><Sparkles className="h-3.5 w-3.5" /> On board</p>
                <div className="flex flex-wrap gap-1.5">
                  {o.details.amenities.map((a) => <span key={a} className="chip border-slate-200 bg-slate-50 text-slate-600">{a}</span>)}
                </div>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> Cancellation & rules</p>
                <ul className="list-disc space-y-1 pl-5 text-slate-600">
                  {o.details.policies.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </div>
              {o.details.note && <p className="flex gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sky-900"><Info className="mt-0.5 h-4 w-4 shrink-0" />{o.details.note}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
