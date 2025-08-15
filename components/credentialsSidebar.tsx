"use client";
import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StoredKeyMeta { provider: string; id: number }

export function CredentialsSidebar() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [keysPresent, setKeysPresent] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ gemini: '', kimi: '', deepseek: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      (async () => {
        const me = await fetch('/api/keys/bulk');
        if (me.ok) {
          const json = await me.json() as StoredKeyMeta[];
          const map: Record<string, boolean> = {};
          json.forEach(r => { map[r.provider] = true; });
          setKeysPresent(map);
        }
      })();
    }
  }, [status]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const entries = Object.entries(form)
        .filter(([, value]) => value.trim())
        .map(([provider, key]) => ({ provider, key: key.trim() }));
      if (!entries.length) {
        setSaving(false);
        return;
      }
      const res = await fetch('/api/keys/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: entries }),
      });
      if (!res.ok) {
        setError('Failed to save keys');
      } else {
        const updated: Record<string, boolean> = { ...keysPresent };
        entries.forEach(e => { updated[e.provider] = true; });
        setKeysPresent(updated);
        setForm({ gemini: '', kimi: '', deepseek: '' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" className="fixed top-4 right-4 z-40" onClick={() => setOpen(o => !o)}>
        {open ? 'Close' : 'Credentials'}
      </Button>
      <div className={`fixed top-0 right-0 h-full w-80 bg-background shadow-lg border-l border-border transform transition-transform z-30 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 space-y-4 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Credentials</h2>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>X</Button>
          </div>
          {status === 'loading' && <p className="text-sm text-muted-foreground">Loading...</p>}
          {status === 'unauthenticated' && (
            <div className="space-y-3">
              <p className="text-sm">Sign in with your Google account to save API keys.</p>
              <Button size="sm" onClick={() => signIn('google')}>
                Sign in with Google
              </Button>
            </div>
          )}
          {status === 'authenticated' && (
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center gap-2">
                <img src={session.user?.image ?? ''} alt="User" className="w-8 h-8 rounded-full" />
                <div>
                  <p className="text-sm font-medium">{session.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-2">Gemini Key {keysPresent['gemini'] && <span className="text-green-600 text-[10px] bg-green-100 px-1 rounded">AUTO</span>}</label>
                <Input placeholder="Save / update" value={form.gemini} onChange={e => setForm(f => ({ ...f, gemini: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-2">Kimi Key {keysPresent['kimi'] && <span className="text-green-600 text-[10px] bg-green-100 px-1 rounded">AUTO</span>}</label>
                <Input placeholder="Save / update" value={form.kimi} onChange={e => setForm(f => ({ ...f, kimi: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-2">DeepSeek Key {keysPresent['deepseek'] && <span className="text-green-600 text-[10px] bg-green-100 px-1 rounded">AUTO</span>}</label>
                <Input placeholder="Save / update" value={form.deepseek} onChange={e => setForm(f => ({ ...f, deepseek: e.target.value }))} />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button size="sm" disabled={saving} onClick={save}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Keys are encrypted (AES-256-GCM) before being saved.</p>
            </div>
          )}
          <div className="mt-auto text-[10px] text-muted-foreground">Credentials Sidebar</div>
        </div>
      </div>
    </>
  );
}
