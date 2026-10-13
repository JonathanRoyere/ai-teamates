import { chat } from "@trigger.dev/sdk/ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_SECRET,
})

export const chatAgent = chat.agent({
  id: "chat-agent",
  clientDataSchema: z.object({
    instructions: z.string().optional(),
  }),
  run: async ({ messages, signal, streamText, clientData }) =>
    streamText({
      model: openai("gpt-6-luna"),
      system: clientData?.instructions,
      messages,
      abortSignal: signal,
    }),
})
