"use client"

import * as React from "react"
import {
  MonitorIcon,
  Maximize2Icon,
  Minimize2Icon,
  AlertCircleIcon,
  RefreshCwIcon,
  LaptopIcon,
} from "lucide-react"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getSandboxVncUrl } from "@/actions/sandbox"

export interface VncSandboxPreviewProps {
  chatId: string
  hasSandbox: boolean
  initialUrl?: string | null
}

export function VncSandboxPreview({
  chatId,
  hasSandbox,
  initialUrl = null,
}: VncSandboxPreviewProps) {
  const [url, setUrl] = React.useState<string | null>(initialUrl)
  const [isLoading, setIsLoading] = React.useState<boolean>(!initialUrl && hasSandbox)
  const [error, setError] = React.useState<string | null>(
    hasSandbox ? null : "No sandbox is configured for this bot."
  )
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false)

  const fetchVncUrl = React.useCallback(
    async (isManualRefresh = false) => {
      if (!hasSandbox) {
        setError("No sandbox is configured for this bot.")
        setIsLoading(false)
        return
      }

      if (isManualRefresh) {
        setIsRefreshing(true)
      } else if (!url) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const res = await getSandboxVncUrl({ chatId })
        if (res.error) {
          setError(res.error)
        } else if (res.url) {
          setUrl(res.url)
        }
      } catch (err: any) {
        setError(err?.message || "Failed to connect to Daytona sandbox VNC.")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [chatId, hasSandbox, url]
  )

  React.useEffect(() => {
    if (hasSandbox && !url) {
      fetchVncUrl()
    }
  }, [hasSandbox, url, fetchVncUrl])

  // Prevent dialog from being closed by Escape or focusOut or pointer dismissal
  const handleOpenChange = React.useCallback((open: boolean, eventDetails: any) => {
    if (!open) {
      if (
        eventDetails?.reason === "escapeKey" ||
        eventDetails?.reason === "outsidePress" ||
        eventDetails?.reason === "focusOut"
      ) {
        // Prevent dismissal on hotkeys and outside clicks
        return
      }
      setIsFullscreen(false)
    } else {
      setIsFullscreen(true)
    }
  }, [])

  // In fullscreen mode, prevent Escape key events from bubbling to document/dialog dismissal
  React.useEffect(() => {
    if (!isFullscreen) return

    const handleKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
      }
    }

    window.addEventListener("keydown", handleKeyDownCapture, true)
    return () => {
      window.removeEventListener("keydown", handleKeyDownCapture, true)
    }
  }, [isFullscreen])

  return (
    <>
      {/* Base UI Dialog for fullscreen backdrop, focus handling, and accessibility */}
      {isFullscreen && (
        <Dialog
          open={true}
          onOpenChange={handleOpenChange}
          disablePointerDismissal
          modal={false}
        >
          <DialogPortal>
            <DialogOverlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" />
            <span className="sr-only">
              <DialogTitle>Sandbox Desktop</DialogTitle>
              <DialogDescription>
                Interactive Daytona VNC sandbox session
              </DialogDescription>
            </span>
          </DialogPortal>
        </Dialog>
      )}

      {/* Persistent VNC Container: Reused for both preview and fullscreen dialog without unmounting the iframe */}
      <div
        className={cn(
          "bg-background transition-all",
          isFullscreen
            ? "fixed inset-2 sm:inset-4 md:inset-6 z-50 flex flex-col rounded-xl border border-border shadow-2xl ring-1 ring-foreground/10 overflow-hidden"
            : "relative flex flex-col h-full w-full overflow-hidden"
        )}
      >
        {/* Top Header Toolbar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 bg-background">
          <div className="flex items-center gap-2.5 min-w-0">
            <MonitorIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">
              Sandbox Desktop
            </span>

            {/* Status indicator */}
            {isLoading || isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Spinner className="size-3" />
                <span>Connecting...</span>
              </span>
            ) : url ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live</span>
              </span>
            ) : error ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                <span className="size-1.5 rounded-full bg-destructive" />
                <span>Offline</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                <span>Inactive</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {hasSandbox && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Refresh VNC connection"
                disabled={isLoading || isRefreshing}
                onClick={() => fetchVncUrl(true)}
              >
                <RefreshCwIcon
                  className={cn("size-3.5", isRefreshing && "animate-spin")}
                />
                <span className="sr-only">Refresh VNC</span>
              </Button>
            )}

            {url &&
              (isFullscreen ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                  onClick={() => setIsFullscreen(false)}
                >
                  <Minimize2Icon className="size-3.5" />
                  <span>Exit Fullscreen</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Expand to Fullscreen"
                  onClick={() => setIsFullscreen(true)}
                >
                  <Maximize2Icon className="size-3.5" />
                  <span className="sr-only">Fullscreen</span>
                </Button>
              ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 w-full h-full min-h-0 bg-neutral-950 flex items-center justify-center overflow-hidden">
          {!hasSandbox ? (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-sm">
              <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <LaptopIcon className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No sandbox configured
                </p>
                <p className="text-xs text-muted-foreground">
                  This bot does not have an active Daytona sandbox environment.
                </p>
              </div>
            </div>
          ) : isLoading && !url ? (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Spinner className="size-6 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Starting sandbox desktop...
                </p>
                <p className="text-xs text-muted-foreground">
                  Connecting to VNC display stream
                </p>
              </div>
            </div>
          ) : error && !url ? (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-sm">
              <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertCircleIcon className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Failed to load VNC desktop
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fetchVncUrl(false)}
                className="mt-2 text-xs"
              >
                <RefreshCwIcon className="size-3.5 mr-1.5" />
                Try Again
              </Button>
            </div>
          ) : url ? (
            <>
              {/* The persistent VNC iframe */}
              <iframe
                src={url}
                title="Daytona Sandbox Desktop"
                className="w-full h-full border-0 select-none bg-neutral-950"
                allow="clipboard-read; clipboard-write; fullscreen"
              />

              {/* In preview mode only: Clickable overlay to open fullscreen */}
              {!isFullscreen && (
                <button
                  type="button"
                  className="absolute inset-0 z-10 w-full h-full cursor-pointer flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group border-0 p-0 m-0 outline-none"
                  onClick={() => setIsFullscreen(true)}
                  aria-label="Open sandbox desktop in fullscreen"
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 bg-background/90 text-foreground text-xs font-medium px-3.5 py-1.5 rounded-full shadow-lg border border-border/80 flex items-center gap-2 backdrop-blur-md pointer-events-none select-none">
                    <Maximize2Icon className="size-3.5" />
                    <span>Click to control in fullscreen</span>
                  </div>
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  )
}
