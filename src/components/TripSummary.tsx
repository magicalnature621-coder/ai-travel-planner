import { BedDouble } from "lucide-react";
import { formatDuration, inr } from "@/lib/inventory";
import { priceBreakdown } from "@/lib/pricing";
import { tripKind, type TripView } from "@/lib/types";
import { ModeIcon } from "./TransportCard";

const pretty = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function LegLine({ title, leg }: { title: string; leg: NonNullable<TripView["outbound"]> }) {
  const o = leg.option;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><ModeIcon mode={o.mode} /></span>
      <div className="min-w-0 text-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title} · {pretty(o.date + "T00:00:00Z")}</p>
        <p className="font-bold">{o.fromCity} → {o.toCity}</p>
        <p className="text-slate-500">{o.departTime} – {o.arriveTime}{o.arriveDayOffset ? ` (+${o.arriveDayOffset})` : ""} · {formatDuration(o.durationMins)}</p>
        <p className="truncate text-slate-500">{o.operator} · {leg.fare.label}</p>
      </div>
    </div>
  );
}

export default function TripSummary({ trip }: { trip: TripView }) {
  const p = priceBreakdown({ travellers: trip.travellers, outbound: trip.outbound, inbound: trip.returnLeg, stay: trip.stay });
  return (
    <aside className="card h-fit p-5 lg:sticky lg:top-20">
      <h2 className="font-extrabold">Trip summary</h2>
      <p className="text-sm text-slate-500">{tripKind(trip)} · {trip.travellers} traveller{trip.travellers > 1 ? "s" : ""} · {trip.toCity}</p>
      <div className="mt-4 space-y-4">
        {trip.outbound && <LegLine title="Onward" leg={trip.outbound} />}
        {trip.returnLeg && <LegLine title="Return" leg={trip.returnLeg} />}
        {trip.stay && <div className="flex gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><BedDouble className="h-4 w-4" /></span>
          <div className="text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Stay · {trip.stay.nights} night{trip.stay.nights > 1 ? "s" : ""}</p>
            <p className="font-bold">{trip.stay.name}</p>
            <p className="text-slate-500">{trip.stay.roomType} · {trip.stay.units} {trip.stay.unitLabel}{trip.stay.units > 1 ? "s" : ""}</p>
          </div>
        </div>}
      </div>
      <dl className="mt-5 space-y-1.5 border-t border-dashed border-slate-200 pt-4 text-sm">
        {trip.outbound && <Row k={`Onward fare × ${trip.travellers}`} v={inr(p.outbound)} />}
        {trip.returnLeg && <Row k={`Return fare × ${trip.travellers}`} v={inr(p.inbound)} />}
        {trip.stay && <Row k="Stay" v={inr(p.stay)} />}
        <Row k="Taxes (GST)" v={inr(p.taxes)} />
        {p.convenience > 0 && <Row k="Convenience fee" v={inr(p.convenience)} />}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold">
          <dt>Total</dt>
          <dd>{inr(trip.totalAmount)}</dd>
        </div>
      </dl>
    </aside>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between text-slate-600"><dt>{k}</dt><dd className="font-semibold text-slate-800">{v}</dd></div>
);
