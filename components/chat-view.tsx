"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { ChatAvatar } from "@/components/chat-avatar"
import type { ChatWithMembers } from "@/chats/queries"

export interface ChatViewProps {
  chat: ChatWithMembers
}

export function ChatView({ chat }: ChatViewProps) {
  const bot = chat.bot ?? chat.members?.[0]?.bot ?? null
  const botName = bot?.name || chat.name || "Assistant"
  const avatarSeed = bot?.avatar || bot?.name || chat.id

  const transport = React.useMemo(() => {
    return new DefaultChatTransport({
      api: "/api/chat",
      body: {
        system: bot?.instructions || undefined,
      },
    })
  }, [bot?.instructions])

  const { messages, sendMessage, status, stop } = useChat({
    id: chat.id,
    transport,
  })

  const [input, setInput] = React.useState("")

  const handleSubmit = (
    message: { text: string },
    e?: React.FormEvent<HTMLFormElement>
  ) => {
    e?.preventDefault()
    const textToSend = message.text || input.trim()
    if (!textToSend || status === "submitted" || status === "streaming") return

    sendMessage({ text: textToSend })
    setInput("")
  }

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden bg-background">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-3xl w-full flex flex-col gap-6 p-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={`Chat with ${botName}`}
              description={
                bot?.job
                  ? `${bot.job} is here to help.`
                  : "Send a message to start the conversation."
              }
              icon={
                <ChatAvatar
                  seed={avatarSeed}
                  className="size-12 rounded-none mb-2"
                />
              }
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                {message.role === "assistant" ? (
                  <div className="flex items-start gap-3 w-full">
                    <ChatAvatar
                      seed={avatarSeed}
                      className="size-7 rounded-none shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <MessageContent>
                        {message.parts.map((part, index) => {
                          if (part.type === "text") {
                            return (
                              <MessageResponse key={index}>
                                {part.text}
                              </MessageResponse>
                            )
                          }
                          return null
                        })}
                      </MessageContent>
                    </div>
                  </div>
                ) : (
                  <MessageContent>
                    {message.parts.map((part, index) => {
                      if (part.type === "text") {
                        return (
                          <span key={index} className="whitespace-pre-wrap">
                            {part.text}
                          </span>
                        )
                      }
                      return null
                    })}
                  </MessageContent>
                )}
              </Message>
            ))
          )}
        </ConversationContent>
      </Conversation>

      <div className="p-4 mx-auto max-w-3xl w-full shrink-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${botName}...`}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div />
            <PromptInputSubmit
              status={status}
              onStop={stop}
              disabled={!input.trim() && status !== "streaming"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
