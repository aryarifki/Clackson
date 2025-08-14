import { NextRequest } from 'next/server';
import { SupportedProvider, type PromptInput } from '@/lib/utils';
import { generateCore } from '@/lib/generationCore';

interface ProviderPayload { provider: SupportedProvider; apiKey?: string; input: PromptInput }

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProviderPayload;
    const { provider, apiKey, input } = body;
  if (!provider) return new Response(JSON.stringify({ error: 'Invalid provider' }), { status: 400 });
  const result = await generateCore(provider, input, apiKey);
  const status = result.ok ? 200 : 400;
  return new Response(JSON.stringify(result), { status, headers: { 'Content-Type': 'application/json' } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

// Legacy helper code removed in favor of generationCore
