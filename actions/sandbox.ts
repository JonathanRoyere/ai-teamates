"use server"

import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { Daytona } from "@daytona/sdk"
import { getChat } from "@/chats/queries"

function getDaytonaClient() {
  return new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
  })
}

const getVncUrlSchema = z.object({
  chatId: z.string().min(1),
})

export type GetVncUrlInput = z.infer<typeof getVncUrlSchema>

export async function getSandboxVncUrl(input: GetVncUrlInput) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized")
  }

  const { chatId } = getVncUrlSchema.parse(input)
  const chat = await getChat(chatId)
  if (!chat) {
    throw new Error("Chat not found")
  }

  const bot = chat.bot ?? chat.members?.[0]?.bot ?? null
  if (!bot?.sandboxId) {
    return { url: null, error: "No sandbox is configured for this bot." }
  }

  try {
    const daytona = getDaytonaClient()
    const sandbox = await daytona.get(bot.sandboxId)

    if (sandbox.state !== "started") {
      try {
        await sandbox.start()
      } catch (e: any) {
        console.warn(`Starting sandbox ${bot.sandboxId}:`, e?.message)
      }
    }

    try {
      const status = await sandbox.computerUse.getStatus()
      if (status.status !== "running" && status.status !== "active") {
        await sandbox.computerUse.start()
      }
    } catch {
      try {
        await sandbox.computerUse.start()
      } catch (e: any) {
        console.warn("Could not start computerUse:", e?.message)
      }
    }

    // Signed preview URL for noVNC on port 6080, valid for 24h
    const signed = await sandbox.getSignedPreviewUrl(6080, 86400)
    let url = signed.url
    if (!url.endsWith("/")) {
      url += "/"
    }
    url += "vnc.html?autoconnect=true&resize=scale&reconnect=true"

    return { url, error: null }
  } catch (err: any) {
    console.error("Failed to get Daytona VNC URL:", err)
    return {
      url: null,
      error: err?.message || "Failed to load VNC sandbox preview.",
    }
  }
}
