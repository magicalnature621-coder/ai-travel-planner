// Live Indian Railways data via the "IRCTC" API on RapidAPI (irctc1.p.rapidapi.com).
// - trainsBetween(): real trains for a route + date (1 request, cached 24h)
// - checkSeats():    real availability + fare for one train/class (1 request, cached 20 min)
// Booking itself still needs an IRCTC agent licence, so tickets remain demo.
import { cacheGet, cacheSet } from "./cache";
import { findCity } from "./cities";
import type { Fare, TransportOption } from "./inventory";

const HOST = "irctc1.p.rapidapi.com";
const DAY = 24 * 60 * 60 * 1000;
const SEAT_TTL = 20 * 60 * 1000;

export const railwaysEnabled = () => Boolean(process.env.RAPIDAPI_KEY);

export class RailError extends Error {
  constructor(message: string, public quota = false) {
    super(message);
  }
}

async function call<T>(path: string): Promise<T> {
  if (await cacheGet<boolean>("rail:quota-exhausted")) throw new RailError("Monthly request limit reached", true);
  let res: Response;
  try {
    res = await fetch(`https://${HOST}${path}`, {
      headers: { "X-RapidAPI-Key": process.env.RAPIDAPI_KEY ?? "", "X-RapidAPI-Host": HOST },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
  } catch (e) {
    throw new RailError(`Could not reach the railway API (${(e as Error).message})`);
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 429 || /quota|exceeded/i.test(String(body?.message ?? ""))) {
    await cacheSet("rail:quota-exhausted", true, 60 * 60 * 1000); // stop trying for an hour
    throw new RailError("Monthly request limit reached", true);
  }
  if (res.status === 401 || res.status === 403) throw new RailError(String(body?.message ?? "RapidAPI key rejected or not subscribed"));
  if (!res.ok || body?.status === false) throw new RailError(String(body?.message ?? `Railway API error ${res.status}`));
  return body as T;
}

// ---------- class names & fare estimates ----------
export const CLASS_LABEL: Record<string, string> = {
  "1A": "AC First Class (1A)", "2A": "AC 2 Tier (2A)", "3A": "AC 3 Tier (3A)", "3E": "AC 3 Economy (3E)",
  SL: "Sleeper (SL)", CC: "AC Chair Car (CC)", EC: "Executive Chair (EC)", "2S": "Second Sitting (2S)",
  FC: "First Class (FC)", EA: "Anubhuti (EA)", EV: "Vistadome (EV)", VS: "Vistadome (VS)",
};
const PER_KM: Record<string, number> = { SL: 0.6, "3E": 1.35, "3A": 1.6, "2A": 2.3, "1A": 3.8, CC: 1.45, EC: 2.8, "2S": 0.35, FC: 2.2, EA: 3.5, EV: 2.0, VS: 2.0 };
const PREMIUM: Record<string, number> = { RAJ: 1.6, DRNT: 1.4, VBEX: 1.5, SHT: 1.3, DD: 1.1 };
const estimate = (cls: string, km: number, type: string) => Math.round((Math.max(150, km * (PER_KM[cls] ?? 1.5)) * (PREMIUM[type] ?? 1) + 40) / 5) * 5;

// ---------- trains between stations ----------
type ApiTrain = {
  train_number: string; train_name: string; run_days: string[]; from_std: string; to_sta: string;
  from_day: number; to_day: number; from: string; to: string; from_station_name: string; to_station_name: string;
  halt_stn: number; distance: number; duration: string; has_pantry: boolean; train_type: string; class_type: string[];
  from_distance_text?: string; to_distance_text?: string; special_train?: boolean;
};

const title = (s: string) => s.toLowerCase().replace(/(^|[\s(-])\S/g, (m) => m.toUpperCase());

function toOption(t: ApiTrain, fromCity: string, toCity: string, date: string): TransportOption {
  const [h, m] = t.duration.split(":").map(Number);
  const offset = Math.max(0, (t.to_day ?? 0) - (t.from_day ?? 0));
  const fares: Fare[] = t.class_type.map((c) => ({
    code: c,
    label: CLASS_LABEL[c] ?? c,
    price: estimate(c, t.distance, t.train_type),
    seatsLeft: 9, // unknown until checked; doesn't block selection
    perks: [],
    estimated: true,
  }));
  return {
    id: `LTR-${t.train_number}-${t.from}-${t.to}-${date}`,
    mode: "train",
    live: true,
    operator: title(t.train_name),
    number: t.train_number,
    fromCity,
    toCity,
    fromCode: t.from,
    toCode: t.to,
    date,
    departTime: t.from_std,
    arriveTime: t.to_sta,
    arriveDayOffset: offset,
    durationMins: (h || 0) * 60 + (m || 0),
    stops: t.halt_stn,
    distanceKm: t.distance,
    fares,
    details: {
      facts: [
        { label: "Train", value: `${t.train_number} · ${title(t.train_name)}` },
        { label: "Runs on", value: t.run_days.length === 7 ? "Daily" : t.run_days.join(", ") },
        { label: "Boarding station", value: `${title(t.from_station_name)} (${t.from})${t.from_distance_text ? ` · ${t.from_distance_text}` : ""}` },
        { label: "Destination station", value: `${title(t.to_station_name)} (${t.to})${t.to_distance_text ? ` · ${t.to_distance_text}` : ""}` },
        { label: "Distance", value: `${t.distance} km` },
        { label: "Halts", value: `${t.halt_stn} intermediate halts` },
        { label: "Classes", value: t.class_type.join(" · ") },
        { label: "Pantry car", value: t.has_pantry ? "Yes" : "No (e-catering at major stations)" },
      ],
      amenities: [t.has_pantry ? "Pantry car" : "E-catering", "Bedding in AC sleeper classes", "Charging points", "Live running status"],
      policies: [
        "Cancel 48h+ before departure: flat fee (₹60 SL · ₹180 3A · ₹200 2A · ₹240 1A/EC)",
        "Cancel 12–48h before: 25% of fare (minimum flat fee)",
        "Cancel 4–12h before: 50% of fare",
        "No refund on confirmed tickets after chart preparation (4h before departure)",
      ],
      note: "Live schedule from Indian Railways. Seat availability and exact fare are fetched when you pick a class. Coach-wise vacancy is only published after chart preparation (~4h before departure).",
    },
  };
}

export async function trainsBetween(fromName: string, toName: string, date: string): Promise<TransportOption[]> {
  const from = findCity(fromName);
  const to = findCity(toName);
  if (!from || !to) return [];
  const key = `rail:tbs:${from.station}:${to.station}:${date}`;
  let data = await cacheGet<ApiTrain[]>(key);
  if (!data) {
    const body = await call<{ data: ApiTrain[] }>(`/api/v3/trainBetweenStations?fromStationCode=${from.station}&toStationCode=${to.station}&dateOfJourney=${date}`);
    data = Array.isArray(body.data) ? body.data : [];
    await cacheSet(key, data, DAY);
  }
  return data.map((t) => toOption(t, from.name, to.name, date));
}

// ---------- seat availability + fare ----------
export type SeatStatus = { status: string; kind: "available" | "rac" | "waitlist" | "none"; label: string; fare: number | null; checkedAt: string };

type ApiSeat = {
  data: {
    availabilityClassList?: {
      reservationClass: string;
      charges?: { totalFare?: number; totalCollectibleAmount?: number };
      availabilities?: { date: string; status: string; type?: string; confirmedAvailability?: boolean }[];
    }[];
  };
};

export function describeStatus(raw: string): Pick<SeatStatus, "kind" | "label"> {
  const s = raw.toUpperCase().replace(/\s+/g, " ").trim();
  const n = s.match(/(\d+)\s*$/)?.[1];
  if (s.startsWith("AVAILABLE") || s.startsWith("AVL") || s.startsWith("CURR_AVBL")) return { kind: "available", label: n ? `${Number(n)} seats available` : "Available" };
  if (s.includes("RAC")) return { kind: "rac", label: n ? `RAC ${Number(n)}` : "RAC" };
  if (s.includes("WL")) return { kind: "waitlist", label: n ? `Waitlist ${Number(n)}` : "Waitlist" };
  if (s.includes("REGRET") || s.includes("NOT AVAILABLE") || s.includes("TRAIN DEPARTED") || s.includes("CANCEL")) return { kind: "none", label: "Not available" };
  return { kind: "none", label: raw || "Unknown" };
}

export const seatKey = (trainNo: string, from: string, to: string, cls: string, date: string) => `rail:seat:${trainNo}:${from}:${to}:${cls}:${date}`;

export async function cachedSeats(trainNo: string, from: string, to: string, cls: string, date: string) {
  return cacheGet<SeatStatus>(seatKey(trainNo, from, to, cls, date));
}

export async function checkSeats(trainNo: string, from: string, to: string, cls: string, date: string): Promise<SeatStatus> {
  const key = seatKey(trainNo, from, to, cls, date);
  const hit = await cacheGet<SeatStatus>(key);
  if (hit) return hit;
  const body = await call<ApiSeat>(`/api/v2/checkSeatAvailability?classType=${cls}&fromStationCode=${from}&quota=GN&toStationCode=${to}&trainNo=${trainNo}&date=${date}`);
  const entry = body.data?.availabilityClassList?.find((c) => c.reservationClass === cls) ?? body.data?.availabilityClassList?.[0];
  const day = entry?.availabilities?.find((a) => a.date === date) ?? entry?.availabilities?.[0];
  const status = day?.status ?? "NOT AVAILABLE";
  const fare = entry?.charges?.totalFare ?? null;
  const result: SeatStatus = { status, ...describeStatus(status), fare: fare ? Math.round(fare) : null, checkedAt: new Date().toISOString() };
  await cacheSet(key, result, SEAT_TTL);
  return result;
}
