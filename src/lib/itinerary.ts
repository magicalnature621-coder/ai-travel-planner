import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
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

// The planning brief shared by every AI provider
function buildPrompt(trip: TripView) {
  const dates = dayDates(trip);
  const o = trip.outbound?.option;

  const ret = trip.returnLeg?.option;
  const travellers = (trip.travellerDetails ?? []).map((t) => `${t.gender}, ${t.age}, meal: ${t.meal}`).join("; ");

  const prompt = `Plan a day-by-day trip itinerary for ${trip.travellers} traveller(s) visiting ${trip.toCity}, India from ${trip.fromCity}.

Trip facts:
- Nights at destination: ${trip.days}; dates: ${dates.join(", ")}
- Arrival: ${o ? `${o.operator} ${o.number}, departs ${o.departTime}, arrives ${o.arriveTime}${o.arriveDayOffset ? ` (+${o.arriveDayOffset} day)` : ""} on ${dates[0]}` : "Travelling on their own; assume arrival around midday on day 1"}
- ${ret ? `Departure home: ${ret.operator} ${ret.number} at ${ret.departTime} on ${dates[dates.length - 1]} (check-out ${trip.stay?.checkOut ?? "11:00"})` : trip.roundTrip ? `Leaving on ${dates[dates.length - 1]} by their own arrangement` : "One-way trip, no return booked"}
- Staying at: ${trip.stay ? `${trip.stay.name}, ${trip.stay.area} (${trip.stay.kind})` : "their own accommodation (not booked with us); suggest a central base"}
- Travellers: ${travellers || "not specified"}
- Special requests: ${trip.specialRequests || "none"}
- Restaurants we recommended: ${trip.restaurants.map((r) => `${r.name} (${r.area}, try ${r.mustTry})`).join("; ")}

Write exactly ${dates.length} days, using these dates in order: ${dates.join(" | ")}.
Day 1 must account for the arrival time; keep it light if arrival is late.${ret ? " The last day is departure day: plan around check-out and the departure time." : ""} Group sights by neighbourhood to cut travel time, name real places, mention approximate entry fees in ₹ where relevant, and respect dietary preferences. Each of morning/afternoon/evening should be 1-2 sentences. "food" names a specific local dish or place for the day. "tip" is one practical local tip. Keep "summary" to 2 sentences. Give 6-8 packing items suited to ${trip.toCity} in that season.`;
  return prompt;
}

async function claudeItinerary(trip: TripView): Promise<Itinerary | null> {
  const client = new Anthropic();
  const prompt = buildPrompt(trip);

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
  const base = trip.stay ?? { name: "your stay", area: city?.areas[0] ?? "the city centre" };
  const dates = dayDates(trip);
  const s = (i: number) => sights[i % sights.length];
  const days = dates.map((date, i) => {
    const first = i === 0;
    const last = i === dates.length - 1 && trip.roundTrip;
    const resto = trip.restaurants[i % Math.max(1, trip.restaurants.length)];
    return {
      day: i + 1,
      date,
      title: first ? `Arrive & settle into ${base.area}` : last ? "Slow morning & head home" : `${s(i * 2)} & ${s(i * 2 + 1)}`,
      morning: first ? `Arrive in ${trip.toCity} and check in at ${base.name}. Freshen up and grab breakfast nearby.` : last ? `Pack up and check out. If time allows, a quick visit to ${s(i * 2)}.` : `Start early at ${s(i * 2)} to beat the crowds and the heat.`,
      afternoon: first ? `Take an easy walk around ${base.area} to get your bearings.` : last ? "Pick up souvenirs and local snacks to take home." : `Head to ${s(i * 2 + 1)}; budget 2–3 hours here.`,
      evening: first ? `Sunset at ${s(0)}, then an early night.` : last ? "Leave for the station/airport with plenty of buffer time." : `Unwind and explore the evening markets near ${pickArea(city?.areas, i)}.`,
      food: resto ? `Dinner at ${resto.name} (${resto.area}); order the ${resto.mustTry}.` : `Try ${dishes[i % dishes.length]}.`,
      tip: ["Use app cabs or prepaid autos and agree on fares upfront.", "Carry a reusable water bottle and some cash for small vendors.", "Most monuments are closed one day a week; check timings before you go.", "Dress modestly when visiting temples and religious sites.", "Book popular activities a day in advance on weekends."][i % 5],
    };
  });
  return {
    summary: `A ${trip.days}-day trip to ${trip.toCity} covering its highlights at a relaxed pace, based at ${base.name} in ${base.area}.`,
    source: "template",
    days,
    packing: ["Government photo ID (originals)", "Comfortable walking shoes", "Sunscreen & sunglasses", "Power bank", "Light jacket", "Basic medicines", "Reusable water bottle"],
  };
}
const pickArea = (areas: string[] | undefined, i: number) => (areas?.length ? areas[i % areas.length] : "the city centre");

// Groq (free tier available). JSON mode returns an object; we validate it against the same schema.
async function groqItinerary(trip: TripView): Promise<Itinerary | null> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const shape = `Respond with only a JSON object of this exact shape:
{"summary": string, "days": [{"day": number, "date": string, "title": string, "morning": string, "afternoon": string, "evening": string, "food": string, "tip": string}], "packing": [string]}`;
  const completion = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are an expert Indian travel planner. " + shape },
      { role: "user", content: buildPrompt(trip) },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) return null;
  const parsed = ItinerarySchema.safeParse(JSON.parse(text));
  if (!parsed.success || parsed.data.days.length === 0) {
    console.error("[itinerary] Groq returned an unexpected shape, using template");
    return null;
  }
  return { ...parsed.data, source: "ai" };
}

export async function buildItinerary(trip: TripView): Promise<Itinerary> {
  if (integrations.groq()) {
    try {
      const plan = await groqItinerary(trip);
      if (plan) return plan;
    } catch (e) {
      if (e instanceof Groq.AuthenticationError) console.error("[itinerary] Invalid GROQ_API_KEY");
      else if (e instanceof Groq.RateLimitError) console.error("[itinerary] Groq rate limit reached, using template");
      else if (e instanceof Groq.APIError) console.error(`[itinerary] Groq API error ${e.status}: ${e.message}`);
      else console.error("[itinerary] Groq:", e);
    }
  }
  if (integrations.ai()) {
    try {
      const plan = await claudeItinerary(trip);
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
