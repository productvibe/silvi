import { useState } from "react"
import { useRevalidator, useRouteLoaderData } from "react-router"

import type { Route } from "./+types/settings.appearance"
import type { loader as rootLoader } from "~/root"
import { APP_NAME } from "~/lib/app"
import {
  APPEARANCE,
  COLOURS,
  saveAppearance,
  type Appearance,
  type AppearanceKey,
  type Colour,
} from "~/lib/appearance"
import { cn } from "~/lib/utils"
import { Field, FieldLabel } from "~/components/ui/field"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { Label } from "~/components/ui/label"

export const meta: Route.MetaFunction = () => [
  { title: `Appearance — Settings — ${APP_NAME}` },
]

// The reader's own look: the colour the report charts are drawn in, and the
// colour of buttons and checked controls — two separate choices, so Notion's
// blue buttons can sit over grey charts. Kept per viewer in cookies
// (lib/appearance.ts), so they follow the reader to every page and are there
// from the first byte. Applied the moment one is picked; nothing to save.
export default function SettingsAppearance() {
  const root = useRouteLoaderData<typeof rootLoader>("root")
  const [value, setValue] = useState<Appearance>({
    tint: root?.tint ?? APPEARANCE.tint.fallback,
    accent: root?.accent ?? APPEARANCE.accent.fallback,
  })
  // The root loader re-reads the cookies, so the <html> attributes it draws
  // agree with the ones just set and a later navigation keeps them.
  const revalidator = useRevalidator()
  const pick = (key: AppearanceKey, colour: Colour) => {
    setValue((v) => ({ ...v, [key]: colour }))
    saveAppearance(key, colour)
    void revalidator.revalidate()
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6 lg:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Appearance</h1>
      </header>

      <div className="grid max-w-3xl gap-10 sm:grid-cols-2">
        <ColourPicker
          id="tint"
          label="Charts"
          value={value.tint}
          onChange={(c) => pick("tint", c)}
          preview={(c) => (
            // The ramp itself, drawn in this tint whatever the page's.
            <span data-tint={c} className="flex gap-1">
              {(
                [
                  "bg-chart-1",
                  "bg-chart-2",
                  "bg-chart-3",
                  "bg-chart-4",
                  "bg-chart-5",
                ] as const
              ).map((s) => (
                <span key={s} className={cn("size-4 rounded-sm", s)} />
              ))}
            </span>
          )}
        />
        <ColourPicker
          id="accent"
          label="Buttons"
          value={value.accent}
          onChange={(c) => pick("accent", c)}
          preview={(c) => (
            // A button's own fill in this colour, whatever the page's.
            <span
              data-accent={c}
              className="h-5 w-10 rounded-md bg-primary"
            />
          )}
        />
      </div>
    </div>
  )
}

function ColourPicker({
  id,
  label,
  value,
  onChange,
  preview,
}: {
  id: string
  label: string
  value: Colour
  onChange: (c: Colour) => void
  preview: (c: Colour) => React.ReactNode
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as Colour)}
        className="flex flex-col gap-1"
      >
        {COLOURS.map((c) => (
          <Label
            key={c.id}
            htmlFor={`${id}-${c.id}`}
            className="flex h-10 cursor-pointer items-center gap-3 rounded-md px-2 font-normal hover:bg-muted"
          >
            <RadioGroupItem id={`${id}-${c.id}`} value={c.id} />
            <span className="flex-1">{c.label}</span>
            {preview(c.id)}
          </Label>
        ))}
      </RadioGroup>
    </Field>
  )
}
