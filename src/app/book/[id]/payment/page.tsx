import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { asTrip } from "@/lib/types";
import { integrations } from "@/lib/config";
import { paypalCurrency, paypalEnabled, toPaypalAmount } from "@/lib/paypal";
import TripSummary from "@/components/TripSummary";
import BookingSteps from "@/components/BookingSteps";
import PaymentForm from "@/components/PaymentForm";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const raw = await prisma.trip.findFirst({ where: { id, userId: user.id } });
  if (!raw) notFound();
  if (raw.status === "CONFIRMED") redirect(`/trips/${id}`);
  if (!raw.travellerDetails) redirect(`/book/${id}/details`);
  const trip = asTrip(raw);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BookingSteps current={2} />
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Payment</h1>
      <p className="mt-1 text-slate-500">One payment books everything you selected. You&apos;ll get tickets on email and WhatsApp right away.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <PaymentForm
          tripId={trip.id}
          amount={trip.totalAmount}
          razorpay={integrations.razorpay()}
          paypal={paypalEnabled() ? { clientId: process.env.PAYPAL_CLIENT_ID!, currency: paypalCurrency(), value: toPaypalAmount(trip.totalAmount), sandbox: process.env.PAYPAL_ENV !== "live" } : null}
          prefill={{ name: user.name, email: trip.contact?.email ?? user.email, contact: trip.contact?.phone ?? user.phone }}
          legs={[trip.outbound ? { label: "onward", mode: trip.outbound.option.mode } : null, trip.returnLeg ? { label: "return", mode: trip.returnLeg.option.mode } : null].filter((l) => l !== null)}
          stayKind={trip.stay?.kind ?? null}
        />
        <TripSummary trip={trip} />
      </div>
    </main>
  );
}
