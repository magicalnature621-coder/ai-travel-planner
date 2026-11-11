// Demo inventory engine.
// Generates realistic, deterministic flight/train/bus/hotel/hostel/restaurant
// options for any pair of supported cities. The same inputs always return the
// same results, so prices can be re-verified on the server at booking time.
// In production, swap these functions for real supplier APIs (Amadeus, IRCTC
// agent API, redBus, Hotelbeds, Google Places...). See SETUP.md.

import { City, distanceKm, findCity } from "./cities";

export type Mode = "flight" | "train" | "bus";

export type Fare = { code: string; label: string; price: number; seatsLeft: number; perks: string[] };

export type TransportOption = {
  id: string;
  mode: Mode;
  operator: string;
  number: string;
  fromCity: string;
  toCity: string;
  fromCode: string;
  toCode: string;
  date: string; // YYYY-MM-DD
  departTime: string; // HH:mm
  arriveTime: string; // HH:mm
  arriveDayOffset: number;
  durationMins: number;
  stops: number;
  fares: Fare[];
};

export type StayOption = {
  id: string;
  kind: "hotel" | "hostel";
  name: string;
  area: string;
  stars: number;
  rating: number;
  reviews: number;
  amenities: string[];
  roomType: string;
  unitLabel: string; // "room" | "bed"
  unitPrice: number; // per unit per night
  units: number;
  nights: number;
  total: number;
  freeCancellation: boolean;
  breakfast: boolean;
  hue: number; // used for the card artwork
};

export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  area: string;
  rating: number;
  priceForTwo: number;
  mustTry: string;
  veg: boolean;
  hue: number;
};

export type SearchParams = {
  from: string;
  to: string;
  date: string; // YYYY-MM-DD
  days: number;
  travellers: number;
  roundTrip: boolean;
};

// ---------- deterministic random ----------
function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const between = (r: () => number, min: number, max: number) => Math.round(min + r() * (max - min));
const round = (n: number, to = 10) => Math.round(n / to) * to;

function fmtTime(mins: number) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------- transport ----------
const AIRLINES = [
  { name: "IndiGo", code: "6E" },
  { name: "Air India", code: "AI" },
  { name: "Akasa Air", code: "QP" },
  { name: "SpiceJet", code: "SG" },
  { name: "Air India Express", code: "IX" },
];
const TRAIN_TYPES = [
  { name: "Vande Bharat Express", speed: 82, classes: ["CC", "EC"] },
  { name: "Rajdhani Express", speed: 72, classes: ["3A", "2A", "1A"] },
  { name: "Shatabdi Express", speed: 75, classes: ["CC", "EC"] },
  { name: "Duronto Express", speed: 68, classes: ["SL", "3A", "2A"] },
  { name: "Superfast Express", speed: 58, classes: ["SL", "3A", "2A"] },
  { name: "Mail Express", speed: 50, classes: ["SL", "3A", "2A"] },
];
const TRAIN_CLASS: Record<string, { label: string; perKm: number; perks: string[] }> = {
  SL: { label: "Sleeper (SL)", perKm: 0.45, perks: ["Berth"] },
  "3A": { label: "AC 3 Tier (3A)", perKm: 1.2, perks: ["AC", "Bedding"] },
  "2A": { label: "AC 2 Tier (2A)", perKm: 1.75, perks: ["AC", "Bedding", "Curtains"] },
  "1A": { label: "AC First Class (1A)", perKm: 2.9, perks: ["AC", "Private cabin", "Meals"] },
  CC: { label: "AC Chair Car (CC)", perKm: 1.35, perks: ["AC", "Meals"] },
  EC: { label: "Executive Chair (EC)", perKm: 2.5, perks: ["AC", "Meals", "Wider seats"] },
};
const BUS_OPERATORS = ["IntrCity SmartBus", "Zingbus", "VRL Travels", "SRS Travels", "Orange Tours", "Jabbar Travels", "State Transport Volvo"];
const BUS_TYPES = [
  { label: "AC Sleeper (2+1)", mult: 2.0, perks: ["AC", "Sleeper", "Charging point"] },
  { label: "Volvo Multi-Axle AC Seater (2+2)", mult: 1.6, perks: ["AC", "Reclining seats", "Water bottle"] },
  { label: "Non-AC Sleeper (2+1)", mult: 1.2, perks: ["Sleeper"] },
];

function flights(from: City, to: City, date: string): TransportOption[] {
  const km = distanceKm(from, to);
  if (!from.airport || !to.airport || km < 250) return [];
  const r = rng(`F|${from.name}|${to.name}|${date}`);
  const count = between(r, 5, 8);
  const out: TransportOption[] = [];
  for (let i = 0; i < count; i++) {
    const airline = pick(r, AIRLINES);
    const stops = km > 1400 && r() < 0.3 ? 1 : 0;
    const duration = round(50 + km / 11.5 + stops * between(r, 70, 160), 5);
    const dep = between(r, 5 * 60, 22 * 60);
    const base = round(1800 + km * between(r, 28, 48) / 10 * (stops ? 0.85 : 1) + r() * 1500, 1);
    out.push({
      id: `FL-${airline.code}${between(r, 100, 999)}-${date}-${i}`,
      mode: "flight",
      operator: airline.name,
      number: `${airline.code} ${between(r, 100, 2999)}`,
      fromCity: from.name,
      toCity: to.name,
      fromCode: from.airport,
      toCode: to.airport,
      date,
      departTime: fmtTime(dep),
      arriveTime: fmtTime(dep + duration),
      arriveDayOffset: Math.floor((dep + duration) / 1440),
      durationMins: duration,
      stops,
      fares: [
        { code: "SAVER", label: "Saver", price: base, seatsLeft: between(r, 2, 9), perks: ["7 kg cabin", "15 kg check-in"] },
        { code: "FLEXI", label: "Flexi", price: round(base * 1.22, 1), seatsLeft: between(r, 3, 12), perks: ["Free date change", "Free seat", "15 kg check-in"] },
        { code: "BIZ", label: "Business", price: round(base * 3.1, 1), seatsLeft: between(r, 1, 6), perks: ["Lounge", "35 kg check-in", "Meals"] },
      ],
    });
  }
  return out.sort((a, b) => a.departTime.localeCompare(b.departTime));
}

function trains(from: City, to: City, date: string): TransportOption[] {
  const km = distanceKm(from, to);
  if (km > 3200) return [];
  const r = rng(`T|${from.name}|${to.name}|${date}`);
  const count = between(r, 3, 6);
  const out: TransportOption[] = [];
  for (let i = 0; i < count; i++) {
    const type = pick(r, TRAIN_TYPES.filter((t) => (km < 900 ? true : !t.name.startsWith("Shatabdi") && !t.name.startsWith("Vande"))));
    const duration = round((km / type.speed) * 60, 5);
    const dep = between(r, 0, 23 * 60);
    const number = String(between(r, 12001, 22999));
    out.push({
      id: `TR-${number}-${date}-${i}`,
      mode: "train",
      operator: `${from.name}–${to.name} ${type.name}`,
      number,
      fromCity: from.name,
      toCity: to.name,
      fromCode: from.station,
      toCode: to.station,
      date,
      departTime: fmtTime(dep),
      arriveTime: fmtTime(dep + duration),
      arriveDayOffset: Math.floor((dep + duration) / 1440),
      durationMins: duration,
      stops: Math.max(1, Math.round(km / 180)),
      fares: type.classes.map((c) => ({
        code: c,
        label: TRAIN_CLASS[c].label,
        price: round(Math.max(180, km * TRAIN_CLASS[c].perKm) + 40, 5),
        seatsLeft: between(r, 0, 60) || between(r, 1, 4),
        perks: TRAIN_CLASS[c].perks,
      })),
    });
  }
  return out.sort((a, b) => a.departTime.localeCompare(b.departTime));
}

function buses(from: City, to: City, date: string): TransportOption[] {
  const km = distanceKm(from, to);
  if (km > 1150) return [];
  const r = rng(`B|${from.name}|${to.name}|${date}`);
  const count = between(r, 4, 7);
  const out: TransportOption[] = [];
  for (let i = 0; i < count; i++) {
    const op = pick(r, BUS_OPERATORS);
    const type = pick(r, BUS_TYPES);
    const duration = round((km / between(r, 45, 58)) * 60, 5);
    const dep = between(r, 16 * 60, 23 * 60 + 30); // mostly overnight buses
    out.push({
      id: `BS-${hash(op) % 1000}-${date}-${i}`,
      mode: "bus",
      operator: op,
      number: type.label,
      fromCity: from.name,
      toCity: to.name,
      fromCode: from.areas[0],
      toCode: to.areas[0],
      date,
      departTime: fmtTime(dep),
      arriveTime: fmtTime(dep + duration),
      arriveDayOffset: Math.floor((dep + duration) / 1440),
      durationMins: duration,
      stops: Math.round(km / 250),
      fares: [{ code: "STD", label: type.label, price: round(250 + km * type.mult * 0.9, 5), seatsLeft: between(r, 2, 30), perks: type.perks }],
    });
  }
  return out.sort((a, b) => a.departTime.localeCompare(b.departTime));
}

export function transportFor(fromName: string, toName: string, date: string): TransportOption[] {
  const from = findCity(fromName);
  const to = findCity(toName);
  if (!from || !to || from.name === to.name) return [];
  return [...flights(from, to, date), ...trains(from, to, date), ...buses(from, to, date)];
}

// ---------- stays ----------
const HOTEL_NAMES = ["Saffron Grand", "Banyan Retreat", "Sapphire Suites", "Lotus Courtyard", "Monsoon House", "Indigo Heights", "Peacock Palace", "Marigold Inn", "Coral Bay Resort", "Sandalwood Residency", "Ivory Towers", "Jasmine Boutique Hotel"];
const HOSTEL_NAMES = ["Nomad Nest", "Bunk & Chai", "Drifters Hub", "Trail Tribe Hostel", "Roam Hostel", "Wanderers' Den", "Backpack Bazaar"];
const HOTEL_AMENITIES = ["Free Wi-Fi", "Pool", "Spa", "Gym", "Airport shuttle", "Restaurant", "Bar", "Room service", "Parking", "Rooftop"];
const HOSTEL_AMENITIES = ["Free Wi-Fi", "Lockers", "Common kitchen", "Rooftop café", "Game room", "Laundry", "Tours desk", "Co-working"];
const CITY_PRICE: Record<string, number> = { Mumbai: 1.45, Delhi: 1.25, Goa: 1.35, Bengaluru: 1.2, Udaipur: 1.3, Leh: 1.15, Jaipur: 1.05 };

export function staysFor(toName: string, date: string, nights: number, travellers: number): StayOption[] {
  const city = findCity(toName);
  if (!city) return [];
  const r = rng(`S|${city.name}|${date}`);
  const mult = CITY_PRICE[city.name] ?? 1;
  const out: StayOption[] = [];
  const hotelCount = between(r, 6, 8);
  for (let i = 0; i < hotelCount; i++) {
    const stars = pick(r, [3, 3, 4, 4, 4, 5, 5]);
    const unitPrice = round((stars === 5 ? between(r, 7500, 14000) : stars === 4 ? between(r, 3800, 6800) : between(r, 1800, 3400)) * mult, 10);
    const units = Math.ceil(travellers / 2);
    const shuffled = [...HOTEL_AMENITIES].sort(() => r() - 0.5);
    out.push({
      id: `HT-${city.name.slice(0, 3).toUpperCase()}-${i}`,
      kind: "hotel",
      name: `${HOTEL_NAMES[(hash(city.name) + i) % HOTEL_NAMES.length]} ${city.name}`,
      area: pick(r, city.areas),
      stars,
      rating: Math.round((3.7 + r() * 1.2 + (stars - 3) * 0.1) * 10) / 10,
      reviews: between(r, 120, 4800),
      amenities: shuffled.slice(0, 3 + stars - 2),
      roomType: stars === 5 ? "Deluxe King Room" : stars === 4 ? "Superior Double Room" : "Standard Double Room",
      unitLabel: "room",
      unitPrice,
      units,
      nights,
      total: unitPrice * units * nights,
      freeCancellation: r() < 0.6,
      breakfast: r() < 0.55 || stars === 5,
      hue: between(r, 0, 360),
    });
  }
  const hostelCount = between(r, 3, 4);
  for (let i = 0; i < hostelCount; i++) {
    const unitPrice = round(between(r, 450, 1100) * mult, 10);
    const shuffled = [...HOSTEL_AMENITIES].sort(() => r() - 0.5);
    out.push({
      id: `HS-${city.name.slice(0, 3).toUpperCase()}-${i}`,
      kind: "hostel",
      name: `${HOSTEL_NAMES[(hash(city.name) + i) % HOSTEL_NAMES.length]} ${city.name}`,
      area: pick(r, city.areas),
      stars: 0,
      rating: Math.round((4.1 + r() * 0.8) * 10) / 10,
      reviews: between(r, 80, 2600),
      amenities: shuffled.slice(0, 4),
      roomType: pick(r, ["6-bed mixed dorm", "4-bed female dorm", "8-bed mixed dorm"]),
      unitLabel: "bed",
      unitPrice,
      units: travellers,
      nights,
      total: unitPrice * travellers * nights,
      freeCancellation: r() < 0.7,
      breakfast: r() < 0.4,
      hue: between(r, 0, 360),
    });
  }
  return out;
}

// ---------- restaurants ----------
const RESTO_PREFIX = ["Spice Route", "The Tiffin Box", "Masala Lane", "Copper Pot", "Chai & Chatter", "Rasoi Ghar", "The Brass Plate", "Banana Leaf", "Tandoor Tales", "Coastal Curry Co.", "Rooftop 21", "Old Town Café"];
const CUISINES = ["North Indian", "South Indian", "Regional", "Street Food", "Café", "Multi-cuisine", "Seafood", "Mughlai"];

export function restaurantsFor(toName: string): Restaurant[] {
  const city = findCity(toName);
  if (!city) return [];
  const r = rng(`R|${city.name}`);
  return Array.from({ length: 8 }, (_, i) => ({
    id: `RS-${city.name.slice(0, 3).toUpperCase()}-${i}`,
    name: RESTO_PREFIX[(hash(city.name) + i * 5) % RESTO_PREFIX.length],
    cuisine: i < 3 ? `${city.state} specials` : pick(r, CUISINES),
    area: pick(r, city.areas),
    rating: Math.round((3.9 + r() * 1.0) * 10) / 10,
    priceForTwo: round(between(r, 400, 2600), 50),
    mustTry: city.dishes[i % city.dishes.length],
    veg: r() < 0.35,
    hue: between(r, 0, 360),
  })).sort((a, b) => b.rating - a.rating);
}

// ---------- full search ----------
export function search(p: SearchParams) {
  const returnDate = addDays(p.date, p.days);
  return {
    returnDate,
    outbound: transportFor(p.from, p.to, p.date),
    inbound: p.roundTrip ? transportFor(p.to, p.from, returnDate) : [],
    stays: staysFor(p.to, p.date, p.days, p.travellers),
    restaurants: restaurantsFor(p.to),
  };
}

export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m ? `${m}m` : ""}`.trim();
}

export function inr(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
