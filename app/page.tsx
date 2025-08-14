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
  const [phase, setPhase] = useState<'input'|'edit'|'confirm'|'dialogue'|'generating'|'done'>('input');
  const [awaitingUserNext, setAwaitingUserNext] = useState(false);
  const [wantDialogue, setWantDialogue] = useState<'unknown'|'yes'|'no'>('unknown');
  const [dialogueInstruction, setDialogueInstruction] = useState('');
  const [globalDuration, setGlobalDuration] = useState('8');

  function handlePrepare() {
    setError(null); setBaseParams(null); setOutputs([]); setPhase('input');
    startTransition(async () => {
      const res = await prepareComplexBaseParamsAction(provider, coreIdea, apiKey || undefined);
      if (!res.ok) {
        const m = res.meta as { attempts?: number; cause?: string; status?: number; bodySnippet?: string; salvageMethod?: string } | undefined;
        setError(res.error);
        addErrorLog({ phase: 'prepare', provider, coreIdea, code: res.error, attempts: m?.attempts, cause: m?.cause, status: m?.status, bodySnippet: m?.bodySnippet, salvageMethod: m?.salvageMethod, raw: res.raw });
        return;
      }
      setBaseParams(res.data); setPhase('edit');
  // meta no longer used (fallback removed)
  // no fallback: if schema/generation failed user already sees error
    });
  }

  function proceedToConfirm() { setPhase('confirm'); }
  function handleDialogueChoice(choice: 'yes'|'no') {
    setWantDialogue(choice);
    if (choice === 'yes') { setPhase('dialogue'); } else { startGeneration(); }
  }
  function startGeneration() {
    // apply global duration override to base params if present
    if (baseParams && globalDuration) {
      const sanitized = sanitizeDuration(globalDuration);
      baseParams.technical_parameters.duration_seconds = sanitized;
    }
    setOutputs([]); setCurrentIdx(0); setPhase('generating'); setAwaitingUserNext(true);
  }
  async function generateNext() {
    const nextIndex = currentIdx + 1;
  if (nextIndex > targetCount) { setPhase('done'); setAwaitingUserNext(false); return; }
    setAwaitingUserNext(false);
    const res = await generateSingleComplexPromptAction(provider, coreIdea, nextIndex, targetCount, apiKey || undefined, baseParams || undefined, dialogueInstruction || undefined);
  if (!res.ok) {
    const m = res.meta as { attempts?: number; cause?: string; status?: number; bodySnippet?: string; salvageMethod?: string } | undefined;
    setError(res.error + ` at item ${nextIndex}`);
    addErrorLog({ phase: 'generate', provider, coreIdea, code: res.error, attempts: m?.attempts, cause: m?.cause, status: m?.status, bodySnippet: m?.bodySnippet, salvageMethod: m?.salvageMethod, raw: res.raw });
    setPhase('done');
    return;
  }
    setOutputs(prev => [...prev, { ...(res.data as ComplexPromptItem), _index: nextIndex - 1 }]);
  // meta no longer used (fallback removed)
  // no fallback messaging
    setCurrentIdx(nextIndex);
  if (nextIndex < targetCount) { setAwaitingUserNext(true); } else { setPhase('done'); }
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
            <Button onClick={handlePrepare} disabled={isGenerating} className="w-full h-11 font-semibold shadow-md">{isGenerating ? 'Preparing...' : 'Buat Parameter Dasar'}</Button>
          )}
          {phase === 'edit' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">Jumlah Output <span className="text-[11px] text-muted-foreground">1–10</span></label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={targetCount}
                  onChange={e=> {
                    const v = e.target.value;
                    if (v === '') { setTargetCount(1); return; }
                    const num = parseInt(v,10);
                    if (!Number.isNaN(num)) setTargetCount(Math.min(10, Math.max(1, num)));
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">Durasi (detik) <span className="text-[11px] text-muted-foreground">contoh: 8</span></label>
                <Input type="number" min={1} max={30} value={globalDuration} onChange={e=> setGlobalDuration(e.target.value.replace(/[^0-9]/g,''))} />
              </div>
              <Button onClick={proceedToConfirm} className="w-full h-11 font-semibold">Lanjut Konfirmasi</Button>
            </div>
          )}
          {phase === 'confirm' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Siap generate {targetCount} output sequential. Kamu akan konfirmasi tiap output.</p>
              <div className="space-y-2 text-xs">
                <p className="text-muted-foreground">Apakah ingin menambahkan arahan dialog untuk subjek? (opsional)</p>
                <div className="flex gap-2">
                  <Button type="button" variant={wantDialogue==='yes'? 'default':'outline'} className="flex-1 h-9" onClick={()=>handleDialogueChoice('yes')}>Ya, tambah dialog</Button>
                  <Button type="button" variant={wantDialogue==='no'? 'default':'outline'} className="flex-1 h-9" onClick={()=>handleDialogueChoice('no')}>Tidak</Button>
                </div>
              </div>
              <Button onClick={()=>handleDialogueChoice('no')} className="w-full h-11 font-semibold">Lewati & Generate</Button>
            </div>
          )}
          {phase === 'dialogue' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Tulis arahan dialog / tone percakapan (opsional). Kosongkan jika batal.</p>
              <Textarea value={dialogueInstruction} onChange={e=>setDialogueInstruction(e.target.value)} className="min-h-[100px] text-xs" placeholder="Contoh: Pemuda itu berbicara perlahan tentang pentingnya kesabaran, gunakan bahasa yang natural & emosional." />
              <div className="flex gap-2">
                <Button onClick={startGeneration} className="flex-1 h-11 font-semibold">Mulai Generate</Button>
                <Button variant="outline" onClick={()=>{ setDialogueInstruction(''); startGeneration(); }} className="flex-1 h-11">Lewati</Button>
              </div>
            </div>
          )}
          {phase === 'generating' && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Progress: {currentIdx}/{targetCount}</p>
              {awaitingUserNext ? (
                <Button onClick={generateNext} className="w-full h-11 font-semibold">Generate Output {currentIdx + 1}</Button>
              ) : (
                <Button disabled className="w-full h-11">Menunggu...</Button>
              )}
            </div>
          )}
          {phase === 'done' && (
            <div className="space-y-4">
              <p className="text-xs text-green-600">Selesai: {outputs.length} output.</p>
              <Button onClick={()=>{ setPhase('input'); setOutputs([]); setBaseParams(null); setDialogueInstruction(''); setWantDialogue('unknown'); }} variant="outline" className="w-full h-11">Reset</Button>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="md:col-span-2 space-y-4">
          {baseParams && phase !== 'input' && (
            <div className="rounded-lg border bg-white/70 backdrop-blur p-4">
              <h2 className="text-sm font-semibold mb-2">Parameter Dasar (Edit sebelum generate variasi)</h2>
              <EditableParamFields prompt={{ ...baseParams, _index: -1 }} onChange={(p)=> setBaseParams(p)} />
            </div>
          )}
          {outputs.length === 0 && phase === 'input' && (
            <div className="rounded-lg border bg-white/60 backdrop-blur p-6 text-sm text-muted-foreground">Belum ada output. Buat parameter dasar dulu.</div>
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

function EditableParamFields({ prompt, onChange }: { prompt: ComplexPromptItem & { _index: number }; onChange: (p: ComplexPromptItem)=>void }) {
  const [local, setLocal] = useState<ComplexPromptItem>(prompt);
  function updateNested(path: string[], value: string) {
    const clone: Record<string, unknown> = JSON.parse(JSON.stringify(local));
    let cursor: unknown = clone;
    for (let i=0;i<path.length-1;i++) {
      if (typeof cursor === 'object' && cursor && path[i] in (cursor as Record<string, unknown>)) {
        cursor = (cursor as Record<string, unknown>)[path[i]];
      }
    }
    if (typeof cursor === 'object' && cursor) {
      (cursor as Record<string, unknown>)[path[path.length-1]] = value;
    }
    const casted = clone as unknown as ComplexPromptItem;
    setLocal(casted); onChange(casted);
  }
  return (
    <div className="space-y-2 border rounded-md p-2 bg-white/60">
      <ParamField label="Title" value={local.video_concept.title} onChange={v=>updateNested(['video_concept','title'], v)} />
      <ParamField label="Logline" value={local.video_concept.logline} onChange={v=>updateNested(['video_concept','logline'], v)} />
      <ParamField label="Subject" value={local.video_concept.subject} onChange={v=>updateNested(['video_concept','subject'], v)} />
      <ParamField label="Setting" value={local.video_concept.setting} onChange={v=>updateNested(['video_concept','setting'], v)} />
      <ParamField label="Mood" value={local.visuals.mood_and_atmosphere.mood} onChange={v=>updateNested(['visuals','mood_and_atmosphere','mood'], v)} />
      <ParamField label="Lighting" value={local.visuals.mood_and_atmosphere.lighting} onChange={v=>updateNested(['visuals','mood_and_atmosphere','lighting'], v)} />
      <ParamField label="Color Palette" value={local.visuals.mood_and_atmosphere.color_palette} onChange={v=>updateNested(['visuals','mood_and_atmosphere','color_palette'], v)} />
      <ParamField label="Shot Type" value={local.cinematography.composition.shot_type} onChange={v=>updateNested(['cinematography','composition','shot_type'], v)} />
      <ParamField label="Camera Angle" value={local.cinematography.composition.camera_angle} onChange={v=>updateNested(['cinematography','composition','camera_angle'], v)} />
      <ParamField label="Focus" value={local.cinematography.composition.focus} onChange={v=>updateNested(['cinematography','composition','focus'], v)} />
      <ParamField label="Subject Action" value={local.cinematography.motion.subject_action} onChange={v=>updateNested(['cinematography','motion','subject_action'], v)} />
      <ParamField label="Camera Movement" value={local.cinematography.motion.camera_movement} onChange={v=>updateNested(['cinematography','motion','camera_movement'], v)} />
      <ParamField label="Dynamic Effects" value={local.cinematography.motion.dynamic_effects} onChange={v=>updateNested(['cinematography','motion','dynamic_effects'], v)} />
      <ParamField label="SFX" value={local.audio.sound_effects} onChange={v=>updateNested(['audio','sound_effects'], v)} />
  <ParamField label="Background Music" value={(local as unknown as { audio: { background_music?: string } }).audio.background_music || ''} onChange={v=>updateNested(['audio','background_music'], v)} />
      <div className="grid grid-cols-2 gap-2">
        <ParamField label="Duration (s)" value={local.technical_parameters.duration_seconds} onChange={v=>updateNested(['technical_parameters','duration_seconds'], sanitizeDuration(v))} />
        <ParamField label="Aspect Ratio" value={local.technical_parameters.aspect_ratio} onChange={v=>updateNested(['technical_parameters','aspect_ratio'], v)} />
        <ParamField label="Quality" value={local.technical_parameters.quality} onChange={v=>updateNested(['technical_parameters','quality'], v)} />
        <ParamField label="Frame Rate" value={local.technical_parameters.frame_rate} onChange={v=>updateNested(['technical_parameters','frame_rate'], v)} />
      </div>
      <ParamField label="Negative Prompt" value={local.negative_prompt} onChange={v=>updateNested(['negative_prompt'], v)} />
    </div>
  );
}

function ParamField({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v:string)=>void; textarea?: boolean }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea className="border rounded px-2 py-1 text-[11px] resize-y min-h-[48px]" value={value} onChange={e=>onChange(e.target.value)} />
      ) : (
        <input className="border rounded px-2 py-1 text-[11px]" value={value} onChange={e=>onChange(e.target.value)} />
      )}
    </label>
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
