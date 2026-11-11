import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { asTrip } from "@/lib/types";
import TripSummary from "@/components/TripSummary";
import BookingSteps from "@/components/BookingSteps";
import TravellerForm from "@/components/TravellerForm";

export default async function DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const raw = await prisma.trip.findFirst({ where: { id, userId: user.id } });
  if (!raw) notFound();
  if (raw.status === "CONFIRMED") redirect(`/trips/${id}`);
  const trip = asTrip(raw);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <BookingSteps current={1} />
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{trip.outbound || trip.returnLeg ? "Who\u2019s travelling?" : "Guest details"}</h1>
      <p className="mt-1 text-slate-500">Names must match the photo ID you&apos;ll carry. We use these details for everything you&apos;re booking.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <TravellerForm
          tripId={trip.id}
          count={trip.travellers}
          needsId
          initial={{ travellers: trip.travellerDetails ?? undefined, contact: trip.contact ?? { email: user.email, phone: user.phone }, specialRequests: trip.specialRequests ?? "", leadName: user.name }}
        />
        <TripSummary trip={trip} />
      </div>
    </main>
  );
}
