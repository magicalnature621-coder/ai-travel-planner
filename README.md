# AI Travel Planner ✈️

Plan and book a whole trip across India in one flow: search flights, trains and buses, pick a hotel or hostel, see restaurant picks, add traveller details, pay by card or UPI, and get tickets on email and WhatsApp with a day-by-day AI itinerary.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma · Claude (itinerary) · Razorpay · Resend · Twilio · pdf-lib

## Run locally
```bash
npm install
cp .env.example .env                 # then set DATABASE_URL and AUTH_SECRET
npx prisma migrate dev               # creates the tables
npm run dev                          # http://localhost:3000
```
No other keys are needed: AI, payments, email and WhatsApp run in demo mode until you add them. **See [SETUP.md](SETUP.md)** for where to get each key and how to host on Vercel.

## User flow
1. Sign up / sign in (`/signup`, `/login`)
2. Search: from, to, date, days, travellers, round trip or one-way (`/`)
3. Results in three columns: travel (flights/trains/buses, onward + return), stays (hotels/hostels), restaurants (`/search`)
4. Traveller details + contact (`/book/[id]/details`)
5. Payment: UPI or card (`/book/[id]/payment`)
6. Confirmation: tickets emailed and sent on WhatsApp, PDF tickets, stay voucher and itinerary (`/trips/[id]`)
7. All bookings under **My Trips** (`/trips`)

## Project map
| Path | What it does |
|---|---|
| `src/lib/cities.ts` | Supported cities, attractions, local dishes |
| `src/lib/inventory.ts` | Demo inventory engine (swap for supplier APIs) |
| `src/lib/booking.ts` | Confirms a booking, issues PNRs, sends notifications |
| `src/lib/itinerary.ts` | AI itinerary (Claude) with offline fallback |
| `src/lib/notify.ts` | Email (Resend) + WhatsApp (Twilio) |
| `src/lib/pdf.ts` | PDF e-tickets and stay voucher |
| `src/app/api/**` | Auth, trip, payment, itinerary and PDF endpoints |
