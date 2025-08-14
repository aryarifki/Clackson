import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { encrypt } from '@/lib/crypto';
import { eq, desc, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const body = await req.json().catch(()=>({}));
  const entries = body?.keys as { provider: string; key: string }[] | undefined;
  if (!Array.isArray(entries) || !entries.length) return new Response('Missing keys', { status: 400 });
  const db = getDb();
    for (const { provider, key } of entries) {
      if (!provider || !key) continue;
      await db.delete(apiKeys).where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, provider))).catch(()=>{});
      await db.insert(apiKeys).values({ userId: user.id, provider, encryptedKey: encrypt(key) });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const db = getDb();
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id)).orderBy(desc(apiKeys.createdAt));
  const latest: Record<string, { provider: string; id: number }> = {};
  for (const r of rows) {
    if (!latest[r.provider]) latest[r.provider] = { provider: r.provider, id: r.id };
  }
  return new Response(JSON.stringify(Object.values(latest)), { status: 200 });
}
