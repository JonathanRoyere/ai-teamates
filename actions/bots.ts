"use server"

import { auth } from "@clerk/nextjs/server"
import { nanoid } from "nanoid"
import { revalidatePath } from "next/cache"
import { and, eq, inArray } from "drizzle-orm"
import { Daytona } from "@daytona/sdk"
import { db } from "@/db"
import {
  bots,
  chats,
  chatMembers,
  botInsertSchema,
  type BotInsert,
  type Bot,
} from "@/db/schema"

function getDaytonaClient() {
  return new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
  })
}

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

  const daytona = getDaytonaClient()
  const sandbox = await daytona.create()
  const sandboxId = sandbox.id

  const botId = nanoid()
  const chatId = nanoid()

  try {
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
          sandboxId,
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
  } catch (error) {
    try {
      await daytona.delete(sandbox)
    } catch (cleanupError) {
      console.error(
        "Failed to delete sandbox after bot creation failure:",
        cleanupError
      )
    }
    throw error
  }
}

export async function deleteBot(id: string): Promise<{ id: string }> {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }

  const bot = await db.query.bots.findFirst({
    where: and(eq(bots.id, id), eq(bots.userId, userId)),
  })
  if (!bot) {
    throw new Error("Bot not found")
  }

  if (bot.sandboxId) {
    try {
      const daytona = getDaytonaClient()
      const sandbox = await daytona.get(bot.sandboxId)
      await daytona.delete(sandbox)
    } catch (error) {
      console.error(`Failed to delete Daytona sandbox ${bot.sandboxId}:`, error)
    }
  }

  // Find all direct chats that include this bot for this user
  const directMemberships = await db.query.chatMembers.findMany({
    where: eq(chatMembers.botId, id),
    with: {
      chat: true,
    },
  })

  const directChatIdsToDelete = directMemberships
    .filter((m) => m.chat?.userId === userId && m.chat?.kind === "direct")
    .map((m) => m.chatId)

  if (directChatIdsToDelete.length > 0) {
    await db
      .delete(chats)
      .where(
        and(
          inArray(chats.id, directChatIdsToDelete),
          eq(chats.userId, userId)
        )
      )
  }

  await db
    .delete(bots)
    .where(and(eq(bots.id, id), eq(bots.userId, userId)))

  revalidatePath("/", "layout")
  revalidatePath("/")

  return { id }
}
