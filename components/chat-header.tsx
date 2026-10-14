"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MonitorIcon } from "lucide-react"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { ChatAvatar } from "@/components/chat-avatar"
import { BotDialog } from "@/components/bot-dialog"
import type { ChatWithMembers, ChatBot } from "@/chats/queries"

export interface ChatHeaderProps {
  chat: ChatWithMembers
}

export function ChatHeader({ chat }: ChatHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isDesktopOpen = searchParams.get("desktop") === "true"

  const toggleDesktop = React.useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (isDesktopOpen) {
      nextParams.delete("desktop")
    } else {
      nextParams.set("desktop", "true")
    }
    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [isDesktopOpen, pathname, router, searchParams])

  // Ignore group chats for now, simply use the first chat member's information
  const serverBot = chat.bot ?? chat.members?.[0]?.bot ?? null
  const [updatedBot, setUpdatedBot] = React.useState<ChatBot | null>(null)

  const bot =
    updatedBot && updatedBot.id === serverBot?.id ? updatedBot : serverBot

  const displayName = chat.name || bot?.name || "Chat"
  const avatarSeed = bot?.avatar || bot?.name || chat.id

  const handleBotUpdated = React.useCallback(
    (newBot: {
      id: string
      userId: string
      name: string
      avatar: string
      job: string
      instructions: string | null
      sandboxId: string | null
      createdAt: Date
    }) => {
      setUpdatedBot(newBot)
      router.refresh()
    },
    [router]
  )

  const handleBotDeleted = React.useCallback(
    (_botId: string) => {
      router.push("/")
      router.refresh()
    },
    [router]
  )

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 bg-background">
      {bot ? (
        <BotDialog
          bot={bot}
          onUpdated={handleBotUpdated}
          onDeleted={handleBotDeleted}
        >
          <Button
            type="button"
            variant="ghost"
            className="h-8 gap-2 px-2 -ml-2 rounded-lg text-foreground hover:bg-muted font-medium text-sm transition-colors cursor-pointer"
          >
            <ChatAvatar
              seed={avatarSeed}
              className="size-5 rounded-none shrink-0"
            />
            <span className="truncate max-w-[200px] sm:max-w-[320px]">
              {displayName}
            </span>
          </Button>
        </BotDialog>
      ) : (
        <div className="flex items-center gap-2">
          <ChatAvatar
            seed={avatarSeed}
            className="size-5 rounded-none shrink-0"
          />
          <span className="text-sm font-medium text-foreground">
            {displayName}
          </span>
        </div>
      )}

      <Button
        type="button"
        variant={isDesktopOpen ? "secondary" : "ghost"}
        size="icon-sm"
        className={cn(
          "size-8 rounded-lg cursor-pointer transition-colors",
          isDesktopOpen
            ? "text-secondary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        aria-label="Desktop"
        aria-pressed={isDesktopOpen}
        onClick={toggleDesktop}
      >
        <MonitorIcon className="size-4" />
      </Button>
    </header>
  )
}
