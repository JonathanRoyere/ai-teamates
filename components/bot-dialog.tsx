"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { nanoid } from "nanoid"
import { PlusIcon, ShuffleIcon } from "lucide-react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ChatAvatar } from "@/components/ui/avatar"
import { toast } from "@/components/ui/toast"
import { botInsertSchema, type BotInsert, type Bot } from "@/db/schema"
import { createBot } from "@/actions/bots"
import { cn } from "@/lib/utils"

export interface BotPreset {
  label: string
  name: string
  job: string
  instructions: string
}

export const BOT_PRESETS: readonly BotPreset[] = [
  {
    label: "Research assistant",
    name: "Ada",
    job: "Research assistant",
    instructions:
      "Answer briefly, cite sources, and ask before running anything destructive.",
  },
  {
    label: "Code reviewer",
    name: "Linus",
    job: "Code reviewer",
    instructions:
      "Review code for clarity, security, and edge cases. Suggest improvements.",
  },
  {
    label: "Writing editor",
    name: "Hemingway",
    job: "Writing editor",
    instructions:
      "Proofread and polish prose for tone, clarity, and conciseness.",
  },
  {
    label: "Tutor",
    name: "Socrates",
    job: "Tutor",
    instructions:
      "Break down complex topics step-by-step with analogies and examples.",
  },
] as const

interface BotFormProps {
  onCreated: (bot: Bot) => void
}

function BotForm({ onCreated }: BotFormProps) {
  const [avatarSeed, setAvatarSeed] = React.useState(() => nanoid())
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(
    "Research assistant"
  )

  const activePreset =
    BOT_PRESETS.find((p) => p.label === selectedPreset) ?? BOT_PRESETS[0]

  const form = useForm<BotInsert>({
    resolver: zodResolver(botInsertSchema),
    defaultValues: {
      name: "",
      job: "",
      instructions: "",
      avatar: avatarSeed,
    },
  })

  const handleSelectPreset = (preset: BotPreset) => {
    setSelectedPreset(preset.label)
    form.setValue("job", preset.job, {
      shouldDirty: true,
      shouldValidate: true,
    })
    form.setValue("instructions", preset.instructions, {
      shouldDirty: true,
      shouldValidate: true,
    })
    const currentName = form.getValues("name")
    if (!currentName || BOT_PRESETS.some((p) => p.name === currentName)) {
      form.setValue("name", preset.name, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  const handleShuffle = () => {
    const nextSeed = nanoid()
    setAvatarSeed(nextSeed)
    form.setValue("avatar", nextSeed, { shouldDirty: true })
  }

  const onSubmit = async (values: BotInsert) => {
    try {
      const createdBot = await createBot(values)
      toast.add({
        title: "Bot created",
        description: `${createdBot.name} is ready.`,
        type: "success",
      })
      onCreated(createdBot)
    } catch (error) {
      toast.add({
        title: "Failed to create bot",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        type: "error",
      })
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Presets Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {BOT_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.label
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={cn(
                "h-7 rounded-full px-3 text-xs font-medium transition-colors border select-none cursor-pointer",
                isSelected
                  ? "border-foreground/30 bg-muted text-foreground shadow-xs"
                  : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Face Row */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-3">
          <ChatAvatar
            seed={avatarSeed}
            animated
            className="size-11 rounded-none shrink-0"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium leading-none text-foreground">
              Face
            </span>
            <span className="text-xs text-muted-foreground">
              Shuffle until you find one you like.
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          className="h-8 rounded-lg px-2.5 text-xs font-medium"
        >
          <ShuffleIcon data-icon="inline-start" />
          Shuffle
        </Button>
      </div>

      {/* Fields */}
      <FieldGroup className="gap-3.5">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-name">Name</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="bot-name"
                placeholder={activePreset?.name ?? "Ada"}
                aria-invalid={fieldState.invalid}
                className="h-9 rounded-lg bg-muted/40"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="job"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-job">Job</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="bot-job"
                placeholder={activePreset?.job ?? "Research assistant"}
                aria-invalid={fieldState.invalid}
                className="h-9 rounded-lg bg-muted/40"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="instructions"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-instructions">
                How it should work
              </FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id="bot-instructions"
                placeholder={
                  activePreset?.instructions ??
                  "Answer briefly, cite sources, and ask before running anything destructive."
                }
                aria-invalid={fieldState.invalid}
                rows={3}
                className="min-h-[80px] resize-none rounded-lg bg-muted/40 leading-relaxed"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      {/* Dialog Footer inside the form */}
      <DialogFooter className="mt-2">
        <DialogClose
          render={
            <Button type="button" variant="ghost" className="rounded-lg">
              Cancel
            </Button>
          }
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="rounded-lg font-medium"
        >
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Create bot
        </Button>
      </DialogFooter>
    </form>
  )
}

export interface BotDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: (bot: Bot) => void
}

export function BotDialog({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCreated,
}: BotDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      controlledOnOpenChange?.(nextOpen)
    },
    [isControlled, controlledOnOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ? (
            (children as React.ReactElement)
          ) : (
            <Button
              variant="secondary"
              size="lg"
              className="h-10 rounded-lg px-4 font-medium"
            >
              <PlusIcon data-icon="inline-start" />
              Create a new bot
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[480px] p-5 gap-4">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
            New bot
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Give it a face, a name, and a job to do.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <BotForm
            onCreated={(bot) => {
              setOpen(false)
              onCreated?.(bot)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
