// Auth0-based user accessor replacing legacy cookie auth.
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
// Auth0 SDK exports getSession via server side helpers; require form avoids TS type mismatch if types lag.
// eslint-disable-next-line @typescript-eslint/no-var-requires
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { getSession } = require('@auth0/nextjs-auth0');

export interface SessionData { id: number; email: string; name?: string | null }

// getCurrentUser now derives from Auth0 session; will create user row if missing.
export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  const authUser = session?.user;
  if (!authUser?.email || !authUser?.sub) return null;
  const email = authUser.email.toLowerCase();
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length) {
    const u = existing[0];
    // Backfill auth0Sub if missing
    if (!u.auth0Sub) {
      await db.update(users).set({ auth0Sub: authUser.sub }).where(eq(users.id, u.id)).catch(()=>{});
    }
    return { id: u.id, email: u.email, name: u.name };
  }
  // Create new user
  try {
  const inserted = await db.insert(users).values({ email, name: authUser.name, image: (authUser as { picture?: string }).picture, auth0Sub: authUser.sub }).returning({ id: users.id });
    return { id: inserted[0].id, email, name: authUser.name };
  } catch {
    // Race condition: another request inserted user.
    const again = await db.select().from(users).where(eq(users.email, email));
    if (again.length) return { id: again[0].id, email: again[0].email, name: again[0].name };
    return null;
  }
}

// Deprecated legacy exports kept as no-ops for compatibility during refactor.
export async function createSessionCookie() { /* noop - Auth0 manages session */ }
export async function destroySessionCookie() { /* noop */ }
export async function verifyUserCredentials() { return null; }
