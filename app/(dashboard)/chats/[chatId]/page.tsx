import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { getChat } from "@/chats/queries"
import { ChatHeader } from "@/components/chat-header"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  await auth.protect()
  const { chatId } = await params

  const chat = await getChat(chatId)
  if (!chat) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col">
      <ChatHeader chat={chat} />
      <div className="flex flex-1 flex-col p-4">
        {/* Chat messages will be rendered here */}
      </div>
    </div>
  )
}
