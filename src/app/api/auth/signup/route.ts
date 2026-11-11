import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { serverError } from "@/lib/dbError";

const Body = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  phone: z.string().trim().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    return serverError(e);
  }
}

async function handle(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, password } = parsed.data;
  const phone = parsed.data.phone.startsWith("+91") ? parsed.data.phone : `+91${parsed.data.phone}`;

  if (await prisma.user.findUnique({ where: { email } }))
    return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });

  const user = await prisma.user.create({ data: { name, email, phone, passwordHash: await bcrypt.hash(password, 10) } });
  await startSession(user);
  return NextResponse.json({ ok: true });
}
