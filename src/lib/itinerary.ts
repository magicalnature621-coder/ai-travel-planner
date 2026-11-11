import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { findCity } from "./cities";
import { integrations } from "./config";
import type { Itinerary, TripView } from "./types";

const DaySchema = z.object({
  day: z.number(),
  date: z.string(),
  title: z.string(),
  morning: z.string(),
  afternoon: z.string(),
  evening: z.string(),
  food: z.string(),
  tip: z.string(),
});
const ItinerarySchema = z.object({
  summary: z.string(),
  days: z.array(DaySchema),
  packing: z.array(z.string()),
});

function dayDates(trip: TripView) {
  // N full days at the destination, plus the departure day for round trips
  return Array.from({ length: trip.days + (trip.roundTrip ? 1 : 0) }, (_, i) => {
    const d = new Date(trip.departDate);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  });
}

async function aiItinerary(trip: TripView): Promise<Itinerary | null> {
  const client = new Anthropic();
  const dates = dayDates(trip);
  const o = trip.outbound.option;
  const ret = trip.returnLeg?.option;
  const travellers = (trip.travellerDetails ?? []).map((t) => `${t.gender}, ${t.age}, meal: ${t.meal}`).join("; ");

  const prompt = `Plan a day-by-day trip itinerary for ${trip.travellers} traveller(s) visiting ${trip.toCity}, India from ${trip.fromCity}.

Trip facts:
- Nights at destination: ${trip.days}; dates: ${dates.join(", ")}
- Arrival: ${o.operator} ${o.number}, departs ${o.departTime}, arrives ${o.arriveTime}${o.arriveDayOffset ? ` (+${o.arriveDayOffset} day)` : ""} on ${dates[0]}
- ${ret ? `Departure home: ${ret.operator} ${ret.number} at ${ret.departTime} on ${dates[dates.length - 1]} (hotel check-out 11:00)` : "One-way trip, no return booked"}
- Staying at: ${trip.stay.name}, ${trip.stay.area} (${trip.stay.kind})
- Travellers: ${travellers || "not specified"}
- Special requests: ${trip.specialRequests || "none"}
- Restaurants we recommended: ${trip.restaurants.map((r) => `${r.name} (${r.area}, try ${r.mustTry})`).join("; ")}

Write exactly ${dates.length} days, using these dates in order: ${dates.join(" | ")}.
Day 1 must account for the arrival time; keep it light if arrival is late.${ret ? " The last day is departure day: plan around check-out and the departure time." : ""} Group sights by neighbourhood to cut travel time, name real places, mention approximate entry fees in ₹ where relevant, and respect dietary preferences. Each of morning/afternoon/evening should be 1-2 sentences. "food" names a specific local dish or place for the day. "tip" is one practical local tip. Keep "summary" to 2 sentences. Give 6-8 packing items suited to ${trip.toCity} in that season.`;

  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(ItinerarySchema) },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  return { ...response.parsed_output, source: "ai" };
}

// Offline fallback: a sensible plan built from the city's top attractions.
export function templateItinerary(trip: TripView): Itinerary {
  const city = findCity(trip.toCity);
  const sights = city?.attractions ?? ["the old town", "the main market", "a local museum"];
  const dishes = city?.dishes ?? ["the local thali"];
  const dates = dayDates(trip);
  const s = (i: number) => sights[i % sights.length];
  const days = dates.map((date, i) => {
    const first = i === 0;
    const last = i === dates.length - 1 && trip.roundTrip;
    const resto = trip.restaurants[i % Math.max(1, trip.restaurants.length)];
    return {
      day: i + 1,
      date,
      title: first ? `Arrive & settle into ${trip.stay.area}` : last ? "Slow morning & head home" : `${s(i * 2)} & ${s(i * 2 + 1)}`,
      morning: first ? `Arrive in ${trip.toCity} and check in at ${trip.stay.name}. Freshen up and grab breakfast nearby.` : last ? `Pack up and check out. If time allows, a quick visit to ${s(i * 2)}.` : `Start early at ${s(i * 2)} to beat the crowds and the heat.`,
      afternoon: first ? `Take an easy walk around ${trip.stay.area} to get your bearings.` : last ? "Pick up souvenirs and local snacks to take home." : `Head to ${s(i * 2 + 1)}; budget 2–3 hours here.`,
      evening: first ? `Sunset at ${s(0)}, then an early night.` : last ? "Leave for the station/airport with plenty of buffer time." : `Unwind and explore the evening markets near ${pickArea(city?.areas, i)}.`,
      food: resto ? `Dinner at ${resto.name} (${resto.area}); order the ${resto.mustTry}.` : `Try ${dishes[i % dishes.length]}.`,
      tip: ["Use app cabs or prepaid autos and agree on fares upfront.", "Carry a reusable water bottle and some cash for small vendors.", "Most monuments are closed one day a week; check timings before you go.", "Dress modestly when visiting temples and religious sites.", "Book popular activities a day in advance on weekends."][i % 5],
    };
  });
  return {
    summary: `A ${trip.days}-day trip to ${trip.toCity} covering its highlights at a relaxed pace, based at ${trip.stay.name} in ${trip.stay.area}.`,
    source: "template",
    days,
    packing: ["Government photo ID (originals)", "Comfortable walking shoes", "Sunscreen & sunglasses", "Power bank", "Light jacket", "Basic medicines", "Reusable water bottle"],
  };
}
const pickArea = (areas: string[] | undefined, i: number) => (areas?.length ? areas[i % areas.length] : "the city centre");

export async function buildItinerary(trip: TripView): Promise<Itinerary> {
  if (integrations.ai()) {
    try {
      const plan = await aiItinerary(trip);
      if (plan) return plan;
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) console.error("[itinerary] Invalid ANTHROPIC_API_KEY");
      else if (e instanceof Anthropic.RateLimitError) console.error("[itinerary] Rate limited, using template");
      else if (e instanceof Anthropic.APIError) console.error(`[itinerary] API error ${e.status}: ${e.message}`);
      else console.error("[itinerary]", e);
    }
  }
  return templateItinerary(trip);
}
