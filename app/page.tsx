import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { PlusIcon } from "lucide-react"

export default async function Page() {
  await auth.protect()

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <UserButton />
      </div>
      <Empty className="max-w-md border-0 p-0 gap-4">
        <EmptyMedia>
          <ChatAvatar seed="first-bot" animated className="size-12" />
        </EmptyMedia>
        <EmptyHeader className="max-w-md gap-2">
          <EmptyTitle className="text-xl font-semibold tracking-tight text-foreground">
            Meet your first bot
          </EmptyTitle>
          <EmptyDescription className="text-sm text-muted-foreground sm:text-base">
            Every bot gets its own personality, memory, and face. Spin one up and
            start the conversation.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="mt-2">
          <BotDialog>
            <Button
              variant="secondary"
              size="lg"
              className="h-10 rounded-lg px-4 font-medium"
            >
              <PlusIcon data-icon="inline-start" />
              Create a new bot
            </Button>
          </BotDialog>
        </EmptyContent>
      </Empty>
    </div>
  )
}


