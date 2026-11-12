"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Loader2, Lock, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { inr } from "@/lib/inventory";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paypal?: any;
  }
}

type PayPalConfig = { clientId: string; currency: string; value: string; sandbox: boolean };

function loadPayPal(clientId: string, currency: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.paypal) return resolve(true);
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons`;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const UPI_APPS = ["GPay", "PhonePe", "Paytm", "BHIM"];

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PaymentForm({ tripId, amount, razorpay, paypal, prefill, legs, stayKind }: { tripId: string; amount: number; razorpay: boolean; paypal?: PayPalConfig | null; prefill: { name: string; email: string; contact: string }; legs: { label: string; mode: string }[]; stayKind: string | null }) {
  const router = useRouter();
  const [method, setMethod] = useState<"card" | "upi">("upi");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: prefill.name });
  const [vpa, setVpa] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);

  const stages = [
    "Verifying payment",
    ...legs.map((l) => `Booking your ${l.label} ${l.mode}`),
    ...(stayKind ? [`Confirming your ${stayKind}`] : []),
    "Sending tickets to email & WhatsApp",
  ];

  useEffect(() => {
    if (stage < 0 || stage >= stages.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [stage, stages.length]);

  // PayPal Smart Payment Buttons (sandbox): order is created and captured on our server
  const paypalRef = useRef<HTMLDivElement>(null);
  const [paypalState, setPaypalState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    if (!paypal) return;
    let cancelled = false;
    loadPayPal(paypal.clientId, paypal.currency).then((ok) => {
      if (cancelled || !paypalRef.current) return;
      if (!ok || !window.paypal) return setPaypalState("failed");
      paypalRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          style: { layout: "vertical", shape: "rect", label: "pay", height: 48 },
          createOrder: async () => {
            setError("");
            const res = await fetch(`/api/trips/${tripId}/paypal-order`, { method: "POST" });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) { setError(json.error || "Couldn't start PayPal checkout"); throw new Error(json.error); }
            return json.id;
          },
          onApprove: async (data: { orderID: string }) => { setBusy(true); await confirm({ paypalOrderId: data.orderID }); },
          onCancel: () => setError("PayPal payment was cancelled. You have not been charged."),
          onError: () => setError("PayPal couldn't complete the payment. Please try again."),
        })
        .render(paypalRef.current)
        .then(() => !cancelled && setPaypalState("ready"))
        .catch(() => !cancelled && setPaypalState("failed"));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paypal?.clientId, tripId]);

  async function confirm(body: object) {
    setStage(0);
    const res = await fetch(`/api/trips/${tripId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStage(-1);
      setBusy(false);
      setError(json.error || "Booking failed. You have not been charged.");
      return;
    }
    setStage(stages.length); // all done
    setTimeout(() => router.push(`/trips/${tripId}?new=1`), 900);
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!razorpay) {
      if (method === "card") {
        const digits = card.number.replace(/\s/g, "");
        if (!/^\d{16}$/.test(digits)) return setError("Enter a 16-digit card number");
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return setError("Enter expiry as MM/YY");
        if (!/^\d{3,4}$/.test(card.cvv)) return setError("Enter a valid CVV");
      } else if (!/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(vpa)) return setError("Enter a valid UPI ID, e.g. name@okaxis");
    }
    setBusy(true);
    const start = await fetch(`/api/trips/${tripId}/pay`, { method: "POST" });
    const order = await start.json().catch(() => ({}));
    if (!start.ok) {
      setBusy(false);
      return setError(order.error || "Could not start payment");
    }

    if (order.mode === "demo") {
      // Only a masked identifier is ever sent to the server.
      const masked = method === "card" ? `•••• ${card.number.replace(/\s/g, "").slice(-4)}` : vpa;
      return confirm({ method, masked });
    }

    if (!(await loadRazorpay())) {
      setBusy(false);
      return setError("Could not load Razorpay. Check your connection.");
    }
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount * 100,
      currency: "INR",
      name: "AI Travel Planner",
      description: "Trip booking",
      order_id: order.orderId,
      prefill,
      theme: { color: "#4f46e5" },
      handler: (resp: Record<string, string>) => confirm(resp),
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.open();
  }

  const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

  const overlay = (
    <>
      {stage >= 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-sm p-6">
            <p className="text-lg font-extrabold">{stage >= stages.length ? "All booked! 🎉" : "Booking your trip…"}</p>
            <ul className="mt-4 space-y-3">
              {stages.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  {i < stage || stage >= stages.length ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : i === stage ? <Loader2 className="h-5 w-5 animate-spin text-brand-600" /> : <span className="h-5 w-5 rounded-full border-2 border-slate-200" />}
                  <span className={i <= stage ? "font-semibold" : "text-slate-400"}>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );

  if (paypal) {
    return (
      <div>
        <div className="card overflow-hidden">
          {paypal.sandbox && (
            <div className="flex items-center gap-2 border-b border-sky-200 bg-sky-50 px-5 py-2.5 text-xs font-medium text-sky-800">
              <ShieldCheck className="h-4 w-4" /> PayPal sandbox: log in with a PayPal sandbox buyer account. No real money moves.
            </div>
          )}
          <div className="p-5">
            <p className="font-bold">Pay securely with PayPal</p>
            <p className="mt-1 text-sm text-slate-500">
              Trip total <b className="text-slate-800">{inr(amount)}</b>
              {paypal.currency !== "INR" && <> · charged as <b className="text-slate-800">{paypal.currency} {paypal.value}</b></>}. Pay with your PayPal balance or a card.
            </p>
            <div ref={paypalRef} className="mt-5 min-h-[120px]">
              {paypalState === "loading" && <div className="skeleton h-12 rounded-xl" />}
            </div>
            {paypalState === "failed" && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">Couldn&apos;t load PayPal. Check your internet connection and PAYPAL_CLIENT_ID.</p>}
            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400"><Lock className="h-3.5 w-3.5" /> Payment verified on our server before your booking is confirmed</p>
          </div>
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={pay} className="card overflow-hidden">
        {!razorpay && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs font-medium text-amber-800">
            <ShieldCheck className="h-4 w-4" /> Demo mode: no real money is charged. Use any card number, e.g. 4111 1111 1111 1111.
          </div>
        )}
        <div className="grid grid-cols-2 border-b border-slate-200">
          {(["upi", "card"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)} className={`flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition ${method === m ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:bg-slate-50"}`}>
              {m === "upi" ? <Smartphone className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />} {m === "upi" ? "UPI" : "Credit / Debit card"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {razorpay ? (
            <p className="text-sm text-slate-600">You&apos;ll complete payment securely in the Razorpay window using {method === "upi" ? "any UPI app or UPI ID" : "your card"}.</p>
          ) : method === "upi" ? (
            <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap gap-2">
                  {UPI_APPS.map((a) => (
                    <button key={a} type="button" onClick={() => setVpa(`${prefill.name.split(" ")[0].toLowerCase()}@${a.toLowerCase().replace("gpay", "okaxis").replace("bhim", "upi")}`)} className="chip border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-brand-300">{a}</button>
                  ))}
                </div>
                <label className="label mt-4" htmlFor="vpa">UPI ID</label>
                <input id="vpa" className="input" placeholder="yourname@okaxis" value={vpa} onChange={(e) => setVpa(e.target.value.trim())} />
                <p className="mt-2 text-xs text-slate-500">You&apos;ll get a payment request in your UPI app.</p>
              </div>
              <div className="hidden flex-col items-center gap-1 rounded-xl border border-dashed border-slate-300 p-3 sm:flex">
                <QrCode className="h-24 w-24 text-slate-800" strokeWidth={1.2} />
                <span className="text-[11px] text-slate-500">or scan to pay</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="cc">Card number</label>
                <input id="cc" inputMode="numeric" autoComplete="cc-number" className="input font-mono tracking-wider" placeholder="1234 5678 9012 3456" value={card.number} onChange={(e) => setCard({ ...card, number: fmtCard(e.target.value) })} />
              </div>
              <div>
                <label className="label" htmlFor="exp">Expiry</label>
                <input id="exp" inputMode="numeric" autoComplete="cc-exp" className="input" placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: fmtExp(e.target.value) })} />
              </div>
              <div>
                <label className="label" htmlFor="cvv">CVV</label>
                <input id="cvv" inputMode="numeric" type="password" autoComplete="cc-csc" maxLength={4} className="input" placeholder="•••" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ccname">Name on card</label>
                <input id="ccname" autoComplete="cc-name" className="input" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
              </div>
            </div>
          )}

          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <button className="btn-primary mt-5 w-full py-3.5 text-base" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Pay {inr(amount)}
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> 256-bit encrypted · PCI-DSS compliant payment partner</p>
        </div>
      </form>

      {overlay}
    </div>
  );
}
