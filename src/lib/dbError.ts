import { NextResponse } from "next/server";

// Turns database/setup failures into a clear message instead of a blank 500.
export function serverError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("[api]", msg);
  let hint = "Server error. Check the terminal running `npm run dev` for details.";
  if (/does not exist in the current database|relation .* does not exist|P2021/i.test(msg))
    hint = "Database tables are missing. Run `npx prisma migrate deploy` and try again.";
  else if (/Environment variable not found: DATABASE_URL|P1012/i.test(msg))
    hint = "DATABASE_URL is missing. Add it to the .env file and restart `npm run dev`.";
  else if (/Can't reach database|P1001|P1000|authentication failed|ECONNREFUSED/i.test(msg))
    hint = "Can't connect to the database. Check DATABASE_URL in .env.";
  else if (/did not initialize yet|prisma generate/i.test(msg))
    hint = "Prisma client not generated. Run `npx prisma generate`, then restart `npm run dev`.";
  return NextResponse.json({ error: hint }, { status: 500 });
}
