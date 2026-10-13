"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"

export interface ChatBot {
  id: string
  userId: string
  name: string
  avatar: string
  job: string
  instructions: string | null
  sandboxId: string | null
  createdAt: Date
}

export interface ChatWithMembers {
  id: string
  userId: string
  kind: "direct" | "group"
  name: string | null
  lastMessagePreview: string | null
  lastMessageAt: Date
  createdAt: Date
  bot: ChatBot | null
  members: Array<{
    chatId: string
    botId: string
    joinedAt: Date
    bot: ChatBot
  }>
}

/**
 * Retrieves a chat by its ID scoped to the authenticated Clerk user.
 */
export async function getChat(chatId: string): Promise<ChatWithMembers | null> {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    return null
  }

  const chat = await db.query.chats.findFirst({
    where: (chats, { and, eq }) =>
      and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      members: {
        with: {
          bot: true,
        },
      },
    },
  })

  if (!chat) {
    return null
  }

  return {
    id: chat.id,
    userId: chat.userId,
    kind: chat.kind,
    name: chat.name,
    lastMessagePreview: chat.lastMessagePreview,
    lastMessageAt: chat.lastMessageAt,
    createdAt: chat.createdAt,
    bot: chat.members[0]?.bot ?? null,
    members: chat.members,
  }
}

export const getChatById = getChat
