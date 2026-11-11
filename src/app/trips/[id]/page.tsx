import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { asTrip } from "@/lib/types";
import TripDetail from "@/components/TripDetail";

export default async function TripPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await requireUser();
  const raw = await prisma.trip.findFirst({ where: { id, userId: user.id } });
  if (!raw) notFound();
  if (raw.status !== "CONFIRMED") redirect(`/book/${id}/details`);
  const trip = asTrip(raw);
  // Dates are serialised for the client component
  return <TripDetail trip={JSON.parse(JSON.stringify(trip))} justBooked={isNew === "1"} />;
}
