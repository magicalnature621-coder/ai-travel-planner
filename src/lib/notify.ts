import { Resend } from "resend";
import twilio from "twilio";
import { integrations, appUrl } from "./config";
import { docLink } from "./links";
import { stayPdf, ticketPdf } from "./pdf";
import { inr } from "./inventory";
import type { NotificationLog, TripView } from "./types";

const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function emailHtml(trip: TripView, links: { label: string; url: string }[]) {
  const lead = trip.travellerDetails?.[0]?.name ?? "Traveller";
  const leg = (title: string, l: TripView["outbound"], pnr: string | null) => `
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eee">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">${title}</div>
      <div style="font-size:16px;font-weight:600;margin-top:4px">${l.option.fromCity} → ${l.option.toCity}</div>
      <div style="color:#374151;margin-top:2px">${l.option.operator} · ${l.option.number} · ${fmt(l.option.date)} · ${l.option.departTime}–${l.option.arriveTime}</div>
      <div style="margin-top:4px">PNR <b>${pnr}</b> · ${l.fare.label}</div>
    </td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f5fb;font-family:Segoe UI,Arial,sans-serif;color:#111827">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#4f46e5;color:#fff;padding:24px 18px">
      <div style="font-size:13px;opacity:.85">AI Travel Planner</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px">Your trip to ${trip.toCity} is confirmed! 🎉</div>
      <div style="margin-top:6px;opacity:.9">Booking reference <b>${trip.bookingRef}</b></div>
    </td></tr>
    <tr><td style="padding:16px 18px">Hi ${lead}, everything is booked. Your tickets and stay voucher are attached to this email.</td></tr>
    ${leg("Onward", trip.outbound, trip.outboundPnr)}
    ${trip.returnLeg ? leg("Return", trip.returnLeg, trip.returnPnr) : ""}
    <tr><td style="padding:14px 18px;border-bottom:1px solid #eee">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Stay</div>
      <div style="font-size:16px;font-weight:600;margin-top:4px">${trip.stay.name}</div>
      <div style="color:#374151;margin-top:2px">${trip.stay.area} · ${trip.stay.nights} nights · ${trip.stay.roomType}</div>
      <div style="margin-top:4px">Confirmation <b>${trip.stayConfirmation}</b></div>
    </td></tr>
    <tr><td style="padding:16px 18px">Total paid: <b>${inr(trip.totalAmount)}</b></td></tr>
    <tr><td style="padding:0 18px 18px">${links.map((l) => `<a href="${l.url}" style="display:inline-block;margin:4px 6px 4px 0;padding:9px 14px;background:#eef2ff;color:#4338ca;border-radius:8px;text-decoration:none;font-weight:600">${l.label}</a>`).join("")}</td></tr>
    <tr><td style="padding:0 18px 22px"><a href="${appUrl()}/trips/${trip.id}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">View your day-by-day itinerary</a></td></tr>
  </table></td></tr></table></body></html>`;
}

export async function sendConfirmations(trip: TripView): Promise<NotificationLog> {
  const log: NotificationLog = [];
  const at = new Date().toISOString();
  const email = trip.contact?.email;
  const phone = trip.contact?.phone;

  const links = [
    { label: "Onward ticket (PDF)", url: await docLink(trip.id, "outbound") },
    ...(trip.returnLeg ? [{ label: "Return ticket (PDF)", url: await docLink(trip.id, "return") }] : []),
    { label: "Stay voucher (PDF)", url: await docLink(trip.id, "stay") },
  ];

  // ---- Email ----
  if (email) {
    if (integrations.email()) {
      try {
        const attachments = [
          { filename: `ticket-onward-${trip.bookingRef}.pdf`, content: Buffer.from(await ticketPdf(trip, "outbound")) },
          ...(trip.returnLeg ? [{ filename: `ticket-return-${trip.bookingRef}.pdf`, content: Buffer.from(await ticketPdf(trip, "return")) }] : []),
          { filename: `stay-voucher-${trip.bookingRef}.pdf`, content: Buffer.from(await stayPdf(trip)) },
        ];
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "AI Travel Planner <onboarding@resend.dev>",
          to: email,
          subject: `Booking confirmed: ${trip.fromCity} → ${trip.toCity} (${trip.bookingRef})`,
          html: emailHtml(trip, links),
          attachments,
        });
        log.push({ channel: "email", to: email, status: error ? "failed" : "sent", detail: error?.message, at });
      } catch (e) {
        log.push({ channel: "email", to: email, status: "failed", detail: (e as Error).message, at });
      }
    } else {
      log.push({ channel: "email", to: email, status: "simulated", detail: "Add RESEND_API_KEY to send real emails", at });
    }
  }

  // ---- WhatsApp ----
  if (phone) {
    const body = [
      `✅ *Trip confirmed!* ${trip.fromCity} → ${trip.toCity}`,
      `Booking ref: *${trip.bookingRef}*`,
      `Onward: ${trip.outbound.option.operator} ${trip.outbound.option.number}, ${fmt(trip.outbound.option.date)} ${trip.outbound.option.departTime} · PNR ${trip.outboundPnr}`,
      trip.returnLeg ? `Return: ${trip.returnLeg.option.operator} ${trip.returnLeg.option.number}, ${fmt(trip.returnLeg.option.date)} ${trip.returnLeg.option.departTime} · PNR ${trip.returnPnr}` : "",
      `Stay: ${trip.stay.name} · Conf. ${trip.stayConfirmation}`,
      "",
      ...links.map((l) => `${l.label}: ${l.url}`),
      "",
      `Itinerary: ${appUrl()}/trips/${trip.id}`,
    ].filter((l) => l !== undefined).join("\n");

    if (integrations.whatsapp()) {
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const publicUrl = appUrl().startsWith("https://");
        await client.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
          to: `whatsapp:${phone}`,
          body,
          // Twilio fetches media from a public URL, so attach the PDF only once the app is hosted
          ...(publicUrl ? { mediaUrl: [links[0].url] } : {}),
        });
        log.push({ channel: "whatsapp", to: phone, status: "sent", at });
      } catch (e) {
        log.push({ channel: "whatsapp", to: phone, status: "failed", detail: (e as Error).message, at });
      }
    } else {
      log.push({ channel: "whatsapp", to: phone, status: "simulated", detail: "Add Twilio keys to send real WhatsApp messages", at });
    }
  }

  if (!integrations.email() || !integrations.whatsapp()) console.log("[notify] simulated message:\n", links.map((l) => l.url).join("\n"));
  return log;
}
