"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, Coffee, ExternalLink, MapPin, Navigation, ShieldCheck, Star, X } from "lucide-react";
import { inr, type StayOption } from "@/lib/inventory";
import StayPhoto from "./StayPhoto";

export default function StayDetails({ s, city, selected, onToggle, onClose }: { s: StayOption; city: string; selected: boolean; onToggle: () => void; onClose: () => void }) {
  const [photo, setPhoto] = useState(0);
  const photos = s.photos ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPhoto((p) => (p + 1) % Math.max(1, photos.length));
      if (e.key === "ArrowLeft") setPhoto((p) => (p - 1 + photos.length) % Math.max(1, photos.length));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, photos.length]);

  const d = 0.012;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${s.lng - d},${s.lat - d},${s.lng + d},${s.lat + d}&layer=mapnik&marker=${s.lat},${s.lng}`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={s.name}>
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{s.kind === "hotel" ? `${s.stars}-star hotel` : "Hostel"} · {s.area}</p>
            <h2 className="truncate text-xl font-extrabold">{s.name}</h2>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-xs font-bold text-white"><Star className="h-3 w-3 fill-white" />{s.rating}</span>
              {s.reviews.toLocaleString("en-IN")} reviews
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto">
          {/* Gallery */}
          <div className="p-5 pb-0">
            <div className="relative h-64 overflow-hidden rounded-2xl sm:h-80">
              <StayPhoto key={photo} src={photos[photo]} hue={s.hue} alt={`${s.name} photo ${photo + 1}`} className="h-full w-full" />
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhoto((p) => (p - 1 + photos.length) % photos.length)} className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow hover:bg-white" aria-label="Previous photo"><ChevronLeft className="h-5 w-5" /></button>
                  <button onClick={() => setPhoto((p) => (p + 1) % photos.length)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow hover:bg-white" aria-label="Next photo"><ChevronRight className="h-5 w-5" /></button>
                  <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{photo + 1} / {photos.length}</span>
                </>
              )}
            </div>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {photos.map((p, i) => (
                <button key={p + i} onClick={() => setPhoto(i)} className={`h-16 overflow-hidden rounded-lg ring-2 transition ${i === photo ? "ring-brand-600" : "ring-transparent opacity-70 hover:opacity-100"}`} aria-label={`Show photo ${i + 1}`}>
                  <StayPhoto src={p} hue={(s.hue + i * 30) % 360} alt="" className="h-full w-full" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 p-5 md:grid-cols-[1fr_300px]">
            <div className="space-y-6">
              <section>
                <h3 className="font-bold">About this {s.kind}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.breakfast && <span className="chip border-amber-200 bg-amber-50 text-amber-700"><Coffee className="h-3 w-3" /> Breakfast included</span>}
                  <span className={`chip ${s.freeCancellation ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{s.freeCancellation ? "Free cancellation until 24h before check-in" : "Non-refundable"}</span>
                </div>
              </section>

              <section>
                <h3 className="font-bold">Amenities</h3>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-700">
                  {(s.allAmenities ?? s.amenities).map((a) => <li key={a} className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />{a}</li>)}
                </ul>
              </section>

              <section>
                <h3 className="font-bold">Location</h3>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{s.address}</p>
                <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  <iframe title={`Map of ${s.name}`} src={mapSrc} className="h-64 w-full" loading="lazy" />
                </div>
                <a href={gmaps} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">Open in Google Maps <ExternalLink className="h-3.5 w-3.5" /></a>
                <h4 className="mt-4 text-sm font-bold">What&apos;s nearby in {city}</h4>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {(s.nearby ?? []).map((n) => (
                    <li key={n.name} className="flex justify-between gap-3 text-slate-700"><span className="flex items-center gap-2"><Navigation className="h-3.5 w-3.5 text-slate-400" />{n.name}</span><span className="shrink-0 text-slate-500">{n.km} km</span></li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="font-bold">House rules</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {(s.policies ?? []).map((p) => <li key={p} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{p}</li>)}
                </ul>
              </section>
            </div>

            <aside className="h-fit rounded-2xl bg-slate-50 p-4 md:sticky md:top-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your stay</p>
              <p className="mt-1 font-bold">{s.roomType}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="flex items-center gap-1.5 text-slate-500"><Clock className="h-3.5 w-3.5" />Check-in</dt><dd className="font-semibold">from {s.checkIn ?? "12:00"}</dd></div>
                <div className="flex justify-between"><dt className="flex items-center gap-1.5 text-slate-500"><Clock className="h-3.5 w-3.5" />Check-out</dt><dd className="font-semibold">by {s.checkOut ?? "11:00"}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Price</dt><dd className="font-semibold">{inr(s.unitPrice)} / {s.unitLabel} / night</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">{s.unitLabel === "room" ? "Rooms" : "Beds"} × nights</dt><dd className="font-semibold">{s.units} × {s.nights}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold">{inr(s.total)}</dd></div>
              </dl>
              <p className="mt-1 text-[11px] text-slate-400">Excludes 12% GST, added at checkout</p>
              <button onClick={() => { onToggle(); if (!selected) onClose(); }} className={`btn mt-4 w-full py-3 text-base ${selected ? "border border-brand-600 bg-white text-brand-700" : "btn-primary"}`}>
                {selected ? "Remove selection" : <><Check className="h-4 w-4" /> Select this {s.kind}</>}
              </button>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
