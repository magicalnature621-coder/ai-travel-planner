import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { integrations } from "@/lib/config";
import { confirmTrip } from "@/lib/booking";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const trip = await prisma.trip.findFirst({ where: { id, userId: session.uid } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (trip.status === "CONFIRMED") return NextResponse.json({ ok: true });

  const body = await req.json().catch(() => ({}));
  let payment: { mode: string; method: string; reference: string };

  if (integrations.razorpay()) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (!razorpay_signature || expected !== razorpay_signature)
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    payment = { mode: "razorpay", method: body.method ?? "razorpay", reference: razorpay_payment_id };
  } else {
    // Demo checkout: the client sends only the method and a masked identifier, never full card data.
    const method = body.method === "upi" ? "UPI" : "Card";
    const masked = String(body.masked ?? "").slice(0, 40);
    payment = { mode: "demo", method: `${method}${masked ? ` (${masked})` : ""}`, reference: "DEMO" + Date.now().toString(36).toUpperCase() };
  }

  await confirmTrip(id, payment);
  return NextResponse.json({ ok: true });
}
