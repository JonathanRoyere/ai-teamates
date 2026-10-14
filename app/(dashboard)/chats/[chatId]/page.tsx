import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { getChat } from "@/chats/queries"
import { ChatHeader } from "@/components/chat-header"
import { ChatView } from "@/components/chat-view"
import { VncSandboxPreview } from "@/components/vnc-sandbox-preview"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>
  searchParams: Promise<{ desktop?: string }>
}) {
  await auth.protect()
  const { chatId } = await params
  const { desktop } = await searchParams
  const isDesktopOpen = desktop === "true"

  const chat = await getChat(chatId)
  if (!chat) {
    notFound()
  }

  const bot = chat.bot ?? chat.members?.[0]?.bot ?? null
  const hasSandbox = Boolean(bot?.sandboxId)

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
      <ResizablePanel defaultSize={isDesktopOpen ? 60 : 100} minSize={30}>
        <div className="flex flex-1 flex-col h-full overflow-hidden">
          <ChatHeader chat={chat} />
          <ChatView chat={chat} />
        </div>
      </ResizablePanel>
      {isDesktopOpen && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={40} minSize={20}>
            <VncSandboxPreview chatId={chatId} hasSandbox={hasSandbox} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}
