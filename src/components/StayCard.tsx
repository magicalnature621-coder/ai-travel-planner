"use client";

import { BedDouble, Check, Coffee, MapPin, Star, Building2, Images } from "lucide-react";
import { inr, type StayOption } from "@/lib/inventory";
import StayPhoto from "./StayPhoto";

export default function StayCard({ s, selected, onToggle, onView }: { s: StayOption; selected: boolean; onToggle: () => void; onView: () => void }) {
  return (
    <div className={`card flex flex-col overflow-hidden transition ${selected ? "border-brand-500 ring-4 ring-brand-100" : "hover:border-slate-300 hover:shadow-md"}`}>
      <button type="button" onClick={onView} className="group relative h-44 overflow-hidden text-left" aria-label={`View photos and details of ${s.name}`}>
        <StayPhoto src={s.photos?.[0]} hue={s.hue} alt={s.name} className="h-full w-full transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 chip border-white/40 bg-white/90 text-slate-800">
          {s.kind === "hotel" ? <Building2 className="h-3 w-3" /> : <BedDouble className="h-3 w-3" />} {s.kind === "hotel" ? `${s.stars}★ Hotel` : "Hostel"}
        </span>
        {selected && <span className="absolute right-3 top-3 chip border-brand-600 bg-brand-600 text-white"><Check className="h-3 w-3" /> Selected</span>}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-0.5 text-xs font-semibold text-white"><Images className="h-3 w-3" /> {s.photos?.length ?? 0} photos</span>
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
          <Star className="h-3 w-3 fill-white" /> {s.rating}
        </span>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <button type="button" onClick={onView} className="text-left font-bold leading-snug hover:text-brand-700">{s.name}</button>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {s.area} · {s.reviews.toLocaleString("en-IN")} reviews</p>
        <p className="mt-2 text-xs text-slate-600">{s.roomType}</p>
        <div className="mt-2 flex flex-wrap gap-1 pb-3">
          {s.breakfast && <span className="chip border-amber-200 bg-amber-50 text-amber-700"><Coffee className="h-3 w-3" /> Breakfast</span>}
          {s.freeCancellation && <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">Free cancellation</span>}
        </div>
        <div className="mt-auto flex items-end justify-between border-t border-dashed border-slate-200 pt-3">
          <span className="text-xs text-slate-500">{inr(s.unitPrice)} / {s.unitLabel} / night<br />{s.units} {s.unitLabel}{s.units > 1 ? "s" : ""} × {s.nights} night{s.nights > 1 ? "s" : ""}</span>
          <span className="text-right text-lg font-extrabold">{inr(s.total)}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onView} className="btn-ghost !py-2">View details</button>
          <button type="button" onClick={onToggle} className={`btn !py-2 ${selected ? "border border-brand-600 bg-brand-50 text-brand-700" : "btn-primary"}`}>
            {selected ? <><Check className="h-4 w-4" /> Selected</> : "Select"}
          </button>
        </div>
      </div>
    </div>
  );
}
