
import Link from 'next/link';
import { listChatsAction } from '@/app/actions/saveChat';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  type ChatListItem = { id: number; title: string | null; model: string; createdAt: string | Date };
  let chats: ChatListItem[] = [];
  if (user) {
    try {
      chats = await listChatsAction(user.id);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-primary">Prompt History</h1>
        <Button asChild>
          <Link href="/">Generate New</Link>
        </Button>
      </header>
      <section className="space-y-4">
        {!user && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Sign in to view your prompt history.</p>
          </div>
        )}
        {user && chats.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No chats stored yet.</p>
          </div>
        )}
        {user && chats.length > 0 && (
          <ul className="space-y-4">
            {chats.map((c) => (
              <li key={c.id} className="bg-card border border-border rounded-lg p-4 transition-shadow hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary">{c.title || 'Untitled'}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-2">Model: {c.model}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
