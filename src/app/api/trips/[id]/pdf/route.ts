import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { verifyDocToken } from "@/lib/links";
import { stayPdf, ticketPdf } from "@/lib/pdf";
import { asTrip } from "@/lib/types";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const doc = url.searchParams.get("doc") ?? "outbound";
  const token = url.searchParams.get("t");

  // Allowed if the signed-in owner asks, or the request carries a valid signed link (email/WhatsApp)
  const session = await getSession();
  const trip = await prisma.trip.findUnique({ where: { id } });
  const allowed = trip && (trip.userId === session?.uid || (token && (await verifyDocToken(token, id, doc))));
  if (!trip || !allowed || trip.status !== "CONFIRMED") return new Response("Not found", { status: 404 });

  const t = asTrip(trip);
  if (doc === "return" && !t.returnLeg) return new Response("Not found", { status: 404 });
  const bytes = doc === "stay" ? await stayPdf(t) : await ticketPdf(t, doc === "return" ? "return" : "outbound");
  const name = `${doc === "stay" ? "stay-voucher" : `ticket-${doc}`}-${t.bookingRef}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"` },
  });
}
