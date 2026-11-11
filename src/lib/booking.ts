import { prisma } from "./db";
import { sendConfirmations } from "./notify";
import { asTrip } from "./types";

const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = (n: number) => Array.from({ length: n }, () => ALNUM[Math.floor(Math.random() * ALNUM.length)]).join("");

// "Books" every leg with the supplier and stores confirmation numbers.
// In demo mode we generate realistic PNRs; in production this is where the
// supplier booking APIs (Amadeus / IRCTC agent / bus aggregator / hotel API) are called.
function supplierRef(mode: string) {
  if (mode === "train") return String(Math.floor(1e9 + Math.random() * 9e9)); // 10-digit PNR
  if (mode === "bus") return "BUS" + code(7);
  return code(6); // airline PNR
}

export async function confirmTrip(id: string, payment: { mode: string; method: string; reference: string }) {
  const draft = asTrip(await prisma.trip.findUniqueOrThrow({ where: { id } }));
  const updated = await prisma.trip.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
      payment,
      bookingRef: "ATP" + code(7),
      outboundPnr: supplierRef(draft.outbound.option.mode),
      returnPnr: draft.returnLeg ? supplierRef(draft.returnLeg.option.mode) : null,
      stayConfirmation: (draft.stay.kind === "hotel" ? "HTL-" : "HST-") + code(8),
    },
  });
  const notifications = await sendConfirmations(asTrip(updated));
  await prisma.trip.update({ where: { id }, data: { notifications } });
  return updated;
}
