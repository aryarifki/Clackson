import { pgTable, serial, text, timestamp, varchar, jsonb, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }),
  email: varchar('email', { length: 190 }).notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: varchar('google_id', { length: 190 }),
  auth0Sub: varchar('auth0_sub', { length: 255 }),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  encryptedKey: text('encrypted_key').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: varchar('title', { length: 200 }),
  model: varchar('model', { length: 100 }).notNull(),
  systemStyle: text('system_style'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  chatId: integer('chat_id').notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  meta: jsonb('meta'),
});
