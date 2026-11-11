import { prisma } from "./db";
import type { Prisma } from "@prisma/client";

// Small DB-backed cache so repeated searches don't spend paid/limited API requests.
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const row = await prisma.apiCache.findUnique({ where: { key } });
    if (!row || row.expiresAt < new Date()) return null;
    return row.data as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, data: unknown, ttlMs: number) {
  const expiresAt = new Date(Date.now() + ttlMs);
  const json = data as Prisma.InputJsonValue;
  try {
    await prisma.apiCache.upsert({ where: { key }, create: { key, data: json, expiresAt }, update: { data: json, expiresAt } });
  } catch (e) {
    console.error("[cache]", (e as Error).message);
  }
}
