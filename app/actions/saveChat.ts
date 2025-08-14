"use server";
import { getDb } from '@/lib/db/client';
import { chats, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface SaveChatInput { userId: number; model: string; systemStyle?: string; messages: Array<{ role: string; content: string; meta?: Record<string, unknown> }>; title?: string; }

export async function saveChatAction(input: SaveChatInput) {
  const db = getDb();
  const [chat] = await db.insert(chats).values({ userId: input.userId, model: input.model, systemStyle: input.systemStyle, title: input.title }).returning();
  if (input.messages?.length) {
    await db.insert(messages).values(input.messages.map(m => ({ chatId: chat.id, role: m.role, content: m.content, meta: m.meta })));
  }
  return chat;
}

export async function listChatsAction(userId: number) {
  const db = getDb();
  return db.select().from(chats).where(eq(chats.userId, userId)).orderBy(chats.createdAt);
}

export async function getChatMessagesAction(chatId: number) {
  const db = getDb();
  return db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(messages.createdAt);
}
