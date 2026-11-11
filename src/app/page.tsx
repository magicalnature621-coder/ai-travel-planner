import Link from "next/link";
import { BedDouble, CreditCard, MessageCircle, Search, Sparkles, TrainFront, UtensilsCrossed } from "lucide-react";
import SearchForm from "@/components/SearchForm";
import { CITIES } from "@/lib/cities";

const POPULAR = ["Goa", "Jaipur", "Manali", "Udaipur", "Kochi", "Varanasi", "Leh", "Darjeeling"];
const GRADIENTS = ["from-orange-400 to-pink-500", "from-rose-400 to-amber-400", "from-sky-400 to-indigo-500", "from-cyan-400 to-blue-600", "from-emerald-400 to-teal-600", "from-amber-400 to-orange-600", "from-indigo-400 to-violet-600", "from-lime-400 to-emerald-600"];

export default async function Home({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams;
  return (
    <main>
      <section className="relative overflow-hidden bg-brand-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,70,239,.45),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,.6),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-40 pt-16 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-white/20">
            <Sparkles className="h-3.5 w-3.5" /> AI-planned itineraries for every trip
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Your whole trip, <span className="bg-gradient-to-r from-fuchsia-300 to-brand-200 bg-clip-text text-transparent">planned and booked</span> in minutes.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-brand-100/90">
            Flights, trains, buses and stays across India in one search. Pick what you like, pay once, and get your tickets on email and WhatsApp with a day-by-day plan.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-28 max-w-6xl px-4">
        <SearchForm key={to ?? ""} initial={{ to }} />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">How it works</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-500">From search to itinerary, all on one screen.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Search, title: "Search once", text: "Enter where you're going, when, for how many days and how many people." },
            { icon: TrainFront, title: "Compare & pick", text: "Flights, trains, buses, hotels, hostels and top-rated restaurants, side by side." },
            { icon: CreditCard, title: "Pay securely", text: "Card or UPI. We book every leg and your stay in one go." },
            { icon: MessageCircle, title: "Tickets + itinerary", text: "Confirmations on email and WhatsApp, plus an AI-made day-by-day plan." },
          ].map((s, i) => (
            <div key={s.title} className="card p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><s.icon className="h-5 w-5" /></span>
                <span className="text-4xl font-black text-slate-100">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Trending destinations</h2>
            <p className="mt-1 text-slate-500">Tap one to start planning.</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {POPULAR.map((name, i) => {
            const c = CITIES.find((x) => x.name === name)!;
            return (
              <Link key={name} href={`/?to=${name}`} className={`group relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br ${GRADIENTS[i]} p-5 text-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}>
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15 transition group-hover:scale-125" />
                <div className="relative flex h-full flex-col justify-end">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/80">{c.state}</span>
                  <span className="text-2xl font-extrabold">{c.name}</span>
                  <span className="text-sm text-white/90">{c.tagline}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: BedDouble, title: "Hotels & hostels", text: "From 5-star stays to backpacker dorms, priced for your whole group." },
            { icon: UtensilsCrossed, title: "Local food picks", text: "Restaurants and must-try dishes for every destination." },
            { icon: Sparkles, title: "AI itinerary", text: "Built around your arrival time, your hotel's neighbourhood and your food preferences." },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 rounded-2xl bg-white p-6 ring-1 ring-slate-200/80">
              <f.icon className="h-6 w-6 shrink-0 text-brand-600" />
              <div>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} AI Travel Planner · Made in India 🇮🇳
      </footer>
    </main>
  );
}
