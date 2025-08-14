import Link from 'next/link';
import { listChatsAction } from '@/app/actions/saveChat';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  type ChatListItem = { id: number; title: string | null; model: string; createdAt: string | Date };
  let chats: ChatListItem[] = [];
  if (user) {
  try { chats = await listChatsAction(user.id); } catch {}
  }
  return (
    <main className="container mx-auto py-8 max-w-5xl space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prompt History</h1>
        <Link href="/" className="text-sm underline">Generate New</Link>
      </header>
      <section>
  {!user && <p className="text-sm text-muted-foreground">Sign in to view your prompt history.</p>}
  {user && chats.length === 0 && <p className="text-sm text-muted-foreground">No chats stored yet.</p>}
        <ul className="divide-y border rounded-md bg-white/40 backdrop-blur">
      {chats.map(c => (
            <li key={c.id} className="p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{c.title || 'Untitled'}</span>
        <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">Model: {c.model}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
