import { chat } from "@trigger.dev/sdk/ai"
import { createOpenAI } from "@ai-sdk/openai"
import { stepCountIs } from "ai"
import { z } from "zod"
import { createTools } from "./tools"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_SECRET,
})

export const chatClientDataSchema = z.object({
  botName: z.string().optional(),
  botJob: z.string().optional(),
  instructions: z.string().nullable().optional(),
  sandboxId: z.string().nullable().optional(),
})

export type ChatClientData = z.infer<typeof chatClientDataSchema>

function buildSystemPrompt(clientData?: ChatClientData): string {
  const name = clientData?.botName?.trim() || "AI Teammate"
  const job = clientData?.botJob?.trim() || "General Assistant"
  const sandboxId = clientData?.sandboxId?.trim()

  const sections: string[] = [
    `You are ${name}, an AI teammate with the role of ${job}.`,
    `### Purpose\nYour purpose is to work alongside the user as a collaborative, proactive teammate. In your role as a ${job}, you assist with technical discussions, brainstorming, planning, code review, problem-solving, and executing tasks directly in your environment.`,
    `### Environment & Capabilities\nYou operate within a dedicated, isolated cloud sandbox environment powered by Daytona.${
      sandboxId ? ` Your sandbox ID is "${sandboxId}".` : ""
    } This environment serves as your private workspace with full computer use capabilities.

You have access to tools that let you interact with your sandbox computer:
- \`bash\`: Run shell commands, scripts, test suites, or install packages.
- \`readFile\`, \`writeFile\`, \`listFiles\`: Inspect, create, and manage files in your workspace.
- \`mouseClick\`, \`mouseMove\`, \`mouseScroll\`: Move and click the mouse on the desktop display.
- \`keyboardType\`, \`keyboardPress\`: Type text and press keyboard shortcuts into open applications.
- \`viewScreen\`: Take a private screenshot to observe the desktop display and inspect GUI state. Use this whenever YOU need to see what is on screen to decide what to click or type. This view is internal to you and is not rendered in the user's chat.
- \`showScreen\`: Take a screenshot of the desktop display and show it to the user in the chat. Use this when the user asks to see what's on the screen, requests a screenshot, or when presenting visual results of your work.

When interacting with applications or the desktop GUI, take care to observe the screen with \`viewScreen\` before interacting, and use \`showScreen\` to share visual results with the user.`,
  ]

  if (clientData?.instructions?.trim()) {
    sections.push(`### Custom Instructions\n${clientData.instructions.trim()}`)
  }

  return sections.join("\n\n")
}

export const chatAgent = chat.agent({
  id: "chat-agent",
  clientDataSchema: chatClientDataSchema,
  tools: ({ clientData }) => createTools(clientData?.sandboxId),
  run: async ({ messages, tools, signal, streamText, clientData }) =>
    streamText({
      model: openai("gpt-6-luna"),
      system: buildSystemPrompt(clientData),
      messages,
      tools,
      abortSignal: signal,
      stopWhen: stepCountIs(15),
    }),
})

