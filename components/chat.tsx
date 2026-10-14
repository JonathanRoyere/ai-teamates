"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { isToolUIPart, getToolName, type UIMessage } from "ai"
import {
  useTriggerChatTransport,
  useLoadTranscript,
} from "@trigger.dev/sdk/chat/react"
import type { chatAgent } from "@/trigger/chat"
import {
  mintChatAccessToken,
  startChatSession,
  loadChatTranscript,
} from "@/actions/chat"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "cn"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
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
import {
  Terminal,
  FileText,
  FileEdit,
  FolderOpen,
  Folder,
  File,
  MousePointer,
  Move,
  ArrowDown,
  ArrowUp,
  Keyboard,
  Command,
  Monitor,
  Check,
  AlertCircle,
  ChevronDown,
  Copy,
  Maximize2,
  Download,
} from "lucide-react"

export interface ChatProps {
  chat: ChatWithMembers
}

export type ChatViewProps = ChatProps

export function Chat({ chat }: ChatProps) {
  const bot = chat.bot ?? chat.members?.[0]?.bot ?? null

  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat-agent",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
    clientData: {
      botName: bot?.name,
      botJob: bot?.job,
      instructions: bot?.instructions || undefined,
      sandboxId: bot?.sandboxId || undefined,
    },
  })

  const { messages: transcriptMessages, isLoading } = useLoadTranscript(
    chat.id,
    loadChatTranscript,
    { transport }
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-full min-h-0 bg-background">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  return (
    <ChatContent
      key={chat.id}
      chat={chat}
      transport={transport}
      initialMessages={transcriptMessages}
    />
  )
}

export const ChatView = Chat

interface ChatContentProps {
  chat: ChatWithMembers
  transport: ReturnType<typeof useTriggerChatTransport<typeof chatAgent>>
  initialMessages: UIMessage[]
}

function ChatContent({ chat, transport, initialMessages }: ChatContentProps) {
  const bot = chat.bot ?? chat.members?.[0]?.bot ?? null
  const botName = bot?.name || chat.name || "Assistant"
  const avatarSeed = bot?.avatar || bot?.name || chat.id

  const { messages, sendMessage, status, stop: aiStop } = useChat({
    id: chat.id,
    transport,
    messages: initialMessages,
    resume: initialMessages.length > 0,
  })

  const stop = React.useCallback(() => {
    aiStop()
    transport.stopGeneration(chat.id)
  }, [aiStop, transport, chat.id])

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
                  ? `${bot.job} is here to help with full computer and sandbox access.`
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
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                      <MessageContent>
                        {message.parts.map((part, index) => {
                          if (part.type === "text") {
                            if (!part.text) return null
                            return (
                              <MessageResponse key={index}>
                                {part.text}
                              </MessageResponse>
                            )
                          }

                          if (isToolUIPart(part)) {
                            return (
                              <ToolCallItem
                                key={part.toolCallId || index}
                                part={part}
                              />
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

function ToolCallItem({ part }: { part: any }) {
  const toolName = getToolName(part)

  // viewScreen: explicitly never rendered in chat
  if (toolName === "viewScreen") {
    return null
  }

  if (toolName === "showScreen") {
    return <ShowScreenToolView part={part} />
  }

  if (toolName === "bash") {
    return <BashToolView part={part} />
  }

  if (toolName === "readFile") {
    return <ReadFileToolView part={part} />
  }

  if (toolName === "writeFile") {
    return <WriteFileToolView part={part} />
  }

  if (toolName === "listFiles") {
    return <ListFilesToolView part={part} />
  }

  if (
    toolName === "mouseClick" ||
    toolName === "mouseMove" ||
    toolName === "mouseScroll"
  ) {
    return <MouseToolView toolName={toolName} part={part} />
  }

  if (toolName === "keyboardType" || toolName === "keyboardPress") {
    return <KeyboardToolView toolName={toolName} part={part} />
  }

  return <GenericToolView toolName={toolName} part={part} />
}

function StatusIndicator({ state, hasError }: { state: string; hasError?: boolean }) {
  if (state === "call" || state === "input-streaming") {
    return (
      <Badge
        variant="outline"
        className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-medium"
      >
        <Spinner className="size-2.5" /> Running
      </Badge>
    )
  }

  if (hasError || state === "output-error" || state === "output-denied") {
    return (
      <Badge
        variant="outline"
        className="gap-1 bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-medium"
      >
        <AlertCircle className="size-2.5" /> Error
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium"
    >
      <Check className="size-2.5" /> Completed
    </Badge>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      className="size-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
    </Button>
  )
}

function ShowScreenToolView({ part }: { part: any }) {
  const state = part.state
  const output = part.output
  const hasError = !!part.errorText || !!output?.error
  const base64 = output?.base64
  const [isZoomOpen, setIsZoomOpen] = React.useState(false)

  const imageSrc = base64
    ? base64.startsWith("data:")
      ? base64
      : `data:image/png;base64,${base64}`
    : null

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!imageSrc) return
    const a = document.createElement("a")
    a.href = imageSrc
    a.download = `sandbox-screen-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="w-full my-2 rounded-xl border bg-card/60 backdrop-blur-xs p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10 text-primary">
            <Monitor className="size-4" />
          </div>
          <span className="text-xs font-semibold tracking-tight text-foreground">
            Desktop Screen
          </span>
          <StatusIndicator state={state} hasError={hasError} />
        </div>
        {imageSrc && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleDownload}
              title="Download Screenshot"
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsZoomOpen(true)}
              title="Expand Screenshot"
            >
              <Maximize2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="pt-3">
        {state === "call" ? (
          <div className="flex flex-col items-center justify-center p-8 gap-2 bg-muted/20 rounded-lg border border-dashed border-border/60">
            <Spinner className="size-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Capturing desktop screen...
            </span>
          </div>
        ) : hasError ? (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{part.errorText || output?.error || "Failed to capture screen"}</span>
          </div>
        ) : imageSrc ? (
          <div className="relative group rounded-lg overflow-hidden border border-border/60 bg-zinc-950">
            <img
              src={imageSrc}
              alt="Sandbox Desktop Screen"
              className="w-full h-auto max-h-[420px] object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
              onClick={() => setIsZoomOpen(true)}
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="px-2.5 py-1 rounded-md bg-background/90 text-foreground text-xs font-medium shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                <Maximize2 className="size-3" /> Click to expand
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-5xl p-2 bg-background border">
          <DialogHeader className="p-2 pb-0">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="size-4 text-primary" /> Sandbox Desktop Screen
            </DialogTitle>
          </DialogHeader>
          <div className="p-2 flex items-center justify-center max-h-[80vh] overflow-auto">
            {imageSrc && (
              <img
                src={imageSrc}
                alt="Sandbox Desktop Screen Full Resolution"
                className="w-full h-auto object-contain rounded-md border"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BashToolView({ part }: { part: any }) {
  const [open, setOpen] = React.useState(true)
  const input = part.input || {}
  const output = part.output
  const hasError = !!part.errorText || !!output?.error || (output?.exitCode !== undefined && output.exitCode !== 0)
  const commandText = input.command || ""
  const outputText = output?.output || output?.error || part.errorText || ""

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full my-2 rounded-lg border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer">
          <div className="p-1 rounded bg-zinc-900 text-zinc-100 dark:bg-zinc-800">
            <Terminal className="size-3.5" />
          </div>
          <span className="text-xs font-semibold font-mono text-foreground truncate max-w-[280px] sm:max-w-md">
            {commandText ? `$ ${commandText}` : "bash"}
          </span>
          <StatusIndicator state={part.state} hasError={hasError} />
        </CollapsibleTrigger>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {commandText && <CopyButton text={commandText} />}
          <CollapsibleTrigger className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer" aria-label="Toggle details">
            <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="p-3 pt-0 border-t border-border/40 font-mono text-xs">
          {input.cwd && (
            <div className="py-1 text-[11px] text-muted-foreground">
              Directory: <code className="text-foreground">{input.cwd}</code>
            </div>
          )}
          {part.state === "call" ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Spinner className="size-3" />
              <span>Running command in sandbox...</span>
            </div>
          ) : (
            <div className="mt-2 rounded bg-zinc-950 p-2.5 text-zinc-100 text-[11px] leading-relaxed max-h-60 overflow-auto whitespace-pre-wrap break-all border border-zinc-800">
              {outputText ? (
                outputText
              ) : (
                <span className="text-zinc-500 italic">(No output)</span>
              )}
            </div>
          )}
          {output?.exitCode !== undefined && (
            <div className="mt-1.5 flex justify-end text-[10px] text-muted-foreground">
              Exit code:{" "}
              <span className={cn("ml-1 font-semibold", output.exitCode === 0 ? "text-emerald-500" : "text-destructive")}>
                {output.exitCode}
              </span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ReadFileToolView({ part }: { part: any }) {
  const [open, setOpen] = React.useState(false)
  const input = part.input || {}
  const output = part.output
  const hasError = !!part.errorText || !!output?.error
  const path = input.path || "file"
  const content = output?.content || ""

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full my-2 rounded-lg border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer">
          <div className="p-1 rounded bg-blue-500/10 text-blue-500">
            <FileText className="size-3.5" />
          </div>
          <span className="text-xs font-medium text-foreground truncate max-w-[280px]">
            Read: <code className="font-mono text-primary font-semibold">{path}</code>
          </span>
          <StatusIndicator state={part.state} hasError={hasError} />
        </CollapsibleTrigger>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {content && <CopyButton text={content} />}
          <CollapsibleTrigger className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer" aria-label="Toggle details">
            <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="p-3 pt-0 border-t border-border/40 font-mono text-xs">
          {part.state === "call" ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Spinner className="size-3" />
              <span>Reading {path}...</span>
            </div>
          ) : hasError ? (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-[11px]">
              {part.errorText || output?.error}
            </div>
          ) : (
            <div className="mt-2 rounded bg-muted/40 p-2.5 text-[11px] leading-relaxed max-h-60 overflow-auto whitespace-pre-wrap break-all border border-border/60">
              {content || <span className="text-muted-foreground italic">(Empty file)</span>}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function WriteFileToolView({ part }: { part: any }) {
  const [open, setOpen] = React.useState(false)
  const input = part.input || {}
  const output = part.output
  const hasError = !!part.errorText || !!output?.error
  const path = input.path || "file"
  const content = input.content || ""

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full my-2 rounded-lg border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
      <div className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer">
          <div className="p-1 rounded bg-amber-500/10 text-amber-500">
            <FileEdit className="size-3.5" />
          </div>
          <span className="text-xs font-medium text-foreground truncate max-w-[280px]">
            Write: <code className="font-mono text-primary font-semibold">{path}</code>
          </span>
          <StatusIndicator state={part.state} hasError={hasError} />
        </CollapsibleTrigger>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {content && <CopyButton text={content} />}
          <CollapsibleTrigger className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer" aria-label="Toggle details">
            <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="p-3 pt-0 border-t border-border/40 font-mono text-xs">
          {part.state === "call" ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Spinner className="size-3" />
              <span>Writing {path}...</span>
            </div>
          ) : hasError ? (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-[11px]">
              {part.errorText || output?.error}
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="text-[10px] text-muted-foreground">
                Successfully wrote {output?.sizeBytes ?? content.length} bytes
              </div>
              <div className="rounded bg-muted/40 p-2.5 text-[11px] leading-relaxed max-h-48 overflow-auto whitespace-pre-wrap break-all border border-border/60">
                {content}
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ListFilesToolView({ part }: { part: any }) {
  const [open, setOpen] = React.useState(false)
  const input = part.input || {}
  const output = part.output
  const hasError = !!part.errorText || !!output?.error
  const targetPath = input.path || "."
  const files: Array<{ name: string; path: string; size?: number; isDir?: boolean }> = output?.files || []

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full my-2 rounded-lg border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
      <CollapsibleTrigger className="w-full flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors text-left cursor-pointer">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-indigo-500/10 text-indigo-500">
            <FolderOpen className="size-3.5" />
          </div>
          <span className="text-xs font-medium text-foreground truncate max-w-[280px]">
            List: <code className="font-mono text-primary font-semibold">{targetPath}</code>
          </span>
          <StatusIndicator state={part.state} hasError={hasError} />
        </div>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 pt-0 border-t border-border/40 text-xs">
          {part.state === "call" ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2 font-mono">
              <Spinner className="size-3" />
              <span>Scanning directory...</span>
            </div>
          ) : hasError ? (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-[11px] font-mono">
              {part.errorText || output?.error}
            </div>
          ) : files.length === 0 ? (
            <div className="py-2 text-muted-foreground italic text-[11px]">Directory is empty</div>
          ) : (
            <div className="mt-2 max-h-48 overflow-auto divide-y divide-border/40 rounded border border-border/50 bg-muted/20">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2.5 hover:bg-muted/40 transition-colors text-[11px]">
                  <div className="flex items-center gap-2 font-mono truncate">
                    {file.isDir ? (
                      <Folder className="size-3.5 text-indigo-500 shrink-0" />
                    ) : (
                      <File className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-foreground truncate">{file.name}</span>
                  </div>
                  {file.size !== undefined && !file.isDir && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                      {formatBytes(file.size)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function MouseToolView({ toolName, part }: { toolName: string; part: any }) {
  const input = part.input || {}
  const state = part.state
  const hasError = !!part.errorText || !!part.output?.error

  let description = ""
  if (toolName === "mouseClick") {
    description = `Click ${input.button || "left"}${input.doubleClick ? " (double)" : ""} at (${input.x}, ${input.y})`
  } else if (toolName === "mouseMove") {
    description = `Move to (${input.x}, ${input.y})`
  } else if (toolName === "mouseScroll") {
    description = `Scroll ${input.direction || "down"} (${input.amount || 3} ticks) at (${input.x}, ${input.y})`
  }

  return (
    <div className="w-full my-1.5 flex items-center justify-between p-2 rounded-lg border bg-card/50 text-xs shadow-xs">
      <div className="flex items-center gap-2">
        <div className="p-1 rounded bg-violet-500/10 text-violet-500">
          {toolName === "mouseScroll" ? (
            input.direction === "up" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
          ) : toolName === "mouseMove" ? (
            <Move className="size-3.5" />
          ) : (
            <MousePointer className="size-3.5" />
          )}
        </div>
        <span className="font-mono text-[11px] text-foreground">{description}</span>
      </div>
      <StatusIndicator state={state} hasError={hasError} />
    </div>
  )
}

function KeyboardToolView({ toolName, part }: { toolName: string; part: any }) {
  const input = part.input || {}
  const state = part.state
  const hasError = !!part.errorText || !!part.output?.error

  return (
    <div className="w-full my-1.5 flex items-center justify-between p-2 rounded-lg border bg-card/50 text-xs shadow-xs">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded bg-cyan-500/10 text-cyan-500">
          {toolName === "keyboardPress" ? <Command className="size-3.5" /> : <Keyboard className="size-3.5" />}
        </div>
        {toolName === "keyboardType" ? (
          <div className="font-mono text-[11px] text-foreground truncate">
            Type: <span className="bg-muted px-1.5 py-0.5 rounded text-primary font-medium">"{input.text}"</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Press:</span>
            <KbdGroup>
              {input.modifiers?.map((mod: string, i: number) => (
                <React.Fragment key={mod}>
                  <Kbd>{mod}</Kbd>
                  <span className="text-muted-foreground text-[10px]">+</span>
                </React.Fragment>
              ))}
              <Kbd>{input.key || "key"}</Kbd>
            </KbdGroup>
          </div>
        )}
      </div>
      <StatusIndicator state={state} hasError={hasError} />
    </div>
  )
}

function GenericToolView({ toolName, part }: { toolName: string; part: any }) {
  const state = part.state
  const hasError = !!part.errorText || !!part.output?.error

  return (
    <div className="w-full my-1.5 flex items-center justify-between p-2 rounded-lg border bg-card/50 text-xs shadow-xs">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded bg-muted text-muted-foreground">
          <Terminal className="size-3.5" />
        </div>
        <span className="font-mono text-[11px] font-semibold text-foreground">{toolName}</span>
      </div>
      <StatusIndicator state={state} hasError={hasError} />
    </div>
  )
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
