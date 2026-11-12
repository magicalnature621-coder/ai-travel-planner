import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createOrder, paypalEnabled, PayPalError } from "@/lib/paypal";
import { asTrip, tripTitle } from "@/lib/types";

// Called by the PayPal button's createOrder callback.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!paypalEnabled()) return NextResponse.json({ error: "PayPal is not configured" }, { status: 400 });
  const trip = await prisma.trip.findFirst({ where: { id, userId: session.uid } });
  if (!trip || trip.status !== "DRAFT" || !trip.travellerDetails) return NextResponse.json({ error: "This trip can't be paid for" }, { status: 400 });
  try {
    const order = await createOrder(trip.id, trip.totalAmount, `AI Travel Planner: ${tripTitle(asTrip(trip))}`);
    return NextResponse.json(order);
  } catch (e) {
    console.error("[paypal]", (e as Error).message);
    return NextResponse.json({ error: e instanceof PayPalError ? e.message : "Couldn't start PayPal checkout" }, { status: 502 });
  }
}
