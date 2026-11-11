import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { integrations } from "@/lib/config";

// Starts a payment. With Razorpay keys -> creates a real (test/live) order.
// Without keys -> the app shows its built-in demo checkout.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const trip = await prisma.trip.findFirst({ where: { id, userId: session.uid } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (trip.status !== "DRAFT") return NextResponse.json({ error: "Already paid" }, { status: 400 });
  if (!trip.travellerDetails) return NextResponse.json({ error: "Please add traveller details first" }, { status: 400 });

  if (!integrations.razorpay()) return NextResponse.json({ mode: "demo", amount: trip.totalAmount });

  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
  const order = await rzp.orders.create({ amount: trip.totalAmount * 100, currency: "INR", receipt: trip.id.slice(0, 40) });
  return NextResponse.json({ mode: "razorpay", orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, amount: trip.totalAmount });
}
