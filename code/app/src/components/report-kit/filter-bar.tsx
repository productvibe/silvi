import { useState, type ReactNode } from "react"
import { useSearchParams } from "react-router"
import {
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  endOfISOWeek,
  startOfISOWeek,
  startOfMonth,
  startOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
} from "date-fns"
import { CalendarIcon, SlidersHorizontal } from "lucide-react"

import { Button, buttonVariants } from "~/components/ui/button"
import { Calendar } from "~/components/ui/calendar"
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import type { ReportFilters } from "~/lib/filters"
import { cn } from "~/lib/utils"

/** Shown in the preset select when the range matches no preset. */
const CUSTOM = "Custom"

const iso = (d: Date) => format(d, "yyyy-MM-dd")
const pretty = (s: string) => format(parseISO(s), "MMM d, yyyy")

// Preset ranges, computed relative to "today". A `null` between entries draws a
// hairline separator in the picker, which is what keeps twelve presets scannable
// as four groups (rolling days, rolling months, whole periods, to-date).
type Preset = { label: string; from: string; to: string }

function presets(today: Date): (Preset | null)[] {
  const lastMonth = subMonths(today, 1)
  const lastYear = subYears(today, 1)
  return [
    { label: "Last 7 Days", from: iso(subDays(today, 6)), to: iso(today) },
    { label: "Last 30 Days", from: iso(subDays(today, 29)), to: iso(today) },
    { label: "Last 90 Days", from: iso(subDays(today, 89)), to: iso(today) },
    { label: "Last 365 Days", from: iso(subDays(today, 364)), to: iso(today) },
    null,
    { label: "Last 3 Months", from: iso(subMonths(today, 3)), to: iso(today) },
    { label: "Last 6 Months", from: iso(subMonths(today, 6)), to: iso(today) },
    {
      label: "Last 12 Months",
      from: iso(subMonths(today, 12)),
      to: iso(today),
    },
    null,
    {
      label: "Last Month",
      from: iso(startOfMonth(lastMonth)),
      to: iso(endOfMonth(lastMonth)),
    },
    {
      label: "Last Year",
      from: iso(startOfYear(lastYear)),
      to: iso(endOfYear(lastYear)),
    },
    null,
    { label: "Month to Date", from: iso(startOfMonth(today)), to: iso(today) },
    { label: "Year to Date", from: iso(startOfYear(today)), to: iso(today) },
    { label: "All Time", from: "2015-01-01", to: iso(today) },
  ]
}

/** Presets a report can ask for by label but that are not in the default
 *  list. "Previous Week" is the last complete ISO week, Monday to Sunday. */
function extraPresets(today: Date): Preset[] {
  const lastWeek = subWeeks(today, 1)
  return [
    {
      label: "Previous Week",
      from: iso(startOfISOWeek(lastWeek)),
      to: iso(endOfISOWeek(lastWeek)),
    },
  ]
}

/** One end of the range: the shadcn date picker — a button showing the date,
 *  opening a Calendar in a popover. Kept local because both ends need it and
 *  each has to close itself once a day is chosen. */
function DateField({
  id,
  value,
  onSelect,
  disabledAfter,
  disabledBefore,
  earliest,
  fallbackMonth,
}: {
  id: string
  /** ISO yyyy-MM-dd, or "" for unset */
  value: string
  onSelect: (value: string) => void
  disabledAfter?: string
  disabledBefore?: string
  /** the earliest day offered: the calendar pages no further back */
  earliest?: string
  /** month to open on when no date is set yet */
  fallbackMonth: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-between gap-2 font-normal"
        )}
      >
        <span className="truncate">
          {value ? pretty(value) : "Pick a date"}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          // ISO weeks everywhere else in these reports, so Monday.
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? parseISO(fallbackMonth)}
          startMonth={earliest ? parseISO(earliest) : undefined}
          // One matcher per bound; react-day-picker rejects a partial
          // {after, before} object with undefined members.
          disabled={[
            ...(disabledAfter ? [{ after: parseISO(disabledAfter) }] : []),
            ...(disabledBefore ? [{ before: parseISO(disabledBefore) }] : []),
          ]}
          onSelect={(date) => {
            if (!date) return
            onSelect(iso(date))
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function FilterBar({
  filters,
  extra,
  extraSummary,
  presetLabels,
  earliest,
  align = "start",
}: {
  filters: ReportFilters
  /** Report-specific filters, rendered inside the same popover so a page never
   *  grows a second filter control. Compose them as `Field` + `FieldLabel`. */
  extra?: ReactNode
  /** How those extra filters read in the trigger summary, e.g. "Money & Volume". */
  extraSummary?: string
  /** Offer ONLY these presets, in this order, and no Start/End fields — for a
   *  page whose figures are read per fixed period rather than over any range. */
  presetLabels?: string[]
  /** The earliest day a range may start on (YYYY-MM-DD), for a report that
   *  reads only a bounded window: no earlier day can be picked, and a preset
   *  reaching further back ("All Time") starts on it instead. The loader
   *  clamps the URL the same way. */
  earliest?: string
  /** Which edge of the trigger the panel lines up with. "end" for a trigger
   *  at the right of the page, e.g. portalled into the global header. */
  align?: "start" | "end"
}) {
  const [, setSearchParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  // Dates are held locally while the popover is open, so a half-typed date never
  // re-queries the report, and reseeded from the filters on every open —
  // including after a preset changed them. The preset list and any `extra`
  // filter apply on the spot: they are single discrete choices with no
  // intermediate state to protect.
  const [draft, setDraft] = useState({ from: filters.from, to: filters.to })
  const openPanel = (next: boolean) => {
    if (next) setDraft({ from: filters.from, to: filters.to })
    setOpen(next)
  }

  const draftInvalid = Boolean(draft.from && draft.to && draft.from > draft.to)

  const update = (patch: Partial<Omit<ReportFilters, "params">>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          next.set(key, value)
        }
        return next
      },
      { replace: true }
    )
  }

  const today = new Date()
  // A preset reaching before the earliest day starts on it; one ending
  // before it is not offered.
  const bound = (list: (Preset | null)[]) =>
    earliest
      ? list
          .filter((p) => p === null || p.to >= earliest)
          .map((p) => (p && p.from < earliest ? { ...p, from: earliest } : p))
      : list
  const catalog = bound([
    ...presets(today).filter((p): p is Preset => p !== null),
    ...extraPresets(today),
  ]).filter((p): p is Preset => p !== null)
  const PRESETS: (Preset | null)[] = presetLabels
    ? presetLabels
        .map((label) => catalog.find((p) => p.label === label))
        .filter((p): p is Preset => p !== undefined)
    : bound(presets(today))
  const items = PRESETS.filter((p): p is Preset => p !== null)
  // The preset the current range matches, if any — otherwise the range is custom
  // and the select says so.
  const active = items.find(
    (p) => p.from === filters.from && p.to === filters.to
  )

  // The summary IS the control. Collapsing the filters behind an icon saves a
  // row, but an icon alone would hide what the report is filtered to — and a
  // number on a page whose scope you cannot see is a number you cannot use.
  const summary = [
    active?.label ?? `${pretty(filters.from)} – ${pretty(filters.to)}`,
    extraSummary ?? null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Popover open={open} onOpenChange={openPanel}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "max-w-full justify-start gap-2 font-normal"
        )}
        aria-label="Filters"
      >
        <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{summary}</span>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align={align}>
        <FieldGroup className="gap-3">
          {extra}

          <>
            {/* A select rather than the old twelve-button list: inside a
                  shared panel the presets have to cost one row, not twelve. */}
            <Field>
              <FieldLabel htmlFor="filter-preset">Date range</FieldLabel>
              <Select
                value={active?.label ?? CUSTOM}
                onValueChange={(label) => {
                  const preset = items.find((p) => p.label === String(label))
                  if (preset) {
                    update({ from: preset.from, to: preset.to })
                    setDraft({ from: preset.from, to: preset.to })
                  }
                }}
              >
                <SelectTrigger id="filter-preset" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Not selectable: "Custom" is what the dates below say, not
                        a thing you pick. It shows only when they say it. */}
                  {!active && (
                    <SelectItem value={CUSTOM} disabled>
                      {CUSTOM}
                    </SelectItem>
                  )}
                  {PRESETS.map((preset, i) =>
                    preset === null ? (
                      <SelectSeparator key={`sep-${i}`} />
                    ) : (
                      <SelectItem key={preset.label} value={preset.label}>
                        {preset.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </Field>

            {/* Two fields, one per end of the range — each the shadcn date
                  picker (Popover + Calendar), NOT `<Input type="date">`: a
                  native date input renders the browser's own calendar, which
                  ignores every token in app.css (blue selection, its own
                  fonts, no dark mode). Dropped when the page fixes its
                  presets (`presetLabels`).

                  `min-w-0 flex-1` is what stops the overflow: a flex item
                  defaults to `min-width: auto`, so without it the pair pushes
                  past the popover edge instead of sharing the row. */}
            {!presetLabels && (
              <>
                <div className="flex gap-2">
                  <Field className="min-w-0 flex-1">
                    <FieldLabel htmlFor="filter-from">Start</FieldLabel>
                    <DateField
                      id="filter-from"
                      value={draft.from}
                      // Can't start after the range ends, or before the
                      // report's earliest day.
                      disabledAfter={draft.to}
                      disabledBefore={earliest}
                      earliest={earliest}
                      fallbackMonth={filters.to}
                      onSelect={(value) =>
                        setDraft((d) => ({ ...d, from: value }))
                      }
                    />
                  </Field>
                  <Field className="min-w-0 flex-1">
                    <FieldLabel htmlFor="filter-to">End</FieldLabel>
                    <DateField
                      id="filter-to"
                      value={draft.to}
                      disabledBefore={draft.from || earliest}
                      earliest={earliest}
                      fallbackMonth={filters.to}
                      onSelect={(value) =>
                        setDraft((d) => ({ ...d, to: value }))
                      }
                    />
                  </Field>
                </div>

                {draftInvalid && (
                  <p className="text-xs text-muted-foreground">
                    The start date has to fall on or before the end date.
                  </p>
                )}

                {/* Only the dates need committing — everything else above has
                  already applied, which is why this says Apply dates. */}
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    draftInvalid ||
                    !draft.from ||
                    !draft.to ||
                    (draft.from === filters.from && draft.to === filters.to)
                  }
                  onClick={() => {
                    update({ from: draft.from, to: draft.to })
                    setOpen(false)
                  }}
                >
                  Apply dates
                </Button>
              </>
            )}
          </>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  )
}
