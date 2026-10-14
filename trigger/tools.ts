import { tool } from "ai"
import { z } from "zod"
import { Daytona, type Sandbox } from "@daytona/sdk"

function getDaytonaClient() {
  return new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api",
  })
}

const activeSandboxes = new Map<string, Sandbox>()

async function getActiveSandbox(sandboxId?: string | null): Promise<Sandbox> {
  if (!sandboxId) {
    throw new Error("No sandbox ID is configured for this bot.")
  }

  let sandbox = activeSandboxes.get(sandboxId)
  if (!sandbox) {
    const daytona = getDaytonaClient()
    sandbox = await daytona.get(sandboxId)
    activeSandboxes.set(sandboxId, sandbox)
  }

  if (sandbox.state !== "started") {
    try {
      await sandbox.start()
    } catch (e: any) {
      console.warn(`Notice while starting sandbox ${sandboxId}:`, e?.message)
    }
  }

  return sandbox
}

async function ensureComputerUse(sandbox: Sandbox): Promise<void> {
  try {
    const status = await sandbox.computerUse.getStatus()
    if (status.status !== "running") {
      await sandbox.computerUse.start()
    }
  } catch {
    try {
      await sandbox.computerUse.start()
    } catch (e: any) {
      console.warn("Could not start computerUse processes:", e?.message)
    }
  }
}

export function createTools(sandboxId?: string | null) {
  return {
    bash: tool({
      description:
        "Execute a bash shell command in the sandbox environment. Returns exit code and standard output/error.",
      inputSchema: z.object({
        command: z.string().describe("The bash command to run"),
        cwd: z
          .string()
          .optional()
          .describe("Optional working directory in the sandbox"),
      }),
      execute: async ({ command, cwd }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          const response = await sandbox.process.executeCommand(command, cwd)
          return {
            command,
            exitCode: response.exitCode,
            output: response.result,
          }
        } catch (error: any) {
          return {
            command,
            exitCode: -1,
            output: "",
            error: error?.message || "Failed to execute command",
          }
        }
      },
    }),

    readFile: tool({
      description:
        "Read the full text content of a file from the sandbox filesystem.",
      inputSchema: z.object({
        path: z.string().describe("Path to the file in the sandbox"),
      }),
      execute: async ({ path }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          const buffer = await sandbox.fs.downloadFile(path)
          return {
            path,
            content: buffer.toString("utf-8"),
          }
        } catch (error: any) {
          return {
            path,
            error: error?.message || `Failed to read file: ${path}`,
          }
        }
      },
    }),

    writeFile: tool({
      description:
        "Write text content to a file in the sandbox filesystem. Creates or overwrites the file.",
      inputSchema: z.object({
        path: z.string().describe("Path to the file to write"),
        content: z.string().describe("The text content to write"),
      }),
      execute: async ({ path, content }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          await sandbox.fs.uploadFile(Buffer.from(content, "utf-8"), path)
          return {
            success: true,
            path,
            sizeBytes: Buffer.byteLength(content, "utf-8"),
          }
        } catch (error: any) {
          return {
            success: false,
            path,
            error: error?.message || `Failed to write file: ${path}`,
          }
        }
      },
    }),

    listFiles: tool({
      description:
        "List files and directories at a given path in the sandbox filesystem.",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .default(".")
          .describe("Directory path to list (defaults to '.')"),
        depth: z
          .number()
          .optional()
          .default(1)
          .describe("Traversal depth (default: 1)"),
      }),
      execute: async ({ path, depth }) => {
        try {
          const targetPath = path || "."
          const sandbox = await getActiveSandbox(sandboxId)
          const items = await sandbox.fs.listFiles(targetPath, {
            depth: depth || 1,
          })
          return {
            path: targetPath,
            files: items.map((f) => ({
              name: f.name,
              path: f.path,
              size: f.size,
              isDir: f.isDir,
            })),
          }
        } catch (error: any) {
          return {
            path: path || ".",
            files: [],
            error: error?.message || "Failed to list files",
          }
        }
      },
    }),

    mouseClick: tool({
      description:
        "Click the mouse at specified (x, y) coordinates on the desktop display.",
      inputSchema: z.object({
        x: z.number().describe("X coordinate (pixels)"),
        y: z.number().describe("Y coordinate (pixels)"),
        button: z
          .enum(["left", "right", "middle"])
          .optional()
          .default("left")
          .describe("Mouse button (left, right, or middle)"),
        doubleClick: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to double-click"),
      }),
      execute: async ({ x, y, button, doubleClick }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          await ensureComputerUse(sandbox)
          await sandbox.computerUse.mouse.click(
            x,
            y,
            button || "left",
            doubleClick || false
          )
          return {
            success: true,
            x,
            y,
            button: button || "left",
            doubleClick: !!doubleClick,
          }
        } catch (error: any) {
          return {
            success: false,
            x,
            y,
            error: error?.message || "Failed to click mouse",
          }
        }
      },
    }),

    mouseMove: tool({
      description:
        "Move the mouse cursor to specified (x, y) coordinates on the desktop display.",
      inputSchema: z.object({
        x: z.number().describe("Target X coordinate (pixels)"),
        y: z.number().describe("Target Y coordinate (pixels)"),
      }),
      execute: async ({ x, y }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          await ensureComputerUse(sandbox)
          const pos = await sandbox.computerUse.mouse.move(x, y)
          return {
            success: true,
            x: pos.x,
            y: pos.y,
          }
        } catch (error: any) {
          return {
            success: false,
            x,
            y,
            error: error?.message || "Failed to move mouse",
          }
        }
      },
    }),

    mouseScroll: tool({
      description:
        "Scroll the mouse wheel at specified (x, y) coordinates on the desktop display.",
      inputSchema: z.object({
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
        direction: z
          .enum(["up", "down"])
          .describe("Scroll direction ('up' or 'down')"),
        amount: z
          .number()
          .optional()
          .default(3)
          .describe("Number of wheel ticks (default 3)"),
      }),
      execute: async ({ x, y, direction, amount }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          await ensureComputerUse(sandbox)
          await sandbox.computerUse.mouse.scroll(
            x,
            y,
            direction,
            amount || 3
          )
          return {
            success: true,
            x,
            y,
            direction,
            amount: amount || 3,
          }
        } catch (error: any) {
          return {
            success: false,
            error: error?.message || "Failed to scroll mouse",
          }
        }
      },
    }),

    keyboardType: tool({
      description:
        "Type text into the focused application on the sandbox desktop display.",
      inputSchema: z.object({
        text: z.string().describe("The string of text to type"),
        delayMs: z
          .number()
          .optional()
          .describe("Optional delay between keystrokes in ms"),
      }),
      execute: async ({ text, delayMs }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          await ensureComputerUse(sandbox)
          await sandbox.computerUse.keyboard.type(text, delayMs)
          return {
            success: true,
            text,
            length: text.length,
          }
        } catch (error: any) {
          return {
            success: false,
            text,
            error: error?.message || "Failed to type text",
          }
        }
      },
    }),

    keyboardPress: tool({
      description:
        "Press a key or key combination with modifiers on the sandbox desktop.",
      inputSchema: z.object({
        key: z
          .string()
          .describe(
            "Key name (e.g. enter, escape, tab, backspace, space, a-z, f1-f12)"
          ),
        modifiers: z
          .array(z.enum(["ctrl", "alt", "shift", "cmd"]))
          .optional()
          .describe("Optional modifier keys to hold (ctrl, alt, shift, cmd)"),
      }),
      execute: async ({ key, modifiers }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          await ensureComputerUse(sandbox)
          await sandbox.computerUse.keyboard.press(key, modifiers)
          return {
            success: true,
            key,
            modifiers: modifiers || [],
          }
        } catch (error: any) {
          return {
            success: false,
            key,
            error: error?.message || "Failed to press key",
          }
        }
      },
    }),

    viewScreen: tool({
      description:
        "Capture the sandbox desktop screen for the agent to inspect. Use this when YOU need to look at what's currently on the screen before deciding on your next action. This view is for your eyes only and is never rendered in the user's chat.",
      inputSchema: z.object({
        showCursor: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to show the cursor on the screenshot"),
      }),
      execute: async ({ showCursor }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          await ensureComputerUse(sandbox)
          const res = await sandbox.computerUse.screenshot.takeFullScreen(
            showCursor ?? true
          )
          return {
            base64: res.screenshot || "",
            sizeBytes: res.sizeBytes || 0,
          }
        } catch (error: any) {
          return {
            base64: "",
            sizeBytes: 0,
            error: error?.message || "Failed to take screen view",
          }
        }
      },
      toModelOutput: ({ output }) => {
        if (output?.base64) {
          return {
            type: "content" as const,
            value: [
              {
                type: "file" as const,
                mediaType: "image/png",
                data: {
                  type: "data" as const,
                  data: output.base64,
                },
              },
            ],
          }
        }
        return {
          type: "text" as const,
          value: output?.error || "Unable to capture screen.",
        }
      },
    }),

    showScreen: tool({
      description:
        "Capture the sandbox desktop screen and display it directly to the user in the chat interface. Use this when the user asks what is on the screen or to see the current desktop state.",
      inputSchema: z.object({
        showCursor: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to show the cursor on the screenshot"),
      }),
      execute: async ({ showCursor }) => {
        try {
          const sandbox = await getActiveSandbox(sandboxId)
          await ensureComputerUse(sandbox)
          const res = await sandbox.computerUse.screenshot.takeFullScreen(
            showCursor ?? true
          )
          return {
            base64: res.screenshot || "",
            sizeBytes: res.sizeBytes || 0,
          }
        } catch (error: any) {
          return {
            base64: "",
            sizeBytes: 0,
            error: error?.message || "Failed to show screen",
          }
        }
      },
      toModelOutput: ({ output }) => {
        if (output?.base64) {
          return {
            type: "content" as const,
            value: [
              {
                type: "text" as const,
                text: "The current screen has been captured and rendered for the user in the chat.",
              },
              {
                type: "file" as const,
                mediaType: "image/png",
                data: {
                  type: "data" as const,
                  data: output.base64,
                },
              },
            ],
          }
        }
        return {
          type: "text" as const,
          value: output?.error || "Unable to capture screen for chat.",
        }
      },
    }),
  }
}

export type AgentTools = ReturnType<typeof createTools>
