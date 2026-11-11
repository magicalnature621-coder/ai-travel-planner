"use client";

import { Bus, Plane, TrainFront, Check } from "lucide-react";
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
                <span className={`block text-[11px] ${f.seatsLeft <= 4 ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                  {soldOut ? "Not enough seats" : f.seatsLeft <= 4 ? `Only ${f.seatsLeft} left` : f.perks.slice(0, 2).join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[15px] font-extrabold">{inr(f.price)}</span>
                <span className="block text-[10px] text-slate-400">per person</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
