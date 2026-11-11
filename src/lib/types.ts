import type { Restaurant, StayOption } from "./inventory";
import type { LegSelection } from "./pricing";

export type TravellerDetail = { name: string; age: number; gender: string; idType: string; idNumber: string; meal: string };
export type Contact = { email: string; phone: string };
export type NotificationLog = { channel: "email" | "whatsapp"; to: string; status: "sent" | "simulated" | "failed"; detail?: string; at: string }[];
export type ItineraryDay = { day: number; date: string; title: string; morning: string; afternoon: string; evening: string; food: string; tip: string };
export type Itinerary = { summary: string; source: "ai" | "template"; days: ItineraryDay[]; packing: string[] };

export type TripView = {
  id: string;
  fromCity: string;
  toCity: string;
  departDate: Date;
  returnDate: Date | null;
  roundTrip: boolean;
  travellers: number;
  days: number;
  outbound: LegSelection | null;
  returnLeg: LegSelection | null;
  stay: StayOption | null;
  restaurants: Restaurant[];
  travellerDetails: TravellerDetail[] | null;
  contact: Contact | null;
  specialRequests: string | null;
  totalAmount: number;
  status: string;
  bookingRef: string | null;
  outboundPnr: string | null;
  returnPnr: string | null;
  stayConfirmation: string | null;
  itinerary: Itinerary | null;
  notifications: NotificationLog | null;
  payment: { method: string; reference: string; mode: string } | null;
};

export function tripTitle(t: { fromCity: string; toCity: string; outbound: unknown; returnLeg: unknown }) {
  return t.outbound || t.returnLeg ? `${t.fromCity} → ${t.toCity}` : `Stay in ${t.toCity}`;
}

export function tripKind(t: { outbound: unknown; returnLeg: unknown; stay: unknown }) {
  const travel = Boolean(t.outbound || t.returnLeg);
  return travel && t.stay ? "Travel + stay" : travel ? "Travel only" : "Stay only";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asTrip(t: any): TripView {
  return t as TripView;
}
