"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { bots, botInsertSchema, type BotInsert, type Bot } from "@/db/schema"

export async function createBot(input: BotInsert): Promise<Bot> {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }

  const validated = botInsertSchema.parse(input)

  const [createdBot] = await db
    .insert(bots)
    .values({
      userId,
      name: validated.name,
      job: validated.job,
      avatar: validated.avatar?.trim() || undefined,
      instructions: validated.instructions?.trim() || null,
    })
    .returning()

  revalidatePath("/")

  return createdBot
}
