import { NextRequest } from 'next/server';
import { COMPLEX_SINGLE_SYSTEM, buildSingleVariationPrompt, type SupportedProvider } from '@/lib/utils';
import { complexPromptItemSchema } from '@/lib/complexPromptSchema';
import { callProviderWithRetries } from '@/lib/providerClient';
import { salvageJsonObject } from '@/lib/jsonRepair';

export const runtime = 'edge';

interface ResultOk { ok: true; data: unknown; raw: string; meta: { timings: Record<string, number>; cached: boolean } }
interface ResultErr { ok: false; error: string; raw?: string; meta?: { timings?: Record<string, number>; cached?: boolean; attempts?: number; provider_error?: string; cause?: string; status?: number; bodySnippet?: string; salvageMethod?: string } }

type Result = ResultOk | ResultErr; // eslint-disable-line @typescript-eslint/no-unused-vars

const CACHE = new Map<string, { ts: number; raw: string; data: unknown }>();
const TTL = 5 * 60 * 1000;

function getEnvKey(p: SupportedProvider) {
  switch (p) {
    case 'gemini': return process.env.GEMINI_API_KEY;
    case 'kimi': return process.env.KIMI_API_KEY;
    case 'deepseek': return process.env.DEEPSEEK_API_KEY;
  }
}

// fetchWithTimeout removed (handled in provider client)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider') as SupportedProvider | null;
  const coreIdea = searchParams.get('coreIdea') || '';
  const apiKey = searchParams.get('apiKey') || '';
  const allowed: SupportedProvider[] = ['gemini','kimi','deepseek'];
  if (!provider || !allowed.includes(provider)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_provider' } satisfies ResultErr), { status: 400 });
  }
  const cacheKey = provider + '|' + coreIdea.trim();
  const cached = CACHE.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.ts) < TTL) {
    return new Response(JSON.stringify({ ok: true, data: cached.data, raw: cached.raw, meta: { timings: { total: 0 }, cached: true } } satisfies ResultOk), { status: 200 });
  }
  const key = apiKey || getEnvKey(provider);
  if (!key) return new Response(JSON.stringify({ ok: false, error: 'missing_api_key' } satisfies ResultErr), { status: 400 });
  const system = COMPLEX_SINGLE_SYSTEM;
  const user = buildSingleVariationPrompt(coreIdea, 1, 1);
  const t0 = Date.now();
  const call = await callProviderWithRetries({ provider, system, user, apiKey: key, maxRetries: 3 });
  const total = Date.now() - t0;
  if (!call.ok) {
    const errMeta = call as { attempts: number; error: string; cause?: string; status?: number; bodySnippet?: string };
    return new Response(JSON.stringify({ ok: false, error: 'provider_request_failed', meta: { attempts: errMeta.attempts, provider_error: errMeta.error, cause: errMeta.cause, status: errMeta.status, bodySnippet: errMeta.bodySnippet } } satisfies ResultErr), { status: 502 });
  }
  const cleaned = call.text.replace(/```json|```/g, '').trim();
  const salvage = salvageJsonObject(cleaned);
  const candidate = salvage.json ?? cleaned;
  try {
    const parsed = JSON.parse(candidate);
    const safe = complexPromptItemSchema.safeParse(parsed);
    if (!safe.success) {
      return new Response(JSON.stringify({ ok: false, error: 'schema_validation_failed', raw: candidate, meta: { timings: { total }, cached: false, salvageMethod: salvage.method } } satisfies ResultErr), { status: 400 });
    }
    CACHE.set(cacheKey, { ts: Date.now(), raw: candidate, data: safe.data });
    return new Response(JSON.stringify({ ok: true, data: safe.data, raw: candidate, meta: { timings: { total }, cached: false } } satisfies ResultOk), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json', raw: candidate, meta: { timings: { total }, cached: false, salvageMethod: salvage.method } } satisfies ResultErr), { status: 400 });
  }
}
