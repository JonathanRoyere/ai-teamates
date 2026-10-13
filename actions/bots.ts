"use server"

import { auth } from "@clerk/nextjs/server"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  bots,
  chats,
  chatMembers,
  botInsertSchema,
  type BotInsert,
  type Bot,
} from "@/db/schema"

export async function updateBot(
  id: string,
  input: BotInsert
): Promise<Bot> {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }

  const validated = botInsertSchema.parse(input)

  const [updatedBot] = await db
    .update(bots)
    .set({
      name: validated.name,
      job: validated.job,
      avatar: validated.avatar?.trim() || undefined,
      instructions: validated.instructions?.trim() || null,
    })
    .where(and(eq(bots.id, id), eq(bots.userId, userId)))
    .returning()

  if (!updatedBot) {
    throw new Error("Bot not found")
  }

  revalidatePath("/", "layout")
  revalidatePath("/")

  return updatedBot
}

export async function createBot(
  input: BotInsert
): Promise<Bot & { chatId: string }> {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }

  const validated = botInsertSchema.parse(input)

  const botId = nanoid()
  const chatId = nanoid()

  const [[createdBot], [createdChat]] = await db.batch([
    db
      .insert(bots)
      .values({
        id: botId,
        userId,
        name: validated.name,
        job: validated.job,
        avatar: validated.avatar?.trim() || undefined,
        instructions: validated.instructions?.trim() || null,
      })
      .returning(),
    db
      .insert(chats)
      .values({
        id: chatId,
        userId,
        kind: "direct",
      })
      .returning(),
    db
      .insert(chatMembers)
      .values({
        chatId,
        botId,
      })
      .returning(),
  ])

  revalidatePath("/")

  return {
    ...createdBot,
    chatId: createdChat.id,
  }
}
