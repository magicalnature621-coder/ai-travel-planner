import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const Traveller = z.object({
  name: z.string().trim().min(2, "Enter each traveller's full name"),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(["Male", "Female", "Other"]),
  idType: z.enum(["Aadhaar", "Passport", "PAN", "Driving Licence", "Voter ID"]),
  idNumber: z.string().trim().min(4, "Enter a valid ID number"),
  meal: z.enum(["No preference", "Veg", "Non-veg", "Jain"]).default("No preference"),
});
const Body = z.object({
  travellers: z.array(Traveller),
  contact: z.object({
    email: z.string().trim().email("Enter a valid email"),
    phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  }),
  specialRequests: z.string().max(500).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  const trip = await prisma.trip.findFirst({ where: { id, userId: session.uid } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (trip.status !== "DRAFT") return NextResponse.json({ error: "This trip is already booked" }, { status: 400 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (parsed.data.travellers.length !== trip.travellers)
    return NextResponse.json({ error: `Please add details for all ${trip.travellers} travellers` }, { status: 400 });

  const phone = parsed.data.contact.phone.startsWith("+91") ? parsed.data.contact.phone : `+91${parsed.data.contact.phone}`;
  await prisma.trip.update({
    where: { id },
    data: {
      travellerDetails: parsed.data.travellers,
      contact: { email: parsed.data.contact.email, phone },
      specialRequests: parsed.data.specialRequests || null,
    },
  });
  return NextResponse.json({ ok: true });
}
