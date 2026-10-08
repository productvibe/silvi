// `{% inputs %}`: a model's assumptions as ONE card of sliders and numbers on
// the page, under the tiles (DESIGN.md → Page layout: "A model page's
// assumptions are sliders in one card under the tiles, and they live in the
// URL"). Each field is stacked: the label muted, the value in force in
// `text-base font-medium tabular-nums`, the control, then one muted line
// "Today <the measured value>". The value moves with the drag from local
// state; the URL (`?<param>=`) is written on release, so a pasted link opens
// on the same scenario without a history entry per pixel, and the loader then
// re-runs the transforms on the cached fetch (no query). With no value in
// the URL a field starts at its default — the measured value when it is read
// off the data (`default=$today.0.dd`), never a round number.

import { Children, isValidElement, useEffect, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router"

import { Field, FieldLabel } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Skeleton } from "~/components/ui/skeleton"
import { Slider } from "~/components/ui/slider"
import { cn } from "~/lib/utils"

import { useKitData } from "./context"
import { fmt, type Fmt } from "./format"
import { defineComponent } from "./layout"
import { Widget } from "./widget"

type Num = number | ((data: unknown) => unknown)

type NumberInputProps = {
  param: string
  label: string
  min?: number
  max?: number
  step?: number
  default?: Num | string
  today?: Num | string
  /** a ladder: numbers, or `{value, label?}` rows read off the data */
  steps?: unknown
  format?: Fmt
  decimals?: number
  prefix?: string
  suffix?: string
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : v == null || v === "" ? NaN : Number(v)
  return Number.isFinite(n) ? n : null
}

/** The value a field shows: the URL's, else the default (read off the data
 *  when it is a `$path`), else its lower bound. */
function useValue(p: NumberInputProps) {
  const { data, filters } = useKitData()
  const read = (v: unknown) => (typeof v === "function" ? v(data) : v)
  const value =
    num(filters.params?.[p.param]) ?? num(read(p.default)) ?? p.min ?? 0
  const todayRaw = read(p.today)
  const today = num(todayRaw)
  // a text read off the data ("4 · 375 NOK") prints as it is
  const todayText =
    today == null && typeof todayRaw === "string" && todayRaw !== "" ? todayRaw : null
  const [searchParams, setSearchParams] = useSearchParams()
  const commit = (v: number) => {
    if (String(v) === searchParams.get(p.param)) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(p.param, String(v))
        return next
      },
      { replace: true, preventScrollReset: true }
    )
  }
  const steps = read(p.steps)
  const ladder = Array.isArray(steps)
    ? steps.flatMap((s) => {
        if (s && typeof s === "object") {
          const o = s as Record<string, unknown>
          const v = num(o.value)
          return v == null ? [] : [{ value: v, label: o.label == null ? undefined : String(o.label) }]
        }
        const v = num(s)
        return v == null ? [] : [{ value: v, label: undefined }]
      })
    : null
  return { value, today, todayText, commit, ladder }
}

function show(p: NumberInputProps, v: number | null, ladder?: { value: number; label?: string }[] | null) {
  const rung = ladder?.find((s) => s.value === v)
  if (rung?.label) return rung.label
  return fmt(v, { format: p.format, decimals: p.decimals, prefix: p.prefix, suffix: p.suffix })
}

function Shell({ p, shown, today, children }: { p: NumberInputProps; shown: string; today: string | null; children: ReactNode }) {
  const id = `input-${p.param}`
  return (
    <Field className="gap-2">
      <FieldLabel htmlFor={id} className="text-muted-foreground">
        {p.label}
      </FieldLabel>
      <span className="text-base font-medium whitespace-nowrap tabular-nums">{shown}</span>
      {children}
      {today != null && <span className="text-xs text-muted-foreground tabular-nums">Today {today}</span>}
    </Field>
  )
}

/** A slider over min…max by step, or along a ladder of values. */
export function InputSlider(p: NumberInputProps) {
  const { value, today, todayText, commit, ladder } = useValue(p)
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  const idx = ladder ? Math.max(0, ladder.findIndex((s) => s.value === local)) : 0
  return (
    <Shell p={p} shown={show(p, local, ladder)} today={today == null ? todayText : show(p, today, ladder)}>
      {ladder ? (
        <Slider
          id={`input-${p.param}`}
          min={0}
          max={Math.max(ladder.length - 1, 0)}
          step={1}
          value={[idx]}
          onValueChange={(v) => setLocal(ladder[Array.isArray(v) ? v[0] : v]?.value ?? local)}
          onValueCommitted={(v) => {
            const s = ladder[Array.isArray(v) ? v[0] : v]
            if (s) commit(s.value)
          }}
          aria-label={p.label}
        />
      ) : (
        <Slider
          id={`input-${p.param}`}
          min={p.min ?? 0}
          max={p.max ?? 100}
          step={p.step ?? 1}
          value={[local]}
          onValueChange={(v) => setLocal(Array.isArray(v) ? v[0] : v)}
          onValueCommitted={(v) => commit(Array.isArray(v) ? v[0] : v)}
          aria-label={p.label}
        />
      )}
    </Shell>
  )
}

/** A typed number, committed on Enter or when the field loses focus. */
export function InputNumber(p: NumberInputProps) {
  const { value, today, todayText, commit } = useValue(p)
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const done = () => {
    const n = num(draft)
    if (n == null) return setDraft(String(value))
    const clamped = Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, n))
    setDraft(String(clamped))
    commit(clamped)
  }
  return (
    <Shell p={p} shown={show(p, num(draft) ?? value)} today={today == null ? todayText : show(p, today)}>
      <Input
        id={`input-${p.param}`}
        type="number"
        inputMode="decimal"
        min={p.min}
        max={p.max}
        step={p.step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={done}
        onKeyDown={(e) => e.key === "Enter" && done()}
        className="tabular-nums"
        aria-label={p.label}
      />
    </Shell>
  )
}

const GRID = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
} as const

const count = (children: ReactNode) =>
  Math.min(Math.max(Children.toArray(children).filter(isValidElement).length, 1), 4) as 1 | 2 | 3 | 4

/** The card: its fields in a grid, up to four across. */
export const Inputs = defineComponent(
  function Inputs(p: { children: ReactNode; span?: 1 | 2 }) {
    return (
      <Widget bodyClassName="p-4">
        <div className={cn("grid grid-cols-1 gap-6", GRID[count(p.children)])}>{p.children}</div>
      </Widget>
    )
  },
  {
    span: 2,
    skeleton: () => <Skeleton className="h-32 rounded-xl" />,
  }
)
