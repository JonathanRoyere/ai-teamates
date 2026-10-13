"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Kbd } from "@/components/ui/kbd"
import { UserButton } from "@clerk/nextjs"
import { getUserChats, type UserChat } from "@/queries/bots"

function formatChatDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  try {
    const d = typeof date === "string" ? new Date(date) : date
    return formatDistanceToNowStrict(d)
  } catch {
    return ""
  }
}

export interface AppSidebarProps
  extends React.ComponentProps<typeof Sidebar> {
  chats?: UserChat[]
}

export function AppSidebar({ chats: initialChats, ...props }: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [botDialogOpen, setBotDialogOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [clientChats, setClientChats] = React.useState<UserChat[] | null>(null)

  React.useEffect(() => {
    if (initialChats === undefined) {
      getUserChats().then(setClientChats)
    }
  }, [initialChats])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const chats = clientChats ?? initialChats ?? []

  const handleBotCreated = React.useCallback(() => {
    getUserChats().then(setClientChats)
  }, [])

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="gap-2 p-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:items-center">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:w-full">
            <SidebarTrigger className="size-8 rounded-lg text-sidebar-foreground hover:bg-muted" />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 rounded-lg bg-muted/40 text-sidebar-foreground hover:bg-muted group-data-[collapsible=icon]:bg-transparent"
                  >
                    <PlusIcon />
                    <span className="sr-only">Add</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
                    <PlusIcon />
                    <span>Create new bot</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <UsersIcon />
                    <span>Create group chat</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setSearchOpen(true)}
            className="h-8 w-full min-w-0 justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm font-normal text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:bg-input/30 dark:hover:bg-muted/50 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-foreground"
          >
            <div className="flex items-center gap-2 min-w-0 group-data-[collapsible=icon]:justify-center">
              <SearchIcon className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:text-sidebar-foreground" />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                Search
              </span>
            </div>
            <Kbd className="group-data-[collapsible=icon]:hidden">⌘K</Kbd>
          </Button>

          <BotDialog
            open={botDialogOpen}
            onOpenChange={setBotDialogOpen}
            onCreated={handleBotCreated}
          />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="p-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:items-center">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:items-center">
                {chats.map((chat) => {
                  const chatName = chat.name || chat.bot?.name || "Chat"
                  const avatarSeed =
                    chat.bot?.avatar || chat.bot?.name || chat.id

                  return (
                    <SidebarMenuItem
                      key={chat.id}
                      className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
                    >
                      <SidebarMenuButton
                        size="lg"
                        isActive={pathname === `/chats/${chat.id}`}
                        className="h-auto py-2 px-2 gap-3 rounded-lg group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:h-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
                        tooltip={chatName}
                        render={<Link href={`/chats/${chat.id}`} />}
                      >
                        <ChatAvatar
                          seed={avatarSeed}
                          className="size-7 rounded-full shrink-0 group-data-[collapsible=icon]:size-6"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-sidebar-foreground">
                              {chatName}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatChatDate(chat.lastMessageAt)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {chat.lastMessagePreview || "No messages yet"}
                          </p>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:items-center">
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
              <SidebarMenuButton
                size="lg"
                className="p-0 overflow-visible hover:bg-transparent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center"
                render={<div />}
              >
                <UserButton
                  showName
                  appearance={{
                    elements: {
                      rootBox: "w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center",
                      userButtonTrigger:
                        "w-full flex items-center gap-2 p-2 rounded-md text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring outline-hidden transition-[width,height,padding] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center",
                      userButtonBox:
                        "flex items-center gap-2 w-full text-left group-data-[collapsible=icon]:justify-center",
                      userButtonOuterIdentifier:
                        "text-sm font-medium text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden",
                      userButtonAvatarBox: "size-8 shrink-0",
                      avatarBox: "size-8 shrink-0",
                    },
                  }}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="Search chats"
      description="Search your chats"
    >
      <Command>
        <CommandInput placeholder="Search chats..." />
        <CommandList>
          <CommandEmpty>No chats found.</CommandEmpty>
          <CommandGroup heading="Chats">
            {chats.map((chat) => {
              const chatName = chat.name || chat.bot?.name || "Chat"
              const avatarSeed =
                chat.bot?.avatar || chat.bot?.name || chat.id

              return (
                <CommandItem
                  key={chat.id}
                  value={`${chatName} ${chat.lastMessagePreview ?? ""}`}
                  onSelect={() => {
                    setSearchOpen(false)
                    router.push(`/chats/${chat.id}`)
                  }}
                  className="flex items-center gap-3 py-2 px-2.5 rounded-lg"
                >
                  <ChatAvatar
                    seed={avatarSeed}
                    className="size-7 rounded-full shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {chatName}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatChatDate(chat.lastMessageAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {chat.lastMessagePreview || "No messages yet"}
                    </p>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  </>
  )
}
