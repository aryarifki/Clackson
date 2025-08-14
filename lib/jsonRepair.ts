// Utility to salvage JSON objects from LLM outputs that may contain extra text or formatting
// Attempts: direct parse, fenced block extraction, brace range extraction, minimal repair of trailing commas.
export function salvageJsonObject(raw: string): { json: string | null; method: string } {
  const trimmed = raw.trim();
  // 1. direct
  if (attemptParse(trimmed)) return { json: trimmed, method: 'direct' };
  // 2. code fence removal
  const fenceStripped = trimmed.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
  if (attemptParse(fenceStripped)) return { json: fenceStripped, method: 'fence_stripped' };
  // 3. find first { and last }
  const first = fenceStripped.indexOf('{');
  const last = fenceStripped.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const slice = fenceStripped.slice(first, last + 1);
    if (attemptParse(slice)) return { json: slice, method: 'brace_slice' };
    // 4. minimal repairs: remove trailing commas before } or ]
    const repaired = slice
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\s+\n/g, '\n');
    if (attemptParse(repaired)) return { json: repaired, method: 'brace_slice_repaired' };
  }
  return { json: null, method: 'failed' };
}

function attemptParse(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}
