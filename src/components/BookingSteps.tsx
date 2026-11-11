import { Check } from "lucide-react";

const STEPS = ["Select", "Traveller details", "Payment", "Confirmed"];

export default function BookingSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto py-1 text-sm">
      {STEPS.map((s, i) => (
        <li key={s} className="flex shrink-0 items-center gap-2">
          <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${i < current ? "bg-emerald-500 text-white" : i === current ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"}`}>
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={i === current ? "font-bold" : "text-slate-500"}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300 sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}
