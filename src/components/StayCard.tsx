"use client";

import { BedDouble, Check, Coffee, MapPin, Star, Building2 } from "lucide-react";
import { inr, type StayOption } from "@/lib/inventory";

export default function StayCard({ s, selected, onSelect }: { s: StayOption; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`card w-full overflow-hidden text-left transition ${selected ? "border-brand-500 ring-4 ring-brand-100" : "hover:border-slate-300"}`}>
      <div className="relative h-24" style={{ background: `linear-gradient(135deg, hsl(${s.hue} 70% 62%), hsl(${(s.hue + 50) % 360} 65% 45%))` }}>
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:14px_14px]" />
        <span className="absolute left-3 top-3 chip border-white/40 bg-white/90 text-slate-800">
          {s.kind === "hotel" ? <Building2 className="h-3 w-3" /> : <BedDouble className="h-3 w-3" />} {s.kind === "hotel" ? `${s.stars}★ Hotel` : "Hostel"}
        </span>
        {selected && <span className="absolute right-3 top-3 chip border-brand-600 bg-brand-600 text-white"><Check className="h-3 w-3" /> Selected</span>}
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
          <Star className="h-3 w-3 fill-white" /> {s.rating}
        </span>
      </div>
      <div className="p-4">
        <p className="font-bold leading-snug">{s.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {s.area} · {s.reviews.toLocaleString("en-IN")} reviews</p>
        <p className="mt-2 text-xs text-slate-600">{s.roomType}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {s.breakfast && <span className="chip border-amber-200 bg-amber-50 text-amber-700"><Coffee className="h-3 w-3" /> Breakfast</span>}
          {s.freeCancellation && <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">Free cancellation</span>}
          {s.amenities.slice(0, 2).map((a) => <span key={a} className="chip border-slate-200 bg-slate-50 text-slate-600">{a}</span>)}
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-dashed border-slate-200 pt-3">
          <span className="text-xs text-slate-500">{inr(s.unitPrice)} / {s.unitLabel} / night<br />{s.units} {s.unitLabel}{s.units > 1 ? "s" : ""} × {s.nights} night{s.nights > 1 ? "s" : ""}</span>
          <span className="text-right text-lg font-extrabold">{inr(s.total)}</span>
        </div>
      </div>
    </button>
  );
}
