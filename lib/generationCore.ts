import { MODELS, SYSTEM_STYLE, buildUserPrompt, type PromptInput, type SupportedProvider } from '@/lib/utils';
import { veoPromptSchema } from '@/lib/promptSchema';

export interface GenerationResultSuccess { ok: true; data: unknown; raw?: string; }
export interface GenerationResultError { ok: false; error: string; raw?: string; issues?: unknown; }
export type GenerationResult = GenerationResultSuccess | GenerationResultError;

function getEnvKey(p: SupportedProvider) {
  switch (p) {
    case 'gemini': return process.env.GEMINI_API_KEY;
    case 'kimi': return process.env.KIMI_API_KEY;
    case 'deepseek': return process.env.DEEPSEEK_API_KEY;
  }
}

export async function generateCore(provider: SupportedProvider, input: PromptInput, apiKeyOverride?: string): Promise<GenerationResult> {
  if (!MODELS[provider]) return { ok: false, error: 'unsupported_provider' };
  const modelName = MODELS[provider];
  const system = SYSTEM_STYLE;
  const userPrompt = buildUserPrompt(input);
  const key = apiKeyOverride || getEnvKey(provider);
  if (!key) return { ok: false, error: 'missing_api_key' };
  let text = '{}';
  try {
    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: system + '\n' + userPrompt }] }] }) });
      const data = await res.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    } else if (provider === 'kimi') {
      const res = await fetch('https://api.moonshot.cn/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: modelName, messages: [{ role: 'system', content: system }, { role: 'user', content: userPrompt }], temperature: 0.4 }) });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content || '{}';
    } else {
      const res = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: modelName, messages: [{ role: 'system', content: system }, { role: 'user', content: userPrompt }], temperature: 0.4 }) });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content || '{}';
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: 'provider_request_failed', raw: message };
  }
  const cleaned = text.replace(/```json|```/g, '').trim();
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { return { ok: false, error: 'invalid_json', raw: cleaned }; }
  const safe = veoPromptSchema.safeParse(parsed);
  if (!safe.success) {
    return { ok: false, error: 'schema_validation_failed', raw: cleaned, issues: safe.error.issues };
  }
  return { ok: true, data: safe.data, raw: cleaned };
}
