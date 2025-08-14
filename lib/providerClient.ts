// Centralized provider calling logic with retries, timeouts, and graceful fallback extraction
import { MODELS, type SupportedProvider } from '@/lib/utils';

export interface ProviderCallOptions {
  provider: SupportedProvider;
  system: string;
  user: string;
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number; // total attempts = maxRetries
  retryDelayBaseMs?: number;
}

export interface ProviderCallSuccess { ok: true; text: string; attempts: number; timings: { total: number } }
export interface ProviderCallError { ok: false; error: string; attempts: number; cause?: string; status?: number; bodySnippet?: string; timings: { total: number } }
export type ProviderCallResult = ProviderCallSuccess | ProviderCallError;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(id); }
}

export async function callProviderWithRetries(opts: ProviderCallOptions): Promise<ProviderCallResult> {
  const { provider, system, user, apiKey, timeoutMs = 30000, maxRetries = 3, retryDelayBaseMs = 1200 } = opts;
  if (!MODELS[provider]) return { ok: false, error: 'unsupported_provider', attempts: 0, timings: { total: 0 } };
  const model = MODELS[provider];
  const t0 = Date.now();
  let lastErr: ProviderCallError | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let res: Response;
      if (provider === 'gemini') {
        res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: system + '\n' + user }] }] })
        }, timeoutMs);
      } else if (provider === 'kimi') {
        res = await fetchWithTimeout('https://api.moonshot.cn/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.5 })
        }, timeoutMs);
      } else { // deepseek
        res = await fetchWithTimeout('https://api.deepseek.com/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.5 })
        }, timeoutMs);
      }
      const json = await res.json().catch(()=>({}));
      const text = provider === 'gemini'
        ? (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
        : (json.choices?.[0]?.message?.content ?? '');
      if (!res.ok) {
        const lowerMsg: string = (text || json.error?.message || '').toLowerCase();
        // Map specific provider billing/auth errors
        if (res.status === 402 || lowerMsg.includes('insufficient balance')) {
          lastErr = { ok: false, error: 'insufficient_balance', attempts: attempt, status: res.status, bodySnippet: JSON.stringify(json).slice(0, 280), timings: { total: Date.now() - t0 }, cause: text || json.error?.message };
          break; // no point retrying billing issues
        }
        if (res.status === 401) {
          lastErr = { ok: false, error: 'unauthorized', attempts: attempt, status: res.status, bodySnippet: JSON.stringify(json).slice(0, 280), timings: { total: Date.now() - t0 }, cause: text || json.error?.message };
          break; // invalid credentials, stop retries
        }
        lastErr = { ok: false, error: 'http_error', attempts: attempt, status: res.status, bodySnippet: JSON.stringify(json).slice(0, 280), timings: { total: Date.now() - t0 }, cause: text || json.error?.message };
      } else if (!text) {
        lastErr = { ok: false, error: 'empty_response', attempts: attempt, timings: { total: Date.now() - t0 }, cause: JSON.stringify(json).slice(0, 220) };
      } else {
        return { ok: true, text, attempts: attempt, timings: { total: Date.now() - t0 } };
      }
    } catch (e: unknown) {
      const cause = e instanceof Error ? `${e.name}: ${e.message}` : 'Unknown throw';
      lastErr = { ok: false, error: 'network_or_timeout', attempts: attempt, cause, timings: { total: Date.now() - t0 } };
    }
    if (attempt < maxRetries) {
      const backoff = retryDelayBaseMs * Math.pow(1.8, attempt - 1);
      await sleep(backoff);
    }
  }
  return lastErr ?? { ok: false, error: 'unknown', attempts: maxRetries, timings: { total: Date.now() - t0 } };
}

// No fallback generator: caller must handle errors.
