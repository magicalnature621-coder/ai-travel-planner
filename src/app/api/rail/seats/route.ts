import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { checkSeats, railwaysEnabled, RailError } from "@/lib/railways";

const Body = z.object({
  trainNo: z.string().regex(/^\d{4,5}$/),
  from: z.string().regex(/^[A-Z]{1,5}$/),
  to: z.string().regex(/^[A-Z]{1,5}$/),
  cls: z.string().regex(/^[0-9A-Z]{2}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Live seat availability + exact fare for one train class (1 API request, then cached 20 min).
export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (!railwaysEnabled()) return NextResponse.json({ error: "Live train data is not configured" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { trainNo, from, to, cls, date } = parsed.data;
  try {
    return NextResponse.json(await checkSeats(trainNo, from, to, cls, date));
  } catch (e) {
    const quota = e instanceof RailError && e.quota;
    return NextResponse.json({ error: quota ? "This month's live-data limit is used up, so seats can't be checked right now." : "Couldn't check seats right now. Please try again." }, { status: 503 });
  }
}
