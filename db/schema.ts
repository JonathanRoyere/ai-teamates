import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { z } from "zod";

export const bots = pgTable(
  "bots",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar").notNull().$defaultFn(() => nanoid()),
    job: text("job").notNull(),
    instructions: text("instructions"),
    sandboxId: text("sandbox_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("bots_user_id_idx").on(table.userId),
  ]
);

export const chatKindEnum = pgEnum("chat_kind", ["direct", "group"]);

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    userId: text("user_id").notNull(),
    kind: chatKindEnum("kind").default("direct").notNull(),
    name: text("name"),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chats_user_id_idx").on(table.userId),
  ]
);

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    botId: text("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.chatId, table.botId] }),
    index("chat_members_bot_id_idx").on(table.botId),
  ]
);

export const botsRelations = relations(bots, ({ many }) => ({
  memberships: many(chatMembers),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  bot: one(bots, {
    fields: [chatMembers.botId],
    references: [bots.id],
  }),
}));

export const botInsertSchema = createInsertSchema(bots, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Name is required")
      .max(64, "Name must be 64 characters or less"),
  avatar: (schema) => schema.trim().optional(),
  job: (schema) =>
    schema
      .trim()
      .min(1, "Job is required")
      .max(256, "Job must be 256 characters or less"),
  instructions: (schema) =>
    schema
      .trim()
      .max(4000, "Instructions must be 4000 characters or less")
      .optional(),
}).omit({
  id: true,
  userId: true,
  sandboxId: true,
  createdAt: true,
});

export type BotInsert = z.infer<typeof botInsertSchema>;
export type Bot = typeof bots.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type ChatInsert = typeof chats.$inferInsert;
export type ChatMember = typeof chatMembers.$inferSelect;
export type ChatMemberInsert = typeof chatMembers.$inferInsert;

