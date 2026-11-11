"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Something went wrong");
      setLoading(false);
      return;
    }
    // full navigation so the server-rendered navbar picks up the new session
    window.location.href = next.startsWith("/") ? next : "/";
  }

  const isSignup = mode === "signup";
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="card p-7">
        <h1 className="text-2xl font-extrabold tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-slate-500">{isSignup ? "Plan and book your next trip in minutes." : "Sign in to plan and book your trips."}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {isSignup && (
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" name="name" className="input" placeholder="Aarav Sharma" required autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" placeholder="you@example.com" required autoComplete="email" />
          </div>
          {isSignup && (
            <div>
              <label className="label" htmlFor="phone">Mobile (for WhatsApp updates)</label>
              <div className="flex">
                <span className="grid place-items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">+91</span>
                <input id="phone" name="phone" inputMode="numeric" maxLength={10} className="input rounded-l-none" placeholder="98765 43210" required autoComplete="tel-national" />
              </div>
            </div>
          )}
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" placeholder={isSignup ? "At least 8 characters" : "Your password"} required minLength={isSignup ? 8 : 1} autoComplete={isSignup ? "new-password" : "current-password"} />
          </div>
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
          <button className="btn-primary w-full py-3 text-base" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} {isSignup ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={`/${isSignup ? "login" : "signup"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600 hover:underline">
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
