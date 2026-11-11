// Feature flags: each integration switches on automatically when its keys are present.
export const integrations = {
  ai: () => Boolean(process.env.ANTHROPIC_API_KEY),
  groq: () => Boolean(process.env.GROQ_API_KEY),
  razorpay: () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  email: () => Boolean(process.env.RESEND_API_KEY),
  whatsapp: () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
};

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
