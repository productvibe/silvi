import { ChevronDown } from "lucide-react"

import { buttonVariants } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import { Label } from "~/components/ui/label"
import { Switch } from "~/components/ui/switch"
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { cn } from "~/lib/utils"

// A report's CHART controls, folded into one button.
//
// Three labelled selects in a row cost a full band of vertical space above the
// chart — 100 px of chrome to say "Week · Owners · Total" — and pushed the chart
// itself below the fold on a laptop. This collapses them into a single trigger
// that STATES the current selection, so the row reads as one object ("the chart
// is showing…") and fits on the filter line beside Market and Date range.
//
// They stay distinct from filters in one important way: a filter changes which
// rows the report is built from, a view control only changes how the same rows
// are drawn. That is why this carries its own label ("Chart") rather than being
// dissolved into the filter bar — an earlier version put Split loose among the
// filters and it read as one, which is the defect this shape avoids.
//
// Changes apply immediately, with no Apply button: each is a discrete choice off
// a short list, and there is no half-typed intermediate state to protect (unlike
// the date fields in filter-bar.tsx, which do need committing).

export type ViewControl = {
  /** e.g. "Period" — the label above its select in the popover */
  label: string
  value: string
  options: {
    value: string
    label: string
    /** shorter form for the trigger summary, where three values share 200 px.
     *  The popover always shows the full `label`. */
    short?: string
  }[]
  onChange: (value: string) => void
  /** hidden when false — a measure with nothing to split by, say */
  available?: boolean
  /** A control whose choices are not exclusive — the chart's overlay lines,
   *  where any number can be on at once. Renders a checklist in place of the
   *  select; `value` is then ignored in favour of `values`. */
  multiple?: boolean
  values?: string[]
  onToggle?: (value: string, checked: boolean) => void
  /** What the trigger says when a multi control has nothing picked. */
  emptyLabel?: string
  /** The word after the count when more than two are picked (default
   *  "lines": "3 lines") */
  countNoun?: string
  /** An on/off control: a switch in the popover, `value` "on" or "off". The
   *  summary names it (its "on" option's `short`) only while it is on. */
  toggle?: boolean
}

const labelOf = (c: ViewControl): string | null => {
  if (c.toggle)
    return c.value === "on"
      ? (c.options.find((o) => o.value === "on")?.short ?? c.label)
      : null
  if (c.multiple) {
    const picked = c.options.filter((o) => c.values?.includes(o.value))
    if (!picked.length) return c.emptyLabel ?? "None"
    // Two names already fill the trigger; past that, count them.
    return picked.length > 2
      ? `${picked.length} ${c.countNoun ?? "lines"}`
      : picked.map((o) => o.short ?? o.label).join(" + ")
  }
  const o = c.options.find((x) => x.value === c.value)
  return o?.short ?? o?.label ?? c.value
}

export function ViewControls({
  controls,
  label = "Chart",
  className,
}: {
  controls: ViewControl[]
  /** what the control is, printed muted at the front of the trigger */
  label?: string
  className?: string
}) {
  const shown = controls.filter((c) => c.available !== false)

  return (
    // The label sits INSIDE the trigger, in front of the selection, never
    // above it: a stacked label made the trigger taller than the filter
    // button beside it and the toolbar lost its common line (2026-09-29).
    <div className={cn("flex", className)}>
      <Popover>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            // 224 px: the four controls above a report (Market, Date range,
            // Business unit, Chart) have to fit one row at 1280 px, which is
            // ~816 px of content. Summaries use the options' `short` forms to
            // stay inside it; anything longer truncates rather than wrapping.
            "max-w-80 justify-between gap-2 font-normal"
          )}
        >
          {/* The summary IS the control's value — a trigger reading "Chart" with
              the selection hidden inside would make every change invisible. */}
          <span className="shrink-0 text-muted-foreground">{label}</span>
          <span className="min-w-0 flex-1 truncate text-left">
            {shown
              .map(labelOf)
              .filter((l) => l != null)
              .join(" · ")}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <FieldGroup className="gap-3">
            {shown.map((c) =>
              c.toggle ? (
                <Field key={c.label} orientation="horizontal">
                  <Switch
                    id={`view-${c.label}`}
                    size="sm"
                    checked={c.value === "on"}
                    onCheckedChange={(on) => c.onChange(on ? "on" : "off")}
                  />
                  <FieldLabel htmlFor={`view-${c.label}`} className="font-normal">
                    {c.label}
                  </FieldLabel>
                </Field>
              ) : c.multiple ? (
                <Field key={c.label}>
                  <FieldLabel>{c.label}</FieldLabel>
                  <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                    {c.options.map((o) => (
                      <Label
                        key={o.value}
                        className="flex items-center gap-2 font-normal"
                      >
                        <Checkbox
                          checked={c.values?.includes(o.value) ?? false}
                          onCheckedChange={(checked) =>
                            c.onToggle?.(o.value, checked === true)
                          }
                        />
                        {o.label}
                      </Label>
                    ))}
                  </div>
                </Field>
              ) : (
                <Field key={c.label}>
                  <FieldLabel>{c.label}</FieldLabel>
                  <Select
                    value={c.value}
                    onValueChange={(v) => v && c.onChange(String(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(v: unknown) =>
                          c.options.find((o) => o.value === String(v))?.label ??
                          String(v)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {c.options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )
            )}
          </FieldGroup>
        </PopoverContent>
      </Popover>
    </div>
  )
}
