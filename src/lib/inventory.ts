// Demo inventory engine.
// Generates realistic, deterministic flight/train/bus/hotel/hostel/restaurant
// options for any pair of supported cities. The same inputs always return the
// same results, so prices can be re-verified on the server at booking time.
// In production, swap these functions for real supplier APIs (Amadeus, IRCTC
// agent API, redBus, Hotelbeds, Google Places...). See SETUP.md.

import { City, distanceKm, findCity } from "./cities";

export type Mode = "flight" | "train" | "bus";

export type Coach = { code: string; available: number; capacity: number };
export type Fare = {
  code: string;
  label: string;
  price: number;
  seatsLeft: number;
  perks: string[];
  coaches?: Coach[];
  estimated?: boolean; // live trains: approximate fare until seats are checked
  availability?: { status: string; kind: "available" | "rac" | "waitlist" | "none"; label: string };
};

export type TransportDetails = {
  facts: { label: string; value: string }[];
  amenities: string[];
  policies: string[];
  note?: string;
};

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
  distanceKm: number;
  fares: Fare[];
  details: TransportDetails;
  live?: boolean; // real train from Indian Railways data
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
  hue: number; // used for the card artwork / image fallback
  description: string;
  address: string;
  lat: number;
  lng: number;
  checkIn: string;
  checkOut: string;
  photos: string[];
  allAmenities: string[];
  nearby: { name: string; km: number }[];
  policies: string[];
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
// Coach layout per class: coach-code prefix, number of coaches, berths/seats per coach
const COACH_LAYOUT: Record<string, { prefix: string; count: [number, number]; capacity: number }> = {
  SL: { prefix: "S", count: [6, 10], capacity: 72 },
  "3A": { prefix: "B", count: [4, 7], capacity: 72 },
  "2A": { prefix: "A", count: [1, 3], capacity: 54 },
  "1A": { prefix: "H", count: [1, 1], capacity: 24 },
  CC: { prefix: "C", count: [4, 8], capacity: 78 },
  EC: { prefix: "E", count: [1, 2], capacity: 56 },
};

function coachAvailability(r: () => number, cls: string): Coach[] {
  const l = COACH_LAYOUT[cls];
  const n = between(r, l.count[0], l.count[1]);
  const busy = r(); // how full this class is overall (0 = empty, 1 = packed)
  return Array.from({ length: n }, (_, i) => {
    const free = r() < busy * 0.5 ? 0 : Math.round(l.capacity * (1 - busy) * r() * 0.6);
    return { code: `${l.prefix}${i + 1}`, available: Math.min(free, l.capacity), capacity: l.capacity };
  });
}

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
    const aircraft = km < 600 && r() < 0.4 ? "ATR 72-600 (turboprop)" : pick(r, ["Airbus A320neo", "Airbus A321neo", "Boeing 737-8", "Airbus A320"]);
    const via = stops ? pick(r, ["Delhi", "Mumbai", "Bengaluru", "Hyderabad"].filter((c) => c !== from.name && c !== to.name)) : "";
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
      distanceKm: km,
      details: {
        facts: [
          { label: "Aircraft", value: aircraft },
          { label: "Departure terminal", value: `${from.airport} · Terminal ${pick(r, ["1", "2", "1D", "3"])}` },
          { label: "Arrival terminal", value: `${to.airport} · Terminal ${pick(r, ["1", "2"])}` },
          { label: "Stops", value: stops ? `1 stop via ${via} (${between(r, 50, 140)} min layover)` : "Non-stop" },
          { label: "On-time performance", value: `${between(r, 74, 95)}% last 30 days` },
          { label: "Seat pitch", value: aircraft.startsWith("ATR") ? "29–30 inches" : "29–31 inches (Economy)" },
          { label: "Distance", value: `${km.toLocaleString("en-IN")} km` },
        ],
        amenities: ["Meals & snacks for purchase", "USB charging (select seats)", "Web check-in 48h before", "Wheelchair assistance on request"],
        policies: [
          "Saver: cancellation fee ₹3,500 per person; date change ₹2,999 + fare difference",
          "Flexi: cancellation fee ₹999; one free date change",
          "Business: free cancellation up to 24h before departure",
          "Check-in counters close 45 minutes before departure",
        ],
        note: "Carry a government photo ID. DigiYatra is available at major airports.",
      },
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
    const daily = r() < 0.5;
    const runDays = daily ? "Daily" : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].filter(() => r() < 0.6).join(", ") || "Mon, Thu, Sat";
    const pantry = type.name !== "Mail Express" || r() < 0.3;
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
      distanceKm: km,
      details: {
        facts: [
          { label: "Train type", value: type.name },
          { label: "Runs on", value: runDays },
          { label: "Boarding station", value: `${from.name} (${from.station}) · Platform ${between(r, 1, 12)} (expected)` },
          { label: "Destination station", value: `${to.name} (${to.station})` },
          { label: "Distance", value: `${km.toLocaleString("en-IN")} km` },
          { label: "Average speed", value: `${type.speed} km/h` },
          { label: "Halts", value: `${Math.max(1, Math.round(km / 180))} scheduled halts` },
          { label: "Coaches", value: type.classes.map((c) => c).join(" · ") + " · General" },
        ],
        amenities: [pantry ? "Pantry car (meals on board)" : "No pantry car; e-catering available at major stations", "Bedding provided in AC classes", "Charging points", "Bio-toilets", "Live train status"],
        policies: [
          "Cancel 48h+ before departure: flat fee (₹60 SL · ₹180 3A · ₹200 2A · ₹240 1A/EC)",
          "Cancel 12–48h before: 25% of fare (minimum flat fee)",
          "Cancel 4–12h before: 50% of fare",
          "No refund on confirmed tickets after chart preparation (4h before departure)",
        ],
        note: "Carry the original ID used while booking. Chart is prepared about 4 hours before departure.",
      },
      fares: type.classes.map((c) => {
        const coaches = coachAvailability(r, c);
        return {
          code: c,
          label: TRAIN_CLASS[c].label,
          price: round(Math.max(180, km * TRAIN_CLASS[c].perKm) + 40, 5),
          seatsLeft: coaches.reduce((sum, co) => sum + co.available, 0),
          perks: TRAIN_CLASS[c].perks,
          coaches,
        };
      }),
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
    const boarding = pick(r, from.areas);
    const dropping = pick(r, to.areas);
    const restStops = Math.max(1, Math.round(km / 300));
    out.push({
      id: `BS-${hash(op) % 1000}-${date}-${i}`,
      mode: "bus",
      operator: op,
      number: type.label,
      fromCity: from.name,
      toCity: to.name,
      fromCode: boarding,
      toCode: dropping,
      date,
      departTime: fmtTime(dep),
      arriveTime: fmtTime(dep + duration),
      arriveDayOffset: Math.floor((dep + duration) / 1440),
      durationMins: duration,
      stops: Math.round(km / 250),
      distanceKm: km,
      details: {
        facts: [
          { label: "Bus type", value: type.label },
          { label: "Boarding point", value: `${boarding}, ${from.name} · report by ${fmtTime(dep - 15)}` },
          { label: "Dropping point", value: `${dropping}, ${to.name}` },
          { label: "Rest stops", value: `${restStops} stop${restStops > 1 ? "s" : ""} for food & washrooms` },
          { label: "Distance", value: `${km.toLocaleString("en-IN")} km` },
          { label: "Operator rating", value: `${(3.8 + r() * 1.0).toFixed(1)} / 5 (${between(r, 300, 9000).toLocaleString("en-IN")} ratings)` },
        ],
        amenities: [...type.perks, "Live GPS tracking", "CCTV", "Emergency contact", ...(type.mult >= 1.6 ? ["Blanket", "Reading light"] : [])],
        policies: [
          "Cancel 24h+ before departure: 10% charge",
          "Cancel 12–24h before: 25% charge",
          "Cancel 4–12h before: 50% charge",
          "No refund within 4 hours of departure",
        ],
        note: "The operator shares the bus number and driver contact on WhatsApp 2–3 hours before departure.",
      },
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
// Free-to-use Unsplash photos. If one fails to load, the UI falls back to an illustration.
const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
const HOTEL_PHOTOS = [
  "1566073771259-6a8506099945", "1582719478250-c89cae4dc85b", "1551882547-ff40c63fe5fa", "1611892440504-42a792e24d32",
  "1590490360182-c33d57733427", "1520250497591-112f2f40a3f4", "1542314831-068cd1dbfeeb", "1631049307264-da0ec9d70304",
  "1564501049412-61c2a3083791", "1571896349842-33c89424de2d", "1578683010236-d716f9a3f461", "1445019980597-93fa8acb246c",
];
const HOSTEL_PHOTOS = [
  "1555854877-bab0e564b8d5", "1520277739336-7bf67edfa768", "1596276020587-8044fe049813", "1529408686214-b48b8532f72c",
  "1554995207-c18c203602cb", "1522708323590-d24dbb6b0267", "1505693416388-ac5ce068fe85",
];
const photosFor = (r: () => number, ids: string[]) => {
  const start = Math.floor(r() * ids.length);
  return Array.from({ length: 5 }, (_, i) => U(ids[(start + i * 3) % ids.length]));
};

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
      ...stayExtras(r, city, "hotel", stars, [...HOTEL_AMENITIES].sort(() => r() - 0.5).slice(0, 4 + stars)),
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
      ...stayExtras(r, city, "hostel", 0, [...HOSTEL_AMENITIES].sort(() => r() - 0.5).slice(0, 6)),
    });
  }
  return out;
}

function stayExtras(r: () => number, city: City, kind: "hotel" | "hostel", stars: number, amenities: string[]) {
  const lat = Math.round((city.lat + (r() - 0.5) * 0.06) * 1e5) / 1e5;
  const lng = Math.round((city.lng + (r() - 0.5) * 0.06) * 1e5) / 1e5;
  const area = pick(r, city.areas);
  const nearby = [...city.attractions].sort(() => r() - 0.5).slice(0, 4).map((name) => ({ name, km: Math.round((0.4 + r() * 7) * 10) / 10 })).sort((a, b) => a.km - b.km);
  const description =
    kind === "hotel"
      ? `${stars >= 5 ? "An elegant luxury property" : stars === 4 ? "A stylish, well-reviewed hotel" : "A comfortable, good-value hotel"} in ${area}, ${city.name}. Rooms come with air-conditioning, a smart TV, tea/coffee maker and a private bathroom${stars >= 4 ? ", and guests rate the service and breakfast highly" : ""}. ${nearby[0].name} is just ${nearby[0].km} km away.`
      : `A social, design-forward hostel in ${area}, ${city.name}, popular with solo travellers and groups. Every bed has a privacy curtain, reading light, personal locker and charging point. Join daily community events or relax in the common lounge. ${nearby[0].name} is ${nearby[0].km} km away.`;
  return {
    description,
    address: `${between(r, 4, 220)}, ${pick(r, ["Main Road", "Station Road", "Lake View Road", "Temple Street", "Beach Road", "MG Road"])}, ${area}, ${city.name}, ${city.state}`,
    lat,
    lng,
    checkIn: kind === "hotel" ? "12:00" : "13:00",
    checkOut: kind === "hotel" ? "11:00" : "10:00",
    photos: photosFor(r, kind === "hotel" ? HOTEL_PHOTOS : HOSTEL_PHOTOS),
    allAmenities: ["Free Wi-Fi", "Air-conditioning", "24-hour front desk", "Housekeeping", ...amenities.filter((a) => a !== "Free Wi-Fi")],
    nearby,
    policies: [
      "Valid government photo ID required for every guest at check-in",
      kind === "hostel" ? "Guests must be 18+ to stay in dorms" : "Unmarried couples welcome with valid IDs",
      kind === "hotel" ? "Extra bed available on request (charges apply)" : "Lockers available; bring your own padlock or buy one at reception",
      "Pets not allowed · No smoking inside rooms",
    ],
  };
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
