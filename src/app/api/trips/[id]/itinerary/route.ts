import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildItinerary } from "@/lib/itinerary";
import { asTrip } from "@/lib/types";

export const maxDuration = 60;

// Generates (or regenerates with ?force=1) the trip itinerary.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const trip = await prisma.trip.findFirst({ where: { id, userId: session.uid, status: "CONFIRMED" } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (trip.itinerary && !force) return NextResponse.json({ itinerary: trip.itinerary });

  const itinerary = await buildItinerary(asTrip(trip));
  await prisma.trip.update({ where: { id }, data: { itinerary } });
  return NextResponse.json({ itinerary });
}
