# Setup guide: API keys & going live

The app runs **without any API keys**. Each integration switches on automatically as soon as its keys are in `.env` (locally) or in Vercel's Environment Variables (online). Until then it runs in demo mode:

| Feature | Without keys (demo) | With keys |
|---|---|---|
| Database | — (required) | Neon Postgres |
| AI itinerary | Template plan built from top attractions | Personalised plan written by Groq (free) or Claude |
| Payments | Built-in demo checkout (no money moves) | PayPal sandbox checkout (or Razorpay) |
| Email tickets | Logged as "demo" | Real email with PDF tickets via Resend |
| WhatsApp | Logged as "demo" | Real WhatsApp message via Twilio |
| Trains | Sample trains | Real trains, seat availability and fares (RapidAPI IRCTC) |
| Flights/buses/hotels | Realistic generated inventory | Phase 2: real supplier APIs (see bottom) |

---

## 1. Database: Neon (required to host online, free)
1. Go to **https://neon.tech** → sign up with GitHub/Google.
2. Create a project (region: **AWS Asia Pacific (Singapore)** is closest to India).
3. On the dashboard click **Connect** → copy the connection string (starts with `postgresql://`).
4. Put it in `DATABASE_URL`.

> Tip: In Vercel you can instead open your project → **Storage → Create → Neon** and it fills `DATABASE_URL` for you.

## 2. AUTH_SECRET (required)
Any long random string. Generate one with:
```bash
openssl rand -base64 32
```

## 3. AI itinerary: Groq (free, recommended to start)
1. Go to **https://console.groq.com** → sign up (Google/GitHub works).
2. Open **API Keys → Create API Key** → copy it (starts with `gsk_`).
3. Put it in `GROQ_API_KEY` and restart `npm run dev`.

The free tier has daily rate limits, which is plenty for a demo. If Groq retires the default model, pick a current one from **console.groq.com/docs/models** and set it in `GROQ_MODEL`. If a Groq call ever fails, the app falls back to the template plan.

## 3b. AI itinerary: Anthropic (Claude), optional alternative
1. Go to **https://console.anthropic.com** → sign up.
2. **Settings → Billing** → add a card and buy credits ($5 minimum is plenty for a demo).
3. **Settings → API Keys → Create Key** → copy it (starts with `sk-ant-`).
4. Put it in `ANTHROPIC_API_KEY`.

Cost: roughly ₹3–6 per itinerary. The plan is generated once per booking and saved.

## 3c. Live trains: IRCTC API on RapidAPI
Shows real Indian Railways trains for the route and date, and real seat availability + exact fare when a user taps a class.
1. Sign up at **https://rapidapi.com**, open the **IRCTC** API (host `irctc1.p.rapidapi.com`), go to **Pricing** and subscribe.
2. Copy your key from any endpoint's **Authorization** tab.
3. Put it in `RAPIDAPI_KEY` and restart `npm run dev`.

**Request limits matter.** The free Basic plan allows only **10 requests per month**. Each new route/date search costs 1 request (cached 24h) and each seat check costs 1 (cached 20 min). Upgrade to a paid plan before a demo. When the limit is reached the site automatically shows sample trains with a notice.

Not possible through any public API: coach-wise vacancy (only published after chart preparation, ~4h before departure) and real ticket booking (needs an IRCTC authorised-agent licence).

## 4. Payments: PayPal developer platform (sandbox)
Real PayPal checkout using the **JavaScript SDK (Smart Payment Buttons)** in the browser and the **Orders v2 REST API** on the server (create order → buyer approves → server captures and verifies status, booking id and amount before confirming).
1. Go to **https://developer.paypal.com** → log in with any PayPal account (or sign up).
2. **Apps & Credentials** → make sure the toggle says **Sandbox** → **Create App** (type: Merchant) → copy **Client ID** and **Secret**.
3. Add to `.env`:
   ```
   PAYPAL_CLIENT_ID="..."
   PAYPAL_CLIENT_SECRET="..."
   PAYPAL_ENV="sandbox"
   PAYPAL_CURRENCY="USD"
   PAYPAL_INR_PER_USD="88"
   ```
4. To pay, use the **sandbox Personal (buyer) account**: developer.paypal.com → **Testing Tools → Sandbox Accounts** → open the `...personal.example.com` account → copy its email and password (use **View/Edit account**).

Amounts are shown in INR and charged in USD in the sandbox (INR only works for India-registered PayPal accounts). When PayPal keys are set, they take priority over Razorpay and the demo checkout.

## 4b. Payments: Razorpay (card + UPI), optional
1. Go to **https://razorpay.com** → **Sign up** with your mobile/email.
2. In the dashboard, switch the toggle at the top to **Test Mode**. Test mode needs no KYC.
3. **Account & Settings → API Keys → Generate Test Key**. You get a *Key ID* (`rzp_test_...`) and *Key Secret*.
4. Put them in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

Test payments: card `4111 1111 1111 1111`, any future expiry, any CVV, any OTP. Or UPI ID `success@razorpay`.

**Going live** (real money) needs KYC: PAN, a bank account, business details, and a website with Terms, Privacy, Refund and Contact pages. Then generate **Live** keys (`rzp_live_...`).

## 5. Email: Resend
1. Go to **https://resend.com** → sign up.
2. **API Keys → Create API Key** → copy it (starts with `re_`).
3. Put it in `RESEND_API_KEY`.

Until you verify a domain, Resend only delivers to **the email you signed up with**. That's fine for a demo, so book with that email. To email anyone: **Domains → Add domain**, add the DNS records it shows at your domain provider, then set `EMAIL_FROM="AI Travel Planner <tickets@yourdomain.com>"`.

## 6. WhatsApp: Twilio sandbox
1. Go to **https://www.twilio.com/try-twilio** → sign up (free trial credit included).
2. On the Console home page copy **Account SID** and **Auth Token** → `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
3. Go to **Messaging → Try it out → Send a WhatsApp message**. It shows a sandbox number (`+1 415 523 8886`) and a code like `join happy-tiger`.
4. **From each phone that should receive messages**, send that `join ...` text to the sandbox number on WhatsApp. (Sandbox only delivers to phones that joined.)
5. Keep `TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"`.

Once the site is hosted on `https://`, the WhatsApp message also carries the PDF ticket as an attachment.

**Going live**: register a WhatsApp Business sender in Twilio (needs a Meta Business account, business verification and pre-approved message templates). It takes a few days.

---

## Hosting online (Vercel, free)
1. Push this folder to a GitHub repository.
2. Go to **https://vercel.com** → sign up with GitHub → **Add New → Project** → import the repo.
3. Under **Environment Variables**, add everything from `.env.example`: at least `DATABASE_URL` and `AUTH_SECRET`, plus any keys you have.
4. Click **Deploy**. The build runs the database migrations automatically.
5. After the first deploy, copy your site URL (e.g. `https://ai-travel-planner.vercel.app`), set it as `APP_URL` in Vercel, and **Redeploy**. Ticket links in emails and WhatsApp use this URL.

Adding a key later: add it in **Settings → Environment Variables**, then **Deployments → ⋯ → Redeploy**.

---

## Phase 2: real bookings (when you're ready)
The search/booking engine lives in `src/lib/inventory.ts` (search) and `src/lib/booking.ts` (booking). Replace those with supplier APIs:

- **Flights**: Amadeus Self-Service (developers.amadeus.com, free test environment) or Duffel. Indian B2B travel aggregators such as TBO or Tripjack offer flights, hotels and buses in one API, but need a registered travel business.
- **Trains (IRCTC)**: no public API. You need to become an IRCTC authorised agent or partner with a licensed B2B provider.
- **Buses**: through B2B aggregators (TBO, Tripjack, etc.) or a bus platform partnership.
- **Hotels/hostels**: TBO Holidays, Hotelbeds, or Expedia Rapid API (partner approval needed).
- **Restaurants**: Google Places API (console.cloud.google.com), easy to get.

Most of these need a registered company (GST, PAN, current account), which is also what Razorpay live mode asks for.
