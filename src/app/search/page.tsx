import { redirect } from "next/navigation";
import SearchResults from "@/components/SearchResults";
import { findCity } from "@/lib/cities";
import { searchFull } from "@/lib/liveSearch";

export const metadata = { title: "Search results · AI Travel Planner" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const from = findCity(sp.from ?? "")?.name;
  const to = findCity(sp.to ?? "")?.name;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : null;
  if (!from || !to || !date || from === to) redirect("/");

  const params = {
    from,
    to,
    date,
    days: Math.min(30, Math.max(1, Number(sp.days) || 3)),
    travellers: Math.min(9, Math.max(1, Number(sp.travellers) || 1)),
    roundTrip: sp.roundTrip !== "0",
  };
  const r = await searchFull(params);
  return <SearchResults key={JSON.stringify(params)} params={params} returnDate={r.returnDate} outbound={r.outbound} inbound={r.inbound} stays={r.stays} restaurants={r.restaurants} trainSource={r.trainSource} />;
}
