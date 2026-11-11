import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { TripView } from "./types";
import { formatDuration } from "./inventory";

const BRAND = rgb(0.31, 0.27, 0.9);
const INK = rgb(0.12, 0.13, 0.18);
const MUTED = rgb(0.42, 0.45, 0.52);

// pdf-lib's standard fonts can't encode ₹, so PDFs use "Rs."
const rs = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

type Ctx = { page: PDFPage; font: PDFFont; bold: PDFFont; y: number };

function header(ctx: Ctx, title: string, subtitle: string) {
  const { page, bold, font } = ctx;
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: BRAND });
  page.drawText("AI Travel Planner", { x: 40, y: height - 45, size: 13, font: bold, color: rgb(1, 1, 1) });
  page.drawText(title, { x: 40, y: height - 75, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText(subtitle, { x: 40, y: height - 96, size: 10, font, color: rgb(0.88, 0.88, 1) });
  ctx.y = height - 145;
}

function section(ctx: Ctx, label: string) {
  ctx.y -= 10;
  ctx.page.drawText(label.toUpperCase(), { x: 40, y: ctx.y, size: 9, font: ctx.bold, color: BRAND });
  ctx.y -= 6;
  ctx.page.drawLine({ start: { x: 40, y: ctx.y }, end: { x: 555, y: ctx.y }, thickness: 0.6, color: rgb(0.85, 0.86, 0.9) });
  ctx.y -= 18;
}

// Shorten text with an ellipsis so it never wraps into the next row
// Standard PDF fonts only cover Latin characters; swap anything else so generation never fails
const clean = (t: string) => t.replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g, "?");

function fit(raw: string, font: PDFFont, size: number, width: number) {
  const text = clean(raw);
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "...", size) > width) t = t.slice(0, -1);
  return t.trimEnd() + "...";
}

function row(ctx: Ctx, pairs: [string, string][]) {
  const colW = 515 / pairs.length;
  pairs.forEach(([k, v], i) => {
    ctx.page.drawText(k, { x: 40 + i * colW, y: ctx.y, size: 8, font: ctx.font, color: MUTED });
    ctx.page.drawText(fit(v, ctx.bold, 11, colW - 8), { x: 40 + i * colW, y: ctx.y - 14, size: 11, font: ctx.bold, color: INK });
  });
  ctx.y -= 36;
}

function footer(ctx: Ctx, note: string) {
  ctx.page.drawText(note, { x: 40, y: 50, size: 8, font: ctx.font, color: MUTED, maxWidth: 515, lineHeight: 11 });
}

async function base() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, ctx: { page, font, bold, y: 0 } as Ctx };
}

export async function ticketPdf(trip: TripView, which: "outbound" | "return"): Promise<Uint8Array> {
  const leg = which === "outbound" ? trip.outbound : trip.returnLeg!;
  const pnr = (which === "outbound" ? trip.outboundPnr : trip.returnPnr) ?? "-";
  const o = leg.option;
  const kind = o.mode === "flight" ? "E-Ticket / Boarding Pass" : o.mode === "train" ? "Electronic Reservation Slip" : "Bus E-Ticket";
  const { doc, ctx } = await base();
  header(ctx, kind, `Booking ${trip.bookingRef}  |  ${which === "outbound" ? "Onward" : "Return"} journey`);

  section(ctx, "Journey");
  row(ctx, [["PNR", pnr], [o.mode === "flight" ? "Flight" : o.mode === "train" ? "Train No." : "Bus", o.number], ["Operator", o.operator]]);
  row(ctx, [["From", `${o.fromCity} (${o.fromCode})`], ["To", `${o.toCity} (${o.toCode})`], ["Date", fmtDate(o.date)]]);
  row(ctx, [["Departs", o.departTime], ["Arrives", `${o.arriveTime}${o.arriveDayOffset ? ` (+${o.arriveDayOffset} day)` : ""}`], ["Duration", formatDuration(o.durationMins)]]);
  row(ctx, [["Class / Fare", leg.fare.label], ["Passengers", String(trip.travellers)], ["Fare paid", rs(leg.fare.price * trip.travellers)]]);

  section(ctx, "Passengers");
  (trip.travellerDetails ?? []).forEach((p, i) => {
    const seat = o.mode === "flight" ? `${12 + i}${"ABCDEF"[i % 6]}` : o.mode === "train" ? `B${1 + (i % 4)} / ${21 + i}` : `L${3 + i}`;
    row(ctx, [["Name", p.name], ["Age / Gender", `${p.age} / ${p.gender}`], [o.mode === "train" ? "Coach / Berth" : "Seat", seat], ["Status", "CONFIRMED"]]);
  });

  footer(ctx, o.mode === "flight"
    ? "Please carry a valid government photo ID. Web check-in opens 48 hours before departure. Reach the airport at least 2 hours before departure."
    : o.mode === "train"
    ? "Carry the original ID proof used during booking. This ERS along with ID proof is valid for travel. Arrive at the station 30 minutes before departure."
    : "Board at the pickup point 15 minutes before departure. Show this e-ticket and a valid ID to the conductor.");
  return doc.save();
}

export async function stayPdf(trip: TripView): Promise<Uint8Array> {
  const s = trip.stay;
  const { doc, ctx } = await base();
  header(ctx, "Stay Confirmation Voucher", `Booking ${trip.bookingRef}`);
  section(ctx, "Property");
  row(ctx, [["Confirmation No.", trip.stayConfirmation ?? "-"], ["Property", s.name]]);
  row(ctx, [["Location", `${s.area}, ${trip.toCity}`], ["Type", s.kind === "hotel" ? `${s.stars}-star hotel` : "Hostel"], ["Guest rating", `${s.rating} / 5`]]);
  const checkout = new Date(trip.departDate);
  checkout.setUTCDate(checkout.getUTCDate() + s.nights);
  row(ctx, [["Check-in", `${fmtDate(trip.departDate)}, 12:00`], ["Check-out", `${fmtDate(checkout)}, 11:00`], ["Nights", String(s.nights)]]);
  row(ctx, [["Room", s.roomType], [s.unitLabel === "room" ? "Rooms" : "Beds", String(s.units)], ["Guests", String(trip.travellers)]]);
  row(ctx, [["Breakfast", s.breakfast ? "Included" : "Not included"], ["Cancellation", s.freeCancellation ? "Free until 24h before" : "Non-refundable"], ["Amount paid", rs(s.total)]]);
  section(ctx, "Guests");
  (trip.travellerDetails ?? []).forEach((p) => row(ctx, [["Name", p.name], ["Age", String(p.age)], ["ID", `${p.idType} ending ${p.idNumber.slice(-4)}`]]));
  if (trip.specialRequests) {
    section(ctx, "Special requests");
    ctx.page.drawText(clean(trip.specialRequests), { x: 40, y: ctx.y, size: 10, font: ctx.font, color: INK, maxWidth: 515, lineHeight: 13 });
  }
  footer(ctx, "Please present this voucher and the original photo ID of all guests at check-in. Early check-in and late check-out are subject to availability.");
  return doc.save();
}
