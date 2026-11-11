import type { Fare, StayOption, TransportOption } from "./inventory";

export type LegSelection = { option: TransportOption; fare: Fare };

export function priceBreakdown(opts: { travellers: number; outbound?: LegSelection | null; inbound?: LegSelection | null; stay?: StayOption | null }) {
  const { travellers } = opts;
  const outbound = opts.outbound ? opts.outbound.fare.price * travellers : 0;
  const inbound = opts.inbound ? opts.inbound.fare.price * travellers : 0;
  const stay = opts.stay ? opts.stay.total : 0;
  const legs = (opts.outbound ? 1 : 0) + (opts.inbound ? 1 : 0);
  const convenience = legs * travellers * 99;
  const taxes = Math.round(stay * 0.12 + (outbound + inbound) * 0.05);
  return { outbound, inbound, stay, convenience, taxes, total: outbound + inbound + stay + convenience + taxes };
}
