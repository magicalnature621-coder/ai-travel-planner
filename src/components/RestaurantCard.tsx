"use client";

import { Heart, Leaf, MapPin, Star } from "lucide-react";
import { inr, type Restaurant } from "@/lib/inventory";

export default function RestaurantCard({ r, saved, onToggle }: { r: Restaurant; saved: boolean; onToggle: () => void }) {
  return (
    <div className="card flex gap-3 p-3.5">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-2xl font-black text-white/90" style={{ background: `linear-gradient(135deg, hsl(${r.hue} 70% 60%), hsl(${(r.hue + 40) % 360} 70% 45%))` }}>
        {r.name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-bold leading-tight">{r.name}</p>
          <button type="button" onClick={onToggle} aria-label={saved ? "Remove from saved" : "Save restaurant"} className={`shrink-0 rounded-full p-1 transition ${saved ? "text-rose-500" : "text-slate-300 hover:text-rose-400"}`}>
            <Heart className={`h-4 w-4 ${saved ? "fill-rose-500" : ""}`} />
          </button>
        </div>
        <p className="truncate text-xs text-slate-500">{r.cuisine}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700"><Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />{r.rating}</span>
          <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{r.area}</span>
          {r.veg && <span className="inline-flex items-center gap-0.5 text-green-700"><Leaf className="h-3 w-3" />Veg</span>}
        </p>
        <p className="mt-1 text-xs"><span className="text-slate-500">Must try:</span> <b>{r.mustTry}</b> · <span className="text-slate-500">{inr(r.priceForTwo)} for two</span></p>
      </div>
    </div>
  );
}
