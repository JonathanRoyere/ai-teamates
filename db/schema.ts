import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const bots = pgTable("bots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions"),
  avatarSeed: text("avatar_seed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const botInsertSchema = createInsertSchema(bots, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Name is required")
      .max(64, "Name must be 64 characters or less"),
  description: (schema) =>
    schema
      .trim()
      .max(256, "Description must be 256 characters or less")
      .optional(),
  instructions: (schema) =>
    schema
      .trim()
      .max(4000, "Instructions must be 4000 characters or less")
      .optional(),
  avatarSeed: (schema) => schema.trim().optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type BotInsert = z.infer<typeof botInsertSchema>;
export type Bot = typeof bots.$inferSelect;

export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const todoInsertSchema = createInsertSchema(todos, {
  title: (schema) =>
    schema
      .trim()
      .min(1, "Title is required")
      .max(256, "Title must be 256 characters or less"),
  completed: (schema) => schema.optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type TodoInsert = z.infer<typeof todoInsertSchema>;
export type Todo = typeof todos.$inferSelect;
