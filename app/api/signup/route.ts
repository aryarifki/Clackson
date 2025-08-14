import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) return new Response('Missing fields', { status: 400 });
    const db = getDb();
    const lower = String(email).toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, lower));
    if (existing) return new Response('Email already exists', { status: 400 });
    const hash = await bcrypt.hash(password, 10);
    await db.insert(users).values({ email: lower, passwordHash: hash, name });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response('Error: ' + message, { status: 500 });
  }
}
