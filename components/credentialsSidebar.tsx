"use client";
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StoredKeyMeta { provider: string; id: number }

export function CredentialsSidebar() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [keysPresent, setKeysPresent] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ gemini: '', kimi: '', deepseek: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(()=>{
    (async()=>{
      const me = await fetch('/api/keys/bulk', { method: 'GET' });
      if (me.status === 401) { setLoggedIn(false); return; }
      if (me.ok) {
        const json = await me.json() as StoredKeyMeta[];
        const map: Record<string, boolean> = {};
        json.forEach(r => { map[r.provider] = true; });
        setKeysPresent(map); setLoggedIn(true);
      }
    })();
  }, []);

  async function save() {
    setSaving(true); setError(null);
    try {
      const entries = Object.entries(form)
        .filter(([, value]) => value.trim())
        .map(([provider, key]) => ({ provider, key: key.trim() }));
      if (!entries.length) { setSaving(false); return; }
      const res = await fetch('/api/keys/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys: entries }) });
      if (!res.ok) { setError('Gagal menyimpan'); }
      else {
        const updated: Record<string, boolean> = { ...keysPresent };
        entries.forEach(e => { updated[e.provider] = true; });
        setKeysPresent(updated);
        setForm({ gemini: '', kimi: '', deepseek: '' });
      }
    } finally { setSaving(false); }
  }

  function login() { window.location.href = '/api/auth/login'; }
  function logout() { window.location.href = '/api/auth/logout'; }

  return (
    <>
      <Button variant="outline" className="fixed top-4 right-4 z-40" onClick={()=>setOpen(o=>!o)}>{open ? 'Tutup' : 'Creds'}</Button>
      <div className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-neutral-900 shadow-lg border-l border-neutral-200 dark:border-neutral-800 transform transition-transform z-30 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 space-y-4 h-full flex flex-col">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-lg">Credentials</h2><Button size="sm" variant="ghost" onClick={()=>setOpen(false)}>X</Button></div>
          {loggedIn === null && <p className="text-sm text-neutral-500">Memuat...</p>}
          {loggedIn === false && (
            <div className="space-y-3">
              <p className="text-sm">Login untuk menyimpan API key.</p>
              <Button size="sm" onClick={login}>Login</Button>
            </div>
          )}
          {loggedIn && (
            <div className="space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-2">Gemini Key {keysPresent['gemini'] && <span className="text-green-600 text-[10px] bg-green-100 px-1 rounded">AUTO</span>}</label>
                <Input placeholder="Simpan / perbarui" value={form.gemini} onChange={e=>setForm(f=>({...f, gemini: e.target.value}))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-2">Kimi Key {keysPresent['kimi'] && <span className="text-green-600 text-[10px] bg-green-100 px-1 rounded">AUTO</span>}</label>
                <Input placeholder="Simpan / perbarui" value={form.kimi} onChange={e=>setForm(f=>({...f, kimi: e.target.value}))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-2">DeepSeek Key {keysPresent['deepseek'] && <span className="text-green-600 text-[10px] bg-green-100 px-1 rounded">AUTO</span>}</label>
                <Input placeholder="Simpan / perbarui" value={form.deepseek} onChange={e=>setForm(f=>({...f, deepseek: e.target.value}))} />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
                <Button size="sm" variant="outline" onClick={logout}>Logout</Button>
              </div>
              <p className="text-[10px] text-neutral-500">Key terenkripsi (AES-256-GCM) sebelum disimpan.</p>
            </div>
          )}
          <div className="mt-auto text-[10px] text-neutral-400">Sidebar Credentials</div>
        </div>
      </div>
    </>
  );
}
