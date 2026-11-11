import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { searchFull } from "@/lib/liveSearch";
import { priceBreakdown } from "@/lib/pricing";

const Leg = z.object({ optionId: z.string(), fare: z.string() });
const Body = z.object({
  from: z.string(),
  to: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(30),
  travellers: z.number().int().min(1).max(9),
  roundTrip: z.boolean(),
  outbound: Leg.nullable().optional(),
  inbound: Leg.nullable().optional(),
  stayId: z.string().nullable().optional(),
  restaurantIds: z.array(z.string()).optional(),
});

// Create a draft trip from the user's selections. Prices are re-computed on
// the server from the inventory engine so the client can't tamper with them.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  const b = parsed.data;

  const results = await searchFull(b);
  const resolve = (list: typeof results.outbound, leg?: { optionId: string; fare: string } | null) => {
    if (!leg) return null;
    const option = list.find((o) => o.id === leg.optionId);
    const fare = option?.fares.find((f) => f.code === leg.fare);
    return option && fare ? { option, fare } : undefined;
  };
  // Travel and stay are both optional: book either one, or both.
  const outbound = resolve(results.outbound, b.outbound);
  const inbound = b.roundTrip ? resolve(results.inbound, b.inbound) : null;
  const stay = b.stayId ? results.stays.find((s) => s.id === b.stayId) : null;

  if (outbound === undefined || inbound === undefined || stay === undefined)
    return NextResponse.json({ error: "That option is no longer available. Please search again." }, { status: 400 });
  const soldOut = [outbound, inbound].find((l) => l?.fare.availability?.kind === "none");
  if (soldOut) return NextResponse.json({ error: `${soldOut.option.operator} (${soldOut.fare.label}) has no seats left. Please pick another class or train.` }, { status: 400 });
  if (!outbound && !inbound && !stay)
    return NextResponse.json({ error: "Select travel, a stay, or both to continue" }, { status: 400 });

  const price = priceBreakdown({ travellers: b.travellers, outbound, inbound, stay });
  const saved = results.restaurants.filter((r) => b.restaurantIds?.includes(r.id));
  const restaurants = [...saved, ...results.restaurants.filter((r) => !saved.includes(r))].slice(0, Math.max(5, saved.length));

  const trip = await prisma.trip.create({
    data: {
      userId: session.uid,
      fromCity: b.from,
      toCity: b.to,
      departDate: new Date(b.date + "T00:00:00Z"),
      returnDate: b.roundTrip ? new Date(results.returnDate + "T00:00:00Z") : null,
      roundTrip: b.roundTrip,
      travellers: b.travellers,
      days: b.days,
      outbound: outbound ?? undefined,
      returnLeg: inbound ?? undefined,
      stay: stay ?? undefined,
      restaurants,
      totalAmount: price.total,
    },
  });
  return NextResponse.json({ id: trip.id });
}
