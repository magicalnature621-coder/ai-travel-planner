// PayPal developer platform (sandbox by default): Orders v2 REST API.
// Flow: createOrder() when the buyer clicks the PayPal button -> buyer approves in PayPal's
// popup -> captureOrder() on our server -> booking is confirmed only if the capture COMPLETED
// for the right trip and amount.

export const paypalEnabled = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
const base = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

// Sandbox charges in USD (INR is only supported for India-registered PayPal accounts).
export const paypalCurrency = () => process.env.PAYPAL_CURRENCY || "USD";
export function toPaypalAmount(inr: number) {
  if (paypalCurrency() === "INR") return inr.toFixed(2);
  const rate = Number(process.env.PAYPAL_INR_PER_USD) || 88;
  return Math.max(1, inr / rate).toFixed(2);
}

export class PayPalError extends Error {}

async function accessToken(): Promise<string> {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new PayPalError(`PayPal auth failed: ${json.error_description ?? res.status}`);
  return json.access_token;
}

async function api<T>(path: string, body?: unknown, requestId?: string): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new PayPalError(json?.details?.[0]?.description ?? json?.message ?? `PayPal error ${res.status}`);
  return json as T;
}

export async function createOrder(tripId: string, inr: number, description: string) {
  const value = toPaypalAmount(inr);
  const order = await api<{ id: string; status: string }>("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: tripId,
      custom_id: tripId,
      description: description.slice(0, 127),
      amount: { currency_code: paypalCurrency(), value },
    }],
    application_context: { brand_name: "AI Travel Planner", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
  });
  return { id: order.id, value, currency: paypalCurrency() };
}

type Capture = {
  id: string;
  status: string;
  payer?: { email_address?: string; name?: { given_name?: string; surname?: string } };
  purchase_units?: { custom_id?: string; reference_id?: string; payments?: { captures?: { id: string; status: string; custom_id?: string; amount: { value: string; currency_code: string } }[] } }[];
};

export async function captureOrder(orderId: string, tripId: string, expectedInr: number) {
  if (!/^[A-Z0-9]{5,30}$/.test(orderId)) throw new PayPalError("Invalid PayPal order id");
  const c = await api<Capture>(`/v2/checkout/orders/${orderId}/capture`, {}, `capture-${orderId}`);
  const unit = c.purchase_units?.[0];
  const cap = unit?.payments?.captures?.[0];
  if (c.status !== "COMPLETED" || cap?.status !== "COMPLETED") throw new PayPalError(`Payment not completed (${cap?.status ?? c.status})`);
  if ((cap.custom_id ?? unit?.custom_id ?? unit?.reference_id) !== tripId) throw new PayPalError("Payment belongs to a different booking");
  if (cap.amount.value !== toPaypalAmount(expectedInr) || cap.amount.currency_code !== paypalCurrency()) throw new PayPalError("Paid amount does not match the booking total");
  return { captureId: cap.id, amount: `${cap.amount.currency_code} ${cap.amount.value}`, payer: c.payer?.email_address ?? "" };
}
