import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '@/lib/crypto';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider, key } = body;
  if (!provider || !key) return new Response('Missing provider or key', { status: 400 });
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const db = getDb();
  const encryptedKey = encrypt(key);
  await db.insert(apiKeys).values({ userId: user.id, provider, encryptedKey });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const db = getDb();
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
  return new Response(JSON.stringify(rows.map(r => ({ id: r.id, provider: r.provider, key: '***' }))), { status: 200 });
}
