"use server";
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { eq, and } from 'drizzle-orm';

export async function saveApiKeysAction(keys: { provider: string; key: string }[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'unauthorized' } as const;
  if (!Array.isArray(keys) || !keys.length) return { ok: false, error: 'no_keys' } as const;
  const db = getDb();
  for (const { provider, key } of keys) {
    if (!provider || !key) continue;
    await db.delete(apiKeys).where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, provider))).catch(()=>{});
    await db.insert(apiKeys).values({ userId: user.id, provider, encryptedKey: encrypt(key) });
  }
  return { ok: true } as const;
}
