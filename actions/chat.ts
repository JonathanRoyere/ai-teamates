"use server"

import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"
import { getChat } from "@/chats/queries"
import type { chatAgent } from "@/trigger/chat"

const startSessionAction =
  chat.createStartSessionAction<typeof chatAgent>("chat-agent")
const loadTranscriptAction = chat.createLoadTranscriptAction(defaultStorage)

export async function startChatSession(
  params: ChatStartSessionParams<typeof chatAgent>
) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }

  const existingChat = await getChat(params.chatId)
  if (!existingChat) {
    throw new Error("Chat not found")
  }

  const bot = existingChat.bot ?? existingChat.members?.[0]?.bot ?? null

  return startSessionAction({
    ...params,
    clientData: {
      botName: params.clientData?.botName || bot?.name || undefined,
      botJob: params.clientData?.botJob || bot?.job || undefined,
      instructions:
        params.clientData?.instructions ?? bot?.instructions ?? undefined,
      sandboxId: params.clientData?.sandboxId ?? bot?.sandboxId ?? undefined,
    },
  })
}

export async function mintChatAccessToken(chatId: string) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }

  const existingChat = await getChat(chatId)
  if (!existingChat) {
    throw new Error("Chat not found")
  }

  return triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  })
}

export async function loadChatTranscript(params: {
  chatId: string
  limit?: number
  before?: string
}) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }

  const existingChat = await getChat(params.chatId)
  if (!existingChat) {
    throw new Error("Chat not found")
  }

  return loadTranscriptAction(params)
}
