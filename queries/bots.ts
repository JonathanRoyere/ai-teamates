"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"

export interface UserChatBot {
  id: string
  userId: string
  name: string
  avatar: string
  job: string
  instructions: string | null
  sandboxId: string | null
  createdAt: Date
}

export interface UserChat {
  id: string
  userId: string
  kind: "direct" | "group"
  name: string | null
  lastMessagePreview: string | null
  lastMessageAt: Date
  createdAt: Date
  bot: UserChatBot | null
}

/**
 * Retrieves all chats for the authenticated Clerk user,
 * ordered by most recent message, including the associated bot
 * (falling back to the first bot member).
 */
export async function getUserChats(): Promise<UserChat[]> {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return []
  }

  const userChats = await db.query.chats.findMany({
    where: (chats, { eq }) => eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.lastMessageAt)],
    with: {
      members: {
        with: {
          bot: true,
        },
      },
    },
  })

  return userChats.map((chat) => ({
    id: chat.id,
    userId: chat.userId,
    kind: chat.kind,
    name: chat.name,
    lastMessagePreview: chat.lastMessagePreview,
    lastMessageAt: chat.lastMessageAt,
    createdAt: chat.createdAt,
    bot: chat.members[0]?.bot ?? null,
  }))
}

export const getChats = getUserChats

/**
 * Retrieves all bots created by the authenticated Clerk user.
 */
export async function getUserBots() {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return []
  }

  return db.query.bots.findMany({
    where: (bots, { eq }) => eq(bots.userId, userId),
    orderBy: (bots, { desc }) => [desc(bots.createdAt)],
  })
}

export const getBots = getUserBots
