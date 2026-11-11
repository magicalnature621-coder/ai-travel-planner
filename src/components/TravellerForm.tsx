"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Mail, Phone, UserRound } from "lucide-react";
import type { Contact, TravellerDetail } from "@/lib/types";

const ID_TYPES = ["Aadhaar", "Passport", "PAN", "Driving Licence", "Voter ID"];
const MEALS = ["No preference", "Veg", "Non-veg", "Jain"];

export default function TravellerForm({ tripId, count, needsId, initial }: { tripId: string; count: number; needsId: boolean; initial: { travellers?: TravellerDetail[]; contact: Contact; specialRequests: string; leadName: string } }) {
  const router = useRouter();
  const [people, setPeople] = useState<TravellerDetail[]>(
    initial.travellers ?? Array.from({ length: count }, (_, i) => ({ name: i === 0 ? initial.leadName : "", age: NaN as unknown as number, gender: "", idType: "Aadhaar", idNumber: "", meal: "No preference" })),
  );
  const [contact, setContact] = useState({ email: initial.contact.email, phone: initial.contact.phone.replace(/^\+91/, "") });
  const [special, setSpecial] = useState(initial.specialRequests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (i: number, patch: Partial<TravellerDetail>) => setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/trips/${tripId}/details`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ travellers: people, contact, specialRequests: special }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Please check the details");
      setLoading(false);
      return;
    }
    router.push(`/book/${tripId}/payment`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {people.map((p, i) => (
        <fieldset key={i} className="card p-5">
          <legend className="sr-only">Traveller {i + 1}</legend>
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-600"><UserRound className="h-4 w-4" /></span>
            <p className="font-bold">Traveller {i + 1} {i === 0 && <span className="ml-1 text-xs font-semibold text-slate-400">(lead guest)</span>}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <div>
              <label className="label" htmlFor={`name-${i}`}>Full name (as on ID)</label>
              <input id={`name-${i}`} className="input" value={p.name} onChange={(e) => update(i, { name: e.target.value })} required minLength={2} />
            </div>
            <div>
              <label className="label" htmlFor={`age-${i}`}>Age</label>
              <input id={`age-${i}`} type="number" min={0} max={120} className="input" value={Number.isNaN(p.age) ? "" : p.age} onChange={(e) => update(i, { age: e.target.value === "" ? (NaN as unknown as number) : Number(e.target.value) })} required />
            </div>
            <div>
              <label className="label" htmlFor={`gender-${i}`}>Gender</label>
              <select id={`gender-${i}`} className="input" value={p.gender} onChange={(e) => update(i, { gender: e.target.value })} required>
                <option value="" disabled>Select</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor={`idt-${i}`}>ID type</label>
              <select id={`idt-${i}`} className="input" value={p.idType} onChange={(e) => update(i, { idType: e.target.value })}>
                {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor={`idn-${i}`}>ID number</label>
              <input id={`idn-${i}`} className="input" value={p.idNumber} onChange={(e) => update(i, { idNumber: e.target.value })} required={needsId} minLength={4} placeholder={p.idType === "Aadhaar" ? "XXXX XXXX 1234" : ""} />
            </div>
            <div>
              <label className="label" htmlFor={`meal-${i}`}>Meal preference</label>
              <select id={`meal-${i}`} className="input" value={p.meal} onChange={(e) => update(i, { meal: e.target.value })}>
                {MEALS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </fieldset>
      ))}

      <div className="card p-5">
        <p className="font-bold">Where should we send your tickets?</p>
        <p className="text-sm text-slate-500">Confirmations go to this email and WhatsApp number.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="email" type="email" className="input pl-9" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="phone">WhatsApp number</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-[15px] text-slate-500">+91</span>
              <input id="phone" inputMode="numeric" maxLength={10} className="input pl-[4.4rem]" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, "") })} required />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="special">Special requests (optional)</label>
          <textarea id="special" rows={3} className="input" placeholder="E.g. ground-floor room, wheelchair assistance, celebrating an anniversary, travelling with a toddler…" value={special} onChange={(e) => setSpecial(e.target.value)} maxLength={500} />
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
      <div className="flex justify-end">
        <button className="btn-primary px-6 py-3 text-base" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Continue to payment <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
