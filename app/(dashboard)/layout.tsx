import { cookies } from "next/headers"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getUserChats } from "@/queries/bots"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"
  const chats = await getUserChats()

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh max-h-svh overflow-hidden">
      <AppSidebar chats={chats} />
      <SidebarInset className="h-svh max-h-svh overflow-hidden flex flex-col min-h-0">
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
