import { createOpenAI } from "@ai-sdk/openai"
import { streamText, convertToModelMessages, type UIMessage } from "ai"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_SECRET,
})

export async function POST(req: Request) {
  const { messages, system }: { messages: UIMessage[]; system?: string } =
    await req.json()

  const result = streamText({
    model: openai("gpt-6-luna"),
    system,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
