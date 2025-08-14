"use server";
import { COMPLEX_SINGLE_SYSTEM, buildSingleVariationPrompt, type SupportedProvider } from '@/lib/utils';
import { complexPromptItemSchema, type ComplexPromptItem } from '@/lib/complexPromptSchema';
import { callProviderWithRetries } from '@/lib/providerClient';
import { salvageJsonObject } from '@/lib/jsonRepair';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { apiKeys } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';

type BaseResult = { ok: true; data: ComplexPromptItem; raw: string; meta?: { cached: boolean; timings: Record<string, number>; attempts?: number; salvageMethod?: string } } | { ok: false; error: string; raw?: string; meta?: { cached: boolean; timings?: Record<string, number>; attempts?: number; provider_error_code?: string; cause?: string; status?: number; bodySnippet?: string; salvageMethod?: string } };

// Simple in-memory cache (ephemeral) per server instance
const BASE_PARAMS_CACHE = new Map<string, { ts: number; data: ComplexPromptItem; raw: string }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Timing stats registry for provider performance (used by providerStats action)
interface ProviderTimingRegistry { [provider: string]: number[] }
declare global { // eslint-disable-next-line no-unused-vars
  // eslint-disable-next-line no-var
  var __VEO_PROVIDER_TIMINGS__: ProviderTimingRegistry | undefined;
}
const PROVIDER_TIMINGS: ProviderTimingRegistry = globalThis.__VEO_PROVIDER_TIMINGS__ || {};
globalThis.__VEO_PROVIDER_TIMINGS__ = PROVIDER_TIMINGS;

function recordTiming(provider: string, ms: number) {
  if (!PROVIDER_TIMINGS[provider]) PROVIDER_TIMINGS[provider] = [];
  PROVIDER_TIMINGS[provider].push(ms);
  if (PROVIDER_TIMINGS[provider].length > 50) PROVIDER_TIMINGS[provider].shift();
}

// previous fetchWithTimeout replaced by providerClient retry logic

async function resolveUserKey(provider: SupportedProvider, override?: string) {
  if (override) return override;
  const envKey = process.env[provider.toUpperCase() + '_API_KEY'];
  if (envKey) return envKey;
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const db = getDb();
  const rows = await db.select().from(apiKeys).where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, provider))).orderBy(desc(apiKeys.createdAt)).limit(1);
    if (rows.length && rows[0].encryptedKey) return decrypt(rows[0].encryptedKey);
  } catch {}
  return null;
}

export async function prepareComplexBaseParamsAction(provider: SupportedProvider, coreIdea: string, apiKeyOverride?: string): Promise<BaseResult> {
  const key = await resolveUserKey(provider, apiKeyOverride);
  if (!key) return { ok: false, error: 'missing_api_key', meta: { cached: false } };
  const cacheKey = provider + '|' + coreIdea.trim();
  const now = Date.now();
  const cached = BASE_PARAMS_CACHE.get(cacheKey);
  if (cached && (now - cached.ts) < CACHE_TTL_MS) {
    return { ok: true, data: cached.data, raw: cached.raw, meta: { cached: true, timings: { total: 0 } } };
  }
  const system = COMPLEX_SINGLE_SYSTEM;
  const user = buildSingleVariationPrompt(coreIdea, 1, 1);
  const t0 = Date.now();
  const call = await callProviderWithRetries({ provider, system, user, apiKey: key, maxRetries: 3 });
  const total = Date.now() - t0;
  if (!call.ok) {
    const errMeta = call as { attempts: number; error: string; cause?: string; status?: number; bodySnippet?: string };
    return { ok: false, error: 'provider_request_failed', meta: { cached: false, timings: { total }, attempts: errMeta.attempts, provider_error_code: errMeta.error, cause: errMeta.cause, status: errMeta.status, bodySnippet: errMeta.bodySnippet } };
  }
  const cleaned = call.text.replace(/```json|```/g, '').trim();
  const salvage = salvageJsonObject(cleaned);
  const candidate = salvage.json ?? cleaned;
  try {
  const parsed = JSON.parse(candidate);
    const safe = complexPromptItemSchema.safeParse(parsed);
    recordTiming(provider, total);
    if (!safe.success) {
      return { ok: false, error: 'schema_validation_failed', raw: candidate, meta: { cached: false, timings: { total }, attempts: call.attempts, salvageMethod: salvage.method } };
    }
  BASE_PARAMS_CACHE.set(cacheKey, { ts: Date.now(), data: safe.data, raw: candidate });
  return { ok: true, data: safe.data, raw: candidate, meta: { cached: false, timings: { total }, attempts: call.attempts, salvageMethod: salvage.method } };
  } catch {
  return { ok: false, error: 'invalid_json', raw: candidate, meta: { cached: false, timings: { total }, attempts: call.attempts, salvageMethod: salvage.method } };
  }
}
