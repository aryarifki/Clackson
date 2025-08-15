"use client";
import { useRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MODELS, providerLabel, type SupportedProvider } from '@/lib/utils';
import type { ComplexPromptItem } from '@/lib/complexPromptSchema';
import { prepareComplexBaseParamsAction } from '@/app/actions/prepareComplexBaseParams';
import { generateSingleComplexPromptAction } from '@/app/actions/generateSingleComplexPrompt';
import { useTransition } from 'react';

export default function HomePage() {
  const [provider, setProvider] = useState<SupportedProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [coreIdea, setCoreIdea] = useState('buat animasi yang menceritakan arti kesabaran dengan tokoh utama anak muda...');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [prefetching, setPrefetching] = useState(false);
  const [prefetched, setPrefetched] = useState(false);
  const [isPending, startTransition] = useTransition();
  interface ExtendedPrompt extends ComplexPromptItem { _index: number; dialogue?: string }
  const [baseParams, setBaseParams] = useState<ComplexPromptItem | null>(null);
  const [outputs, setOutputs] = useState<ExtendedPrompt[]>([]);
  const [error, setError] = useState<string | null>(null);
  interface ErrorLogEntry { id: number; ts: number; phase: string; provider: string; coreIdea: string; code: string; attempts?: number; cause?: string; status?: number; bodySnippet?: string; salvageMethod?: string; raw?: string }
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const logIdRef = useRef(0);
  function addErrorLog(e: Omit<ErrorLogEntry,'id'|'ts'>) {
    setErrorLogs(prev => [{ id: ++logIdRef.current, ts: Date.now(), ...e }, ...prev.slice(0,199)]);
  }
  const isGenerating = isPending;
  const outputRef = useRef<HTMLDivElement>(null);
  const [editedDialogues, setEditedDialogues] = useState<Record<number,string>>({});
  const [editedNegatives, setEditedNegatives] = useState<Record<number,string>>({});
  const [targetCount, setTargetCount] = useState(5);
  const [currentIdx, setCurrentIdx] = useState(0);
  // sequential state handled by phase + awaitingUserNext; legacy flag removed
  const [phase, setPhase] = useState<'input' | 'storyboard' | 'generating' | 'done'>('input');
  const [storyboard, setStoryboard] = useState('');
  const [scenes, setScenes] = useState<string[]>([]);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  async function generateStoryboard() {
    setIsGeneratingStoryboard(true);
    setError(null);
    setStoryboard('');
    const mockStoryboard = `
### Scene 1 (0-8s)
**Visuals:** A young programmer, ANNA (20s), is sitting in a dimly lit room, her face illuminated by the glow of her monitor. Code scrolls rapidly down the screen.
**Dialogue:** (V.O.) "They told me it was impossible. That the deadline was a fantasy."

### Scene 2 (8-16s)
**Visuals:** Close-up on Anna's eyes, showing intense focus. Her fingers fly across the keyboard.
**Narration:** "But in the world of code, fantasy is just a challenge waiting to be accepted."

### Scene 3 (16-24s)
**Visuals:** A montage of coffee cups, energy drink cans, and crumpled notes surrounding her workspace. The clock on the wall shows 3:00 AM.
**Dialogue:** (Anna, muttering to herself) "Come on, just a little more..."

### Scene 4 (24-32s)
**Visuals:** The code on her screen compiles successfully. A green checkmark appears. Anna leans back in her chair, a small smile on her face.
**Narration:** "Every line of code, a step forward. Every bug squashed, a victory."

### Scene 5 (32-40s)
**Visuals:** Anna is presenting her project in a bright, modern office. Her colleagues look impressed.
**Dialogue:** (Colleague) "This is incredible, Anna. How did you manage it?"

### Scene 6 (40-48s)
**Visuals:** Anna looks at her screen, where her application is running smoothly.
**Narration:** "It wasn't about managing time. It was about bending it."

### Scene 7 (48-56s)
**Visuals:** A stylized animation showing the application's UI, with data flowing and charts animating beautifully.
**Dialogue:** (Anna) "I just focused on one piece at a time."

### Scene 8 (56-64s)
**Visuals:** Back in her room, Anna is sketching new ideas on a whiteboard. The sun is rising outside her window.
**Narration:** "The end of one project is just the beginning of the next."

### Scene 9 (64-72s)
**Visuals:** A final shot of Anna, looking out the window at the sunrise, a look of determination and tranquility on her face.
**Dialogue:** (V.O.) "Because for us, the future is always under construction."

### Scene 10 (72-80s)
**Visuals:** The company logo appears on screen, with the tagline "Building Tomorrow's AI."
**Narration:** "And we are the architects."
    `;
    setStoryboard(mockStoryboard);
    setPhase('storyboard');
    setIsGeneratingStoryboard(false);
  }

  function startSequentialGeneration() {
    const parsedScenes = storyboard.split('###').slice(1);
    setScenes(parsedScenes);
    setOutputs([]);
    setCurrentIdx(0);
    setPhase('generating');
  }

  async function generateNextPrompt() {
    if (currentIdx >= scenes.length) {
      setPhase('done');
      return;
    }

    setIsGeneratingPrompt(true);
    const scene = scenes[currentIdx];
    // In a real implementation, we would call a server action here
    // const res = await generatePromptFromSceneAction(scene);
    // For now, create a mock prompt
    const mockPrompt = {
      _index: currentIdx,
      prompt: scene.trim(),
      // ... other fields from ComplexPromptItem
    };
    setOutputs(prev => [...prev, mockPrompt as any]);
    setCurrentIdx(prev => prev + 1);
    setIsGeneratingPrompt(false);

    if (currentIdx + 1 >= scenes.length) {
      setPhase('done');
    }
  }

  function handleDialogueChange(i: number, v: string) { setEditedDialogues(prev => ({ ...prev, [i]: v })); }
  function handleNegativeChange(i: number, v: string) { setEditedNegatives(prev => ({ ...prev, [i]: v })); }
  function mergedJSON(o: ExtendedPrompt): string {
    const idx = o._index as number;
    const neg = editedNegatives[idx] ?? o.negative_prompt;
    const dialog = editedDialogues[idx];
    const clone = { ...o, negative_prompt: neg };
    if (dialog) clone.dialogue = dialog;
    return JSON.stringify(clone, null, 2);
  }
  function copyJSON(str: string) { navigator.clipboard.writeText(str); }

  // Debounce coreIdea changes to prefetch base params silently (edge route)
  useEffect(()=>{
    if (!coreIdea.trim()) return; // skip empty
    setPrefetched(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPrefetching(true);
      try {
        const qs = new URLSearchParams({ provider, coreIdea });
        const res = await fetch(`/api/prepare-base?${qs.toString()}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.data && phase === 'input') {
            setBaseParams(prev => prev || data.data); // only set if not already prepared
            setPrefetched(true);
          }
        }
      } catch {/* aborted */}
      setPrefetching(false);
    }, 700); // 700ms debounce
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreIdea, provider]);

  // Auto-select fastest provider if stats loaded (placeholder: pick gemini for now) – future: fetch stats endpoint.

  return (
    <main className="container mx-auto py-6 md:py-8 max-w-7xl space-y-6 md:space-y-8 px-3" ref={outputRef}>
  <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-600 via-blue-600 to-cyan-500">Complex Veo Prompt Architect</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">Alur: 1) Tulis core idea 2) AI buat parameter dasar 3) Kamu edit parameter 4) Pilih jumlah output 5) Konfirmasi tiap output (jika &gt; 1) 6) Selesai.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select className="border rounded-md h-10 px-3 text-sm w-full md:w-56" value={provider} onChange={(e)=>setProvider(e.target.value as SupportedProvider)}>
            {Object.keys(MODELS).map(k => <option key={k} value={k}>{providerLabel[k as SupportedProvider]} ({MODELS[k as SupportedProvider]})</option>)}
          </select>
        </div>
      </header>
      <section className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Core Idea</label>
            <Textarea value={coreIdea} onChange={e=>setCoreIdea(e.target.value)} className="min-h-[140px]" />
            {prefetching && <span className="text-[10px] text-muted-foreground">Prefetching...</span>}
            {prefetched && !prefetching && <span className="text-[10px] text-green-600">Base params siap (prefetch)</span>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom API Key (override / opsional)</label>
            <Input placeholder="Override env / stored key" value={apiKey} onChange={e=>setApiKey(e.target.value)} />
          </div>
          {phase === 'input' && (
            <Button onClick={generateStoryboard} disabled={isGeneratingStoryboard} className="w-full h-11 font-semibold shadow-md">
              {isGeneratingStoryboard ? 'Processing...' : 'Process'}
            </Button>
          )}
          {phase === 'storyboard' && (
            <div className="space-y-4">
              <p className="text-xs text-green-600">Storyboard generated successfully.</p>
              <div className="flex gap-2">
                <Button onClick={generateStoryboard} className="flex-1 h-11 font-semibold">Refresh</Button>
                <Button onClick={startSequentialGeneration} className="flex-1 h-11">Proceed</Button>
              </div>
            </div>
          )}
          {phase === 'generating' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Progress: {currentIdx}/{scenes.length}</p>
              <Button onClick={generateNextPrompt} disabled={isGeneratingPrompt} className="w-full h-11 font-semibold">
                {isGeneratingPrompt ? 'Generating...' : `Generate Prompt ${currentIdx + 1}`}
              </Button>
            </div>
          )}
          {phase === 'done' && (
            <div className="space-y-4">
              <p className="text-xs text-green-600">Finished: {outputs.length} prompts generated.</p>
              <Button onClick={() => { setPhase('input'); setOutputs([]); setStoryboard(''); }} variant="outline" className="w-full h-11">Reset</Button>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="md:col-span-2 space-y-4">
          {phase === 'storyboard' && (
            <div className="rounded-lg border bg-background/50 backdrop-blur p-4">
              <h2 className="text-sm font-semibold mb-2">Storyboard (Review/Edit)</h2>
              <Textarea value={storyboard} onChange={e => setStoryboard(e.target.value)} className="min-h-[300px] text-sm" />
            </div>
          )}
          {outputs.length === 0 && phase !== 'storyboard' && (
            <div className="rounded-lg border bg-background/50 backdrop-blur p-6 text-sm text-muted-foreground">
              Enter a core idea and click "Process" to generate a storyboard.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {outputs.map((o, i) => (
              <div key={i} className="group relative rounded-lg border bg-white/70 backdrop-blur p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold tracking-wide text-pink-600">Prompt {i+1}</h3>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={()=>copyJSON(mergedJSON(o))}>Copy</Button>
                </div>
                <div className="mb-2 flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Dialogue (optional)</label>
                  <Textarea className="min-h-[60px] text-[11px]" value={editedDialogues[i] || ''} onChange={e=>handleDialogueChange(i, e.target.value)} placeholder="Add dialogue lines or narration..." />
                </div>
                <div className="mb-2 flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-muted-foreground">Negative Prompts / Unwanted</label>
                  <Textarea className="min-h-[60px] text-[11px]" value={editedNegatives[i] ?? o.negative_prompt} onChange={e=>handleNegativeChange(i, e.target.value)} />
                </div>
                <EditableParamFields prompt={o} onChange={(updated)=> setOutputs(prev => prev.map(p => p._index===o._index ? { ...updated, _index: p._index } : p))} />
                <pre className="mt-2 text-[10px] leading-snug overflow-auto rounded bg-neutral-900 text-neutral-100 p-2 flex-1 max-h-64 whitespace-pre-wrap">{mergedJSON(o)}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>
      {errorLogs.length > 0 && (
        <ErrorLogPanel logs={errorLogs} onClear={()=>setErrorLogs([])} />
      )}
    </main>
  );
}

function PromptCard({ prompt, onCopy }: { prompt: ComplexPromptItem & { _index: number }; onCopy: () => void }) {
  return (
    <div className="group relative rounded-lg border bg-background/70 backdrop-blur p-3 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold tracking-wide text-pink-600">Prompt {prompt._index + 1}</h3>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onCopy}>Copy</Button>
      </div>
      <pre className="mt-2 text-[10px] leading-snug overflow-auto rounded bg-neutral-900 text-neutral-100 p-2 flex-1 max-h-64 whitespace-pre-wrap">
        {JSON.stringify(prompt, null, 2)}
      </pre>
    </div>
  );
}

function sanitizeDuration(raw: string): string {
  const digits = raw.replace(/[^0-9]/g,'');
  if (!digits) return '';
  return digits + (digits.endsWith('s') ? '' : 's');
}

function ErrorLogPanel({ logs, onClear }: { logs: { id:number; ts:number; phase:string; provider:string; coreIdea:string; code:string; attempts?:number; cause?:string; status?:number; bodySnippet?:string; salvageMethod?:string; raw?:string }[]; onClear: ()=>void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-2 right-2 w-full max-w-md z-50 text-[11px]">
      <div className="rounded-md border bg-white/90 backdrop-blur shadow-lg">
        <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center justify-between px-3 py-2 font-medium text-xs">
          <span>Error Logs ({logs.length})</span>
          <span>{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="max-h-72 overflow-auto divide-y">
            <div className="flex justify-end px-3 py-1"><button onClick={onClear} className="text-[10px] underline">Clear</button></div>
            {logs.map(l => (
              <div key={l.id} className="px-3 py-2 space-y-1">
                <div className="flex justify-between"><span className="font-semibold text-red-600">{l.code}</span><span className="text-[10px] text-muted-foreground">{new Date(l.ts).toLocaleTimeString()}</span></div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <span className="text-muted-foreground">Phase</span><span>{l.phase}</span>
                  <span className="text-muted-foreground">Provider</span><span>{l.provider}</span>
                  {l.attempts!==undefined && <><span className="text-muted-foreground">Attempts</span><span>{l.attempts}</span></>}
                  {l.status!==undefined && <><span className="text-muted-foreground">HTTP</span><span>{l.status}</span></>}
                  {l.salvageMethod && <><span className="text-muted-foreground">Salvage</span><span>{l.salvageMethod}</span></>}
                </div>
                {l.cause && <div><span className="text-muted-foreground">Cause: </span><span className="break-words">{l.cause}</span></div>}
                {l.bodySnippet && <pre className="bg-neutral-900/80 text-neutral-100 p-1 rounded overflow-auto max-h-20 whitespace-pre-wrap">{l.bodySnippet}</pre>}
                {l.raw && <details className="mt-1">
                  <summary className="cursor-pointer select-none">Raw</summary>
                  <pre className="bg-neutral-800 text-neutral-100 p-1 rounded overflow-auto max-h-24 whitespace-pre-wrap">{l.raw}</pre>
                </details>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
