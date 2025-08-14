"use server";
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function getStoredKeyProvidersAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: true, providers: [], loggedIn: false } as const;
  const db = getDb();
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id)).orderBy(desc(apiKeys.createdAt));
  const set = new Set<string>();
  for (const r of rows) if (!set.has(r.provider)) set.add(r.provider);
  return { ok: true, providers: Array.from(set), loggedIn: true } as const;
}
