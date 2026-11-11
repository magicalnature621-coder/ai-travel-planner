import { SignJWT, jwtVerify } from "jose";
import { appUrl } from "./config";

const secret = () => new TextEncoder().encode((process.env.AUTH_SECRET || "dev-secret-change-me") + ":docs");
export type DocKind = "outbound" | "return" | "stay";

// Signed, long-lived download links so tickets open straight from email/WhatsApp.
export async function docLink(tripId: string, doc: DocKind) {
  const token = await new SignJWT({ tripId, doc }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("180d").sign(secret());
  return `${appUrl()}/api/trips/${tripId}/pdf?doc=${doc}&t=${token}`;
}

export async function verifyDocToken(token: string, tripId: string, doc: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.tripId === tripId && payload.doc === doc;
  } catch {
    return false;
  }
}
