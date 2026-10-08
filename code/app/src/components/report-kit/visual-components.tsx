// Components for the visuals that are not a chart on axes: a waffle of 100
// squares, a progress track against a target with its stat cells, and a
// driver tree of KPI cards (drawn by driver-tree.tsx, loaded when a page has
// one). Each reads its series by name, like every component in components.tsx, and
// is drawn once, here, to product/DESIGN.md and DESIGN-REPORTS.md.

import { lazy, Suspense, type ReactNode } from "react"

import { Skeleton } from "~/components/ui/skeleton"
import { cn } from "~/lib/utils"

import {
  resolveText,
  useKitData,
  useSeries,
  type ColOf,
  type Row,
  type SeriesOf,
  type Text,
} from "./context"
import { fmt, type Fmt, type FmtSpec } from "./format"
import { ComponentInfo, type ComponentInfoSpec } from "./info"
import { defineComponent } from "./layout"
import { ChartCard } from "./report-charts"
import type { DriverTreeProps } from "./driver-tree"

type AnyData = Record<string, Row[]>

type Common<D> = {
  title: Text<D>
  description?: Text<D>
  span?: 1 | 2
  info?: ComponentInfoSpec
}

/** The chart frame: the title, its description and "(i)" above the visual,
 *  open on the page (as components.tsx's). */
function Frame({
  title,
  description,
  info,
  empty,
  children,
}: {
  title?: Text<never>
  description?: Text<never>
  info?: ComponentInfoSpec
  empty: boolean
  children: ReactNode
}) {
  const { data, emptyText } = useKitData()
  const t = resolveText(title, data) ?? ""
  return (
    <ChartCard
      title={t}
      description={resolveText(description, data)}
      action={info && <ComponentInfo title={t} spec={info} />}
    >
      {empty ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        children
      )}
    </ChartCard>
  )
}

// ── Waffle ─────────────────────────────────────────────────────────────────

export type WaffleProps<D, K extends SeriesOf<D>> = Common<D> & {
  series: K
  /** a stage's name */
  label: ColOf<D, K>
  /** a stage's count: the largest is the 100 squares */
  value: ColOf<D, K>
  /** a boolean column: the stage's squares are ringed (a second kind of
   *  stage, the insurance ones on a loan funnel) */
  ring?: ColOf<D, K>
  /** squares per row (default 10: a 10 × 10 grid) */
  columns?: number
}

/** A stage's shade: light backdrop → dark front, from the foreground token
 *  so it follows the theme (12 % → 72 %), as many steps as there are stages
 *  — a funnel has more stages than the five-step ramp. */
const stageShade = (i: number, n: number) =>
  `color-mix(in oklab, var(--foreground) ${Math.round(12 + (60 * i) / Math.max(n - 1, 1))}%, transparent)`

/** Where 100 of the base end up: 100 squares, each shaded by the deepest
 *  stage its 1 % reaches, a legend with each stage's share. */
export const Waffle = defineComponent(
  function Waffle(p: WaffleProps<AnyData, string>) {
    const rows = useSeries(p.series)
    const stages = rows
      .map((r) => ({
        label: String(r[p.label] ?? ""),
        value: Number(r[p.value]) || 0,
        ring: p.ring ? Boolean(r[p.ring]) : false,
      }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
    const base = stages[0]?.value ?? 1
    const counts = stages.map((s, i) => ({
      ...s,
      idx: i,
      dots: Math.round((100 * s.value) / base),
    }))
    // A square belongs to the deepest (last) stage whose share still covers it.
    const stageFor = (square: number) => {
      let deepest = 0
      for (const c of counts) if (c.dots > square) deepest = c.idx
      return deepest
    }
    const cols = Math.max(1, Math.min(25, p.columns ?? 10))
    return (
      <Frame {...p} empty={stages.length === 0}>
        <div className="flex flex-col gap-4">
          <div
            className="grid w-fit gap-1"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: 100 }, (_, i) => {
              const idx = stageFor(i)
              return (
                <span
                  key={i}
                  className={cn(
                    "size-5 rounded-[3px]",
                    counts[idx].ring && "ring-2 ring-foreground ring-inset"
                  )}
                  style={{ background: stageShade(idx, counts.length) }}
                />
              )
            })}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {counts.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-3 shrink-0 rounded-[3px]",
                    s.ring && "ring-2 ring-foreground ring-inset"
                  )}
                  style={{ background: stageShade(s.idx, counts.length) }}
                />
                <span className="text-muted-foreground">
                  {s.label} — {s.dots < 1 ? "<1" : s.dots} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Frame>
    )
  },
  { span: 1, skeleton: () => <Skeleton className="h-80 rounded-xl" /> }
)

// ── Progress track ─────────────────────────────────────────────────────────

/** A stat cell under the track: a figure of the series' first row. */
export type ProgressCell<D, K extends keyof D> = FmtSpec & {
  label: string
  /** the column printed (in the cell's format, else the component's; a text
   *  column prints as it is) */
  value: ColOf<D, K>
  /** a text column: the muted line under the figure */
  line?: ColOf<D, K>
  /** the track's swatch beside the label: the value's or the projection's */
  swatch?: "value" | "projection"
}

export type ProgressProps<D, K extends SeriesOf<D>> = Common<D> &
  FmtSpec & {
    series: K
    /** the figure so far (the filled part of the track) */
    value: ColOf<D, K>
    /** where it is heading (a paler part behind it), optional */
    projection?: ColOf<D, K>
    /** the full track: the budget or target */
    target: ColOf<D, K>
    /** the track's right-hand end label (default "Target") */
    targetLabel?: string
    /** figures under the track, three across */
    cells?: ProgressCell<D, K>[]
  }

const pctOf = (v: unknown, of: number) =>
  v == null || v === "" || !(of > 0)
    ? null
    : Math.max(0, Math.min(100, (Number(v) / of) * 100))

/** A bullet track: the figure so far against a target, a projection behind
 *  it, the scale's two ends under it, then a row of stat cells. Marks in the
 *  ramp (`--chart-4` the actual, `--chart-2` at half the projection), never
 *  `primary` (DESIGN.md → Tokens). */
export const Progress = defineComponent(
  function Progress(p: ProgressProps<AnyData, string>) {
    const r = useSeries(p.series)[0]
    const spec: FmtSpec = {
      format: p.format,
      prefix: p.prefix,
      suffix: p.suffix,
      decimals: p.decimals,
    }
    const target = r ? Number(r[p.target]) : NaN
    const valuePct = r ? pctOf(r[p.value], target) : null
    const projPct = r && p.projection ? pctOf(r[p.projection], target) : null
    const swatch = (s?: "value" | "projection") =>
      s === "value" ? "bg-chart-4" : s === "projection" ? "bg-chart-2/50" : null
    const cells = p.cells ?? []
    return (
      <Frame {...p} empty={!r || !Number.isFinite(target)}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="relative h-10 w-full overflow-hidden rounded-lg bg-muted">
              {projPct != null && (
                <div
                  className="absolute inset-y-0 left-0 bg-chart-2/50"
                  style={{ width: `${projPct}%` }}
                />
              )}
              {valuePct != null && (
                <div
                  className="absolute inset-y-0 left-0 bg-chart-4"
                  style={{ width: `${valuePct}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>0</span>
              <span>
                {p.targetLabel ?? "Target"} {fmt(target, spec)}
              </span>
            </div>
          </div>
          {cells.length > 0 && r && (
            <div
              className={cn(
                "grid grid-cols-1 gap-4",
                cells.length === 2 && "sm:grid-cols-2",
                cells.length >= 3 && "sm:grid-cols-3"
              )}
            >
              {cells.map((c) => {
                const sw = swatch(c.swatch)
                const cs: FmtSpec = {
                  format: c.format ?? spec.format,
                  prefix: c.prefix ?? (c.format ? undefined : spec.prefix),
                  suffix: c.suffix ?? (c.format ? undefined : spec.suffix),
                  decimals: c.decimals ?? (c.format ? undefined : spec.decimals),
                }
                return (
                  <div key={c.label} className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {sw && <span className={cn("size-2.5 rounded-sm", sw)} />}
                      {c.label}
                    </span>
                    <span className="text-lg font-semibold tracking-tight tabular-nums">
                      {typeof r[c.value] === "string"
                        ? String(r[c.value])
                        : fmt(r[c.value], cs)}
                    </span>
                    {c.line && r[c.line] != null && r[c.line] !== "" && (
                      <span className="text-xs text-muted-foreground">
                        {String(r[c.line])}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Frame>
    )
  },
  { span: 2, skeleton: () => <Skeleton className="h-48 rounded-xl" /> }
)

// ── Driver tree ────────────────────────────────────────────────────────────

const DriverTreeCanvas = lazy(() => import("./driver-tree"))

export type DriverTreeComponentProps<D, K extends SeriesOf<D>> = Omit<
  Common<D>,
  "title"
> & {
  title?: Text<D>
  series: K
} & Omit<DriverTreeProps, "rows">

const treeHeight = (h?: string) => h ?? "h-[36rem]"

/** KPI cards joined parent → child on a canvas: each its figure against its
 *  target, "/ target" in `text-emerald-600` on track, muted off it. Nodes
 *  and edges come from the rows (`parent` names a row's `id`). */
export const DriverTree = defineComponent(
  function DriverTree(p: DriverTreeComponentProps<AnyData, string>) {
    const rows = useSeries(p.series)
    const { data } = useKitData()
    const t = resolveText(p.title as Text<never>, data)
    const canvas = (
      <Suspense
        fallback={
          <Skeleton className={cn("w-full rounded-xl", treeHeight(p.height))} />
        }
      >
        <DriverTreeCanvas
          rows={rows}
          node={p.node}
          format={p.format as Fmt | undefined}
          height={treeHeight(p.height)}
        />
      </Suspense>
    )
    return t != null || p.info ? (
      <Frame {...p} empty={rows.length === 0}>
        {canvas}
      </Frame>
    ) : rows.length === 0 ? (
      <Frame {...p} empty>
        {null}
      </Frame>
    ) : (
      canvas
    )
  },
  {
    span: 2,
    skeleton: (props) => (
      <Skeleton
        className={cn(
          "w-full rounded-xl",
          treeHeight(props.height as string | undefined)
        )}
      />
    ),
  }
)
