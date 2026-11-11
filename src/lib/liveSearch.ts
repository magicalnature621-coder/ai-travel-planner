import { search, type SearchParams, type TransportOption } from "./inventory";
import { cachedSeats, railwaysEnabled, RailError, trainsBetween } from "./railways";

export type TrainSource = { mode: "live" | "demo"; message?: string };

// Applies seat checks already made (cached) to live train fares, without spending API requests.
async function withCachedSeats(list: TransportOption[]) {
  return Promise.all(
    list.map(async (o) => {
      if (!o.live) return o;
      const fares = await Promise.all(
        o.fares.map(async (f) => {
          const s = await cachedSeats(o.number, o.fromCode, o.toCode, f.code, o.date);
          if (!s) return f;
          return { ...f, price: s.fare ?? f.price, estimated: s.fare == null, availability: { status: s.status, kind: s.kind, label: s.label } };
        }),
      );
      return { ...o, fares };
    }),
  );
}

// Same as search(), but swaps the sample trains for real Indian Railways trains when RAPIDAPI_KEY is set.
export async function searchFull(p: SearchParams) {
  const base = search(p);
  if (!railwaysEnabled()) return { ...base, trainSource: { mode: "demo" } as TrainSource };

  // Each leg falls back to sample trains on its own if live data can't be fetched
  let problem = "";
  const swap = async (list: TransportOption[], from: string, to: string, date: string) => {
    try {
      const live = await trainsBetween(from, to, date);
      return [...list.filter((o) => o.mode !== "train"), ...(await withCachedSeats(live))];
    } catch (e) {
      console.error("[railways]", (e as Error).message);
      problem = e instanceof RailError && e.quota ? "Live train data has hit this month's request limit." : "Live train data is unavailable right now.";
      return list;
    }
  };
  const outbound = await swap(base.outbound, p.from, p.to, p.date);
  const inbound = p.roundTrip ? await swap(base.inbound, p.to, p.from, base.returnDate) : [];
  const trainSource: TrainSource = problem ? { mode: outbound.some((o) => o.live) || inbound.some((o) => o.live) ? "live" : "demo", message: `${problem} Showing sample trains where needed.` } : { mode: "live" };
  return { ...base, outbound, inbound, trainSource };
}
