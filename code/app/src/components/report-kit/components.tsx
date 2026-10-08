// The components a kit page is made of. Each reads its series from the page's
// data by name, so a page is a list of props: a report.tsx's `components`, typed
// by the `Kit<D>` type at the bottom (a series or column the data lacks fails
// typecheck). Charts are today's shared
// ones (report-charts.tsx), wired by props; tiles, tables and bars are drawn
// here, once, to product/DESIGN.md and DESIGN-REPORTS.md.

import type { ComponentType, ReactNode } from "react"
import { useSearchParams } from "react-router"

import { Skeleton } from "~/components/ui/skeleton"
import {
  Tabs as UiTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs"
import {
  Table as UiTable,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { TooltipProvider } from "~/components/ui/tooltip"
import type { ReportFilters } from "~/lib/filters"
import {
  formatCompact,
  formatIsoWeek,
  formatMonth,
  uniquePeriodLabels,
} from "~/lib/format"
import { cn } from "~/lib/utils"
import { getMetric, metricOfRow, type MetricName } from "~/metrics"

import {
  resolveText,
  useKitData,
  useSeries,
  type ColOf,
  type Row,
  type SeriesOf,
  type Text,
} from "./context"
import { DASH, fmt, isNumeric, type Fmt, type FmtSpec } from "./format"
import {
  alignScales,
  niceScale,
  type DomainEnd,
  type NiceScale,
} from "./scale"
import { ComponentInfo, type ComponentInfoSpec } from "./info"
import { KpiCard } from "./kpi-card"
import { Widget } from "./widget"
import { defineComponent, Layout, LayoutSkeleton, type Columns } from "./layout"
import {
  BarsWithLine as BarsWithLineChart,
  CategoryBars as CategoryBarsChart,
  CategoryTreemap,
  ChartCard,
  GroupedTreemap,
  legendItems,
  MultiLine,
  NestedAreaFunnel,
  SeriesLegend,
  StackedBars as StackedBarsChart,
  type TipRow,
} from "./report-charts"
import { SectionHeader } from "./visual-info"
import { DrillCell, useDrills, type DrillSpec } from "./drill"
import {
  ColumnsButton,
  CopyButton,
  DownloadButton,
  EstimateMark,
  Term,
  usePicker,
} from "./table-tools"
import { copyTable, downloadXlsx, type ExportModel } from "./table-export"
import { SortMark, sortRows } from "./columns-dialog"
import { Inputs } from "./inputs-card"
import {
  DriverTree,
  Progress,
  Waffle,
  type DriverTreeComponentProps,
  type ProgressProps,
  type WaffleProps,
} from "./visual-components"

// ── Shared pieces ──────────────────────────────────────────────────────────

type Common<D> = {
  title: Text<D>
  description?: Text<D>
  /** 1 = half the row (the default for charts), 2 = the whole row */
  span?: 1 | 2
  /** the visual's own "(i)": one line, rule ids from the report.md dialog, SQL names */
  info?: ComponentInfoSpec
}

/** Which columns a chart draws: every column but x (`"*"`, in the row's own
 *  order), a list, column → legend label, or — when the series' columns come
 *  from the data (synthetic keys `s0`, `s1`, … standing for values the query
 *  returned) — column → label read off the data. */
type Y<D, K extends keyof D> =
  | "*"
  | readonly ColOf<D, K>[]
  | Partial<Record<ColOf<D, K>, string>>
  | ((data: D) => Record<string, string> | readonly string[])

function yKeys(
  y: unknown,
  rows: Row[],
  x: string,
  data?: unknown
): { keys: string[]; labels?: Record<string, string> } {
  if (typeof y === "function") {
    // read off the data: column → label, or a list of columns (`y=$keys`,
    // a set of cohorts the query returned)
    const v = (y as (d: unknown) => unknown)(data)
    if (Array.isArray(v)) return { keys: v.map(String) }
    // a key whose label is null is not drawn (a label row whose columns
    // depend on the view: report.json rows have fixed keys)
    const labels = (v ?? {}) as Record<string, string | null>
    const keys = Object.keys(labels).filter((k) => labels[k] != null)
    return { keys, labels: labels as Record<string, string> }
  }
  if (y === "*")
    return { keys: Object.keys(rows[0] ?? {}).filter((k) => k !== x) }
  if (Array.isArray(y)) return { keys: y as string[] }
  const labels = y as Record<string, string>
  return { keys: Object.keys(labels), labels }
}

type Datum = Record<string, string | number | null>

/** A chart drawn from a named metric (app/src/metrics): each row's value is
 *  the metric of its own columns (Σ numerator / Σ denominator — so a
 *  totals row is a ratio of sums), keyed and labelled by the metric. With
 *  `y` given, the metric only sets the format. */
function withMetric(
  p: { metric?: MetricName; y?: unknown; percent?: boolean },
  rows: Row[]
): { rows: Row[]; y: unknown; percent?: boolean } {
  if (!p.metric) return { rows, y: p.y, percent: p.percent }
  const m = getMetric(p.metric)
  const percent = p.percent ?? m.format.startsWith("percent")
  if (p.y != null) return { rows, y: p.y, percent }
  return {
    rows: rows.map((r) => ({ ...r, [m.name]: metricOfRow(p.metric!, r) })),
    y: { [m.name]: m.label },
    percent,
  }
}

/** The data as the component implementations see it: any series, any column.
 *  Pages see it typed, through `Kit<D>`. */
type AnyData = Record<string, Row[]>

/** How a chart prints its x: "month" a month key as "Mar 2026"; "period"
 *  week or month keys as the short axis labels, made unique ("Aug", or
 *  "Aug 25" / "Aug 26" when two would read alike — uniquePeriodLabels);
 *  "week" an ISO week key as PowerBI does, "2026 W30" in the hover, the week
 *  over its year on the axis. */
export type XFormat = "month" | "period" | "week"

function chartRows(rows: Row[], x: string, xFormat?: XFormat): Datum[] {
  if (xFormat === "week")
    return rows.map((r) => ({ ...r, [x]: formatIsoWeek(String(r[x])) })) as Datum[]
  if (xFormat === "month")
    return rows.map((r) => ({ ...r, [x]: formatMonth(String(r[x])) })) as Datum[]
  if (xFormat === "period") {
    const labels = uniquePeriodLabels(rows.map((r) => String(r[x])))
    return rows.map((r) => ({
      ...r,
      [x]: labels.get(String(r[x])) ?? r[x],
    })) as Datum[]
  }
  return rows as Datum[]
}

/** A table's body: open on the page by default, its rows ruled; with
 *  `border`, inside a hairline-edged card with an 8 px inset.
 *  `data-slot="widget"`, as Widget's body, so a preset's style (theme.css)
 *  draws it as one. */
const tableCard = (border?: boolean) =>
  border ? "rounded-xl border bg-card px-2 py-1 [&>p]:p-2" : "[&>p]:py-2"

function Empty() {
  const { emptyText } = useKitData()
  return <p className="text-sm text-muted-foreground">{emptyText}</p>
}

function Frame({
  title,
  description,
  info,
  metric,
  empty,
  children,
}: {
  title: Text<never>
  description?: Text<never>
  info?: ComponentInfoSpec
  metric?: MetricName
  empty: boolean
  children: ReactNode
}) {
  const { data } = useKitData()
  const t = resolveText(title, data) ?? ""
  const spec = info && metric ? { ...info, metrics: [metric] } : info
  return (
    <ChartCard
      title={t}
      description={resolveText(description, data)}
      action={spec && <ComponentInfo title={t} spec={spec} />}
    >
      {empty ? <Empty /> : children}
    </ChartCard>
  )
}

/** A bare section header (for a table or bars that are not a card), with the
 *  same title / description / "(i)" a chart carries. */
function Header({
  title,
  description,
  info,
  extra,
}: {
  title: Text<never>
  description?: Text<never>
  info?: ComponentInfoSpec
  /** the component's own controls, left of its "(i)" (a table's copy glyph and
   *  Columns button) */
  extra?: ReactNode
}) {
  const { data } = useKitData()
  const t = resolveText(title, data) ?? ""
  return (
    <SectionHeader
      title={t}
      description={resolveText(description, data)}
      action={
        extra ? (
          <span className="flex items-center gap-1">
            {extra}
            {info && <ComponentInfo title={t} spec={info} />}
          </span>
        ) : (
          info && <ComponentInfo title={t} spec={info} />
        )
      }
    />
  )
}

const chartSkeleton = () => <Skeleton className="h-80 rounded-xl" />

// ── Charts ─────────────────────────────────────────────────────────────────

/** Small multiples (`split`): the rows grouped by a column's value, in
 *  order of first appearance, one panel each. */
function splitRows(rows: Row[], col: string): { title: string; rows: Row[] }[] {
  const out = new Map<string, Row[]>()
  for (const r of rows) {
    const k = String(r[col] ?? "")
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push(r)
  }
  return [...out].map(([title, rs]) => ({ title, rows: rs }))
}

/** The panels of a split chart, each titled by its value in the kit's small
 *  label, and one legend below them. How many across follows the CARD's width
 *  (a container query), not the viewport's: two once each panel gets ~300 px,
 *  three only once each still gets ~380 px (a card ≥ 1188 px) — at the report
 *  column's width that is two. Three at ~270 px overprinted labels and ticks
 *  (1P - 20 Marketing, 2026-09-29). */
function Panels({
  panels,
  draw,
  legend,
}: {
  panels: { title: string; rows: Row[] }[]
  draw: (rows: Row[]) => ReactNode
  legend?: { key: string; label: string; color: string }[]
}) {
  return (
    <>
      <div className="@container">
        <div className="grid grid-cols-1 gap-6 @min-[40rem]:grid-cols-2 @min-[74.25rem]:grid-cols-3">
          {panels.map((p) => (
            <div key={p.title} className="min-w-0">
              <div className="pb-2 text-xs font-medium text-muted-foreground">
                {p.title}
              </div>
              {draw(p.rows)}
            </div>
          ))}
        </div>
      </div>
      {legend && legend.length > 1 && <SeriesLegend items={legend} />}
    </>
  )
}

/** A component's `labels` / `tooltip` lists: `true` = every drawn key. */
function keyList(v: unknown, keys: string[]): string[] | undefined {
  if (v === true) return keys
  return Array.isArray(v) ? (v as string[]) : undefined
}

const splitSkeleton = (props: Record<string, unknown>) => (
  <Skeleton className={cn("rounded-xl", props.split ? "h-[48rem]" : "h-80")} />
)

export type LineProps<D, K extends SeriesOf<D>> = Common<D> & {
  series: K
  x: ColOf<D, K>
  /** the columns drawn; omit with `metric` to draw the metric */
  y?: Y<D, K>
  /** a named metric: its value per row, label and format */
  metric?: MetricName
  /** print x as a month ("2026-03" → "Mar 2026"), a short unique period, or
   *  an ISO week "2026 W30" (two lines on the axis) */
  xFormat?: XFormat
  percent?: boolean
  /** the plot's height class (default h-64, as stacked_bars; a split panel
   *  is h-64 unless this is set) */
  height?: string
  /** a dashed reference line: a number, or read off the data */
  target?: number | ((data: D) => number | null | undefined)
  targetLabel?: string
  legend?: boolean
  /** y keys drawn dashed: a projected or modelled series beside the actual
   *  one (DESIGN-REPORTS §7) */
  dashed?: readonly ColOf<D, K>[]
  /** the y axis gutter in px (default 40) */
  yWidth?: number
  /** the y domain in the data's units (a percent line is 0–100): `[0, 100]`,
   *  or `["auto", "auto"]` for an axis that need not start at zero */
  yDomain?: readonly [DomainEnd, DomainEnd]
  /** value labels on the points: `true` for every y key, or a list */
  labels?: boolean | readonly ColOf<D, K>[]
  /** decimals of a percent value label (default 1) */
  labelDecimals?: number
  /** extra hover rows (column → label, or {label, format, decimals}) */
  tooltip?: Tooltip<D, K>
  /** small multiples: one panel per value of this column, two across (three
   *  on a card wide enough for ~380 px each),
   *  one shared y scale and one legend */
  split?: ColOf<D, K>
  /** the one y key drawn in full; every other key is a faint line with no
   *  hover row and no legend (a spaghetti of cohorts under their pool) */
  focus?: ColOf<D, K>
  /** a muted caption under the x axis ("months after signing") */
  xLabel?: string
}

export const Line = defineComponent(
  function Line(p: LineProps<AnyData, string>) {
    const m = withMetric(p, useSeries(p.series))
    const rows = m.rows
    const { data } = useKitData()
    const { keys, labels } = yKeys(m.y, rows, p.x, data)
    const target =
      typeof p.target === "function" ? p.target(data as AnyData) : p.target
    const draw = (
      rs: Row[],
      extra: {
        legend?: boolean
        yDomain?: readonly [DomainEnd, DomainEnd]
        yTicks?: number[]
        height?: string
      } = {}
    ) => (
      <MultiLine
        data={chartRows(rs, p.x, p.xFormat)}
        xKey={p.x}
        keys={keys}
        labels={labels}
        percent={m.percent}
        target={target ?? undefined}
        targetLabel={p.targetLabel}
        legend={p.legend ?? (p.focus == null && keys.length > 1)}
        focus={p.focus}
        xLabel={p.xLabel}
        dashed={p.dashed}
        yWidth={p.yWidth}
        yDomain={p.yDomain}
        valueLabels={keyList(p.labels, keys)}
        labelDecimals={p.labelDecimals}
        tooltipRows={tooltipRows(p.tooltip, data)}
        weekTicks={p.xFormat === "week"}
        height={p.height}
        {...extra}
      />
    )
    if (p.split) {
      // A blank cell is no value, not 0: Number(null) would drag an auto
      // minimum to zero.
      const values = rows.flatMap((r) =>
        keys.flatMap((k) => (r[k] == null || r[k] === "" ? [] : [Number(r[k])]))
      )
      if (target != null) values.push(target)
      const y = niceScale(values, p.yDomain)
      return (
        <Frame {...p} empty={rows.length === 0}>
          <Panels
            panels={splitRows(rows, p.split)}
            draw={(rs) =>
              draw(rs, {
                legend: false,
                yDomain: y.domain,
                yTicks: y.ticks,
                height: p.height ?? "h-64",
              })
            }
            legend={p.legend === false ? undefined : legendItems(keys, labels)}
          />
        </Frame>
      )
    }
    return (
      <Frame {...p} empty={rows.length === 0}>
        {draw(rows)}
      </Frame>
    )
  },
  { span: 1, skeleton: splitSkeleton }
)

/** Extra hover rows: column → label, or {label, format, decimals} for a
 *  row in a kit format ("percent" one decimal, "number"); or read off the
 *  data. */
type TipSpec = string | { label: string; format?: Fmt; decimals?: number }
type Tooltip<D, K extends SeriesOf<D>> =
  | Partial<Record<ColOf<D, K>, TipSpec>>
  | ((data: D) => Record<string, TipSpec>)

export type StackedBarsProps<D, K extends SeriesOf<D>> = Common<D> & {
  series: K
  x: ColOf<D, K>
  /** the columns stacked; omit with `metric` to draw the metric */
  y?: Y<D, K>
  metric?: MetricName
  xFormat?: XFormat
  percent?: boolean
  height?: string
  darkFirst?: boolean
  legend?: boolean
  /** the y axis gutter in px, when the default clips a tick ("12 %" wraps) */
  yWidth?: number
  /** series → the column holding its COUNT: on a chart of shares, the hover
   *  prints the count behind each segment */
  counts?: Partial<Record<ColOf<D, K>, ColOf<D, K>>>
  /** the hover's rows instead of the drawn keys: column → label (or
   *  {label, format, decimals}), or read off the data — for a stack that
   *  folds its smallest values into one band while the hover still lists
   *  every value (DESIGN-REPORTS §5) */
  tooltip?: Tooltip<D, K>
  /** a column printed above each bar: the stack's own total */
  total?: ColOf<D, K>
  /** each segment's value printed inside it: `true` for every key, or a list */
  labels?: boolean | readonly ColOf<D, K>[]
  /** decimals of a percent segment label (default 1; PowerBI prints whole %) */
  labelDecimals?: number
  /** rates over the bars on a right-hand % axis (column → label, 0–100),
   *  in the overlay palette (DESIGN-REPORTS §5) */
  lines?:
    | Partial<Record<ColOf<D, K>, string>>
    | ((data: D) => Partial<Record<ColOf<D, K>, string>> | null)
  /** the left axis' domain in the data's units: `[0, 100]`, or an "auto"
   *  end; a split chart rounds an "auto" end out to a nice step */
  yDomain?: readonly [DomainEnd, DomainEnd]
  /** the `lines` axis' domain in % (PowerBI's rate axis is `[0, 100]`) */
  linesDomain?: readonly [DomainEnd, DomainEnd]
  /** point labels on the `lines` overlays: `true` for every line, or a list
   *  (small, muted, `labelDecimals` as a percent) */
  lineLabels?: boolean | readonly ColOf<D, K>[]
  /** the `lines` are rates in % (default) or plain numbers: a count or an
   *  amount beside the bars, compact on its axis */
  linesFormat?: "percent" | "number"
  /** draw the `lines` on their own right-hand axis (default) or on the
   *  bars' axis, for a line in the bars' unit such as a target */
  linesAxis?: "right" | "left"
  /** small multiples: one panel per value of this column, two across (three
   *  on a card wide enough for ~380 px each),
   *  one shared scale per axis and one legend */
  split?: ColOf<D, K>
  /** bars laid over each stage, a little to the right (column → label): a
   *  subset drawn inside its parent stage, in the next ramp shades */
  overlays?: Partial<Record<ColOf<D, K>, string>>
  /** the y axis off linear: "sqrt", "log", or a power exponent (0.7) — for
   *  stages that span orders of magnitude, a funnel */
  scale?: "sqrt" | "log" | number
  /** the chart is the page's period picker: a click on a bar sets the
   *  page's range (`?from=` / `?to=`) to that row's two date columns, and
   *  the bars inside the range are drawn in the emphasis shade */
  pickPeriod?: { from: ColOf<D, K>; to: ColOf<D, K> }
  /** a boolean column: the bars drawn in the emphasis shade (default with
   *  `pickPeriod`: the rows whose dates meet the page's range) */
  highlight?: ColOf<D, K>
  /** a click on a segment sets URL params: series key → {param: value}, a
   *  null value removing the param (a drill-down: the channel and what to
   *  split it by). Read off the data when it depends on the view */
  segmentParams?:
    | Partial<Record<ColOf<D, K>, Record<string, string | null>>>
    | ((data: D) => Record<string, Record<string, string | null>> | null)
}

/** A stack's clicks: the period picker (`pickPeriod`) and the segment
 *  drill (`segmentParams`), as URL changes; and the bars in the emphasis
 *  shade. */
function useStackClicks(
  p: StackedBarsProps<AnyData, string>,
  rows: Row[],
  drawn: Datum[],
  data: unknown,
  filters: ReportFilters
) {
  const [, setSearchParams] = useSearchParams()
  const patch = (values: Record<string, string | null>, replace: boolean) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(values))
          if (v == null) next.delete(k)
          else next.set(k, v)
        return next
      },
      { replace }
    )
  const sel = p.pickPeriod
  // The x as drawn (a formatted label) back to its row.
  const byLabel = new Map(drawn.map((d, i) => [String(d[p.x]), rows[i]]))
  const onSelectX = sel
    ? (label: string) => {
        const r = byLabel.get(label)
        if (!r || r[sel.from] == null || r[sel.to] == null) return
        patch({ from: String(r[sel.from]), to: String(r[sel.to]) }, false)
      }
    : undefined
  const inRange = (r: Row) =>
    p.highlight
      ? Boolean(r[p.highlight])
      : !!sel &&
        !!filters.from &&
        !!filters.to &&
        String(r[sel.from] ?? "") <= filters.to &&
        String(r[sel.to] ?? "") >= filters.from
  const highlightX =
    p.highlight || sel
      ? drawn.filter((_, i) => inRange(rows[i])).map((d) => String(d[p.x]))
      : undefined
  const drill =
    typeof p.segmentParams === "function"
      ? (
          p.segmentParams as (
            d: unknown
          ) => Record<string, Record<string, string | null>> | null
        )(data)
      : (p.segmentParams as
          | Record<string, Record<string, string | null>>
          | undefined)
  const onSelectSeries =
    drill && Object.keys(drill).length
      ? (key: string) => {
          if (drill[key]) patch(drill[key], true)
        }
      : undefined
  return { onSelectX, highlightX, onSelectSeries }
}

function tooltipRows(tooltip: unknown, data: unknown): TipRow[] | undefined {
  if (!tooltip) return undefined
  const spec =
    typeof tooltip === "function"
      ? (tooltip as (d: unknown) => Record<string, TipSpec>)(data)
      : (tooltip as Record<string, TipSpec>)
  // a tooltip read off the data may be empty for a view: the default hover
  if (!spec || typeof spec !== "object" || !Object.keys(spec).length) return undefined
  return Object.entries(spec).map(([key, t]) =>
    typeof t === "string" ? { key, label: t } : { key, ...t }
  )
}

/** What heads a stack's hover. A chart of shares sums to 100, so there the
 *  headline is the column's COUNT total: the sum of the `counts` columns, or
 *  else the `total` column (the component's, or one named "total") when it holds
 *  numbers. Otherwise the stacked keys, as before. */
function headlineKeys(
  p: { percent?: boolean; counts?: unknown; total?: string },
  keys: string[],
  rows: Row[]
): string[] | undefined {
  if (!p.percent) return undefined
  if (p.counts && typeof p.counts === "object") {
    const counts = p.counts as Record<string, string>
    const cols = keys.map((k) => counts[k]).filter(Boolean)
    if (cols.length) return cols
  }
  const numeric = (c: string) =>
    rows.length > 0 &&
    rows.every((r) => r[c] == null || Number.isFinite(Number(r[c]))) &&
    rows.some((r) => r[c] != null && r[c] !== "")
  for (const c of [p.total, "total"])
    if (c && !keys.includes(c) && numeric(c)) return [c]
  return undefined
}

export const StackedBars = defineComponent(
  function StackedBars(p: StackedBarsProps<AnyData, string>) {
    const m = withMetric(p, useSeries(p.series))
    const rows = m.rows
    const { data, filters } = useKitData()
    const { keys, labels } = yKeys(m.y, rows, p.x, data)
    const overlays = p.overlays
      ? Object.entries(p.overlays as Record<string, string>).map(
          ([key, label]) => ({ key, label })
        )
      : undefined
    const clicks = useStackClicks(
      p,
      rows,
      chartRows(rows, p.x, p.xFormat),
      data,
      filters
    )
    // `lines=$view.0.lines`: the lines a view draws, read off the data
    const lineSpec = (
      typeof p.lines === "function"
        ? (p.lines as (d: unknown) => unknown)(data)
        : p.lines
    ) as Record<string, string> | null | undefined
    const lines =
      lineSpec && typeof lineSpec === "object" && Object.keys(lineSpec).length
        ? Object.entries(lineSpec).map(([key, label]) => ({ key, label }))
        : undefined
    const draw = (
      rs: Row[],
      extra: {
        legend?: boolean
        yDomain?: readonly [DomainEnd, DomainEnd]
        yTicks?: number[]
        linesDomain?: readonly [DomainEnd, DomainEnd]
        linesTicks?: number[]
        height?: string
      } = {}
    ) => (
      <StackedBarsChart
        data={chartRows(rs, p.x, p.xFormat)}
        xKey={p.x}
        keys={keys}
        labels={labels}
        percent={m.percent}
        height={p.height}
        darkFirst={p.darkFirst}
        legend={
          p.legend ??
          keys.length + (lines?.length ?? 0) + (overlays?.length ?? 0) > 1
        }
        overlays={overlays}
        scale={p.scale}
        onSelectX={clicks.onSelectX}
        highlightX={clicks.highlightX}
        onSelectSeries={clicks.onSelectSeries}
        yWidth={p.yWidth}
        tooltipCounts={p.counts as Record<string, string> | undefined}
        tooltipRows={tooltipRows(p.tooltip, data)}
        topLabelKey={p.total}
        segmentLabels={keyList(p.labels, keys)}
        labelDecimals={p.labelDecimals}
        headlineKeys={headlineKeys(p, keys, rows)}
        lines={lines}
        lineLabels={keyList(p.lineLabels, lines?.map((l) => l.key) ?? [])}
        yDomain={p.yDomain}
        linesDomain={p.linesDomain}
        linesFormat={p.linesFormat}
        linesAxis={p.linesAxis}
        weekTicks={p.xFormat === "week"}
        {...extra}
      />
    )
    if (p.split) {
      // A blank cell is no value, not 0 (see Line's split above).
      const cell = (r: Row, k: string) =>
        r[k] == null || r[k] === "" ? [] : [Number(r[k])]
      const y: NiceScale = niceScale(
        rows.map((r) => keys.reduce((s, k) => s + (Number(r[k]) || 0), 0)),
        p.yDomain
      )
      const ln: NiceScale | undefined = lines
        ? niceScale(
            rows.flatMap((r) => lines.flatMap((l) => cell(r, l.key))),
            p.linesDomain
          )
        : undefined
      return (
        <Frame {...p} empty={rows.length === 0}>
          <Panels
            panels={splitRows(rows, p.split)}
            draw={(rs) =>
              draw(rs, {
                legend: false,
                yDomain: y.domain,
                yTicks: y.ticks,
                linesDomain: ln?.domain,
                linesTicks: ln?.ticks,
                height: p.height ?? "h-64",
              })
            }
            legend={
              p.legend === false
                ? undefined
                : legendItems(keys, labels, { darkFirst: p.darkFirst, lines })
            }
          />
        </Frame>
      )
    }
    return (
      <Frame {...p} empty={rows.length === 0}>
        {draw(rows)}
      </Frame>
    )
  },
  { span: 1, skeleton: splitSkeleton }
)

export type CategoryBarsProps<D, K extends SeriesOf<D>> = Common<D> & {
  series: K
  x: ColOf<D, K>
  value: ColOf<D, K>
  /** column holding the text printed above each bar */
  label?: ColOf<D, K>
  height?: string
  /** a dashed reference line (DESIGN-REPORTS §7): `{value, label}`, the
   *  value a number or read off the data (`value: $avg`); with a `format`
   *  (and `decimals`) the label also prints the value, "Label: 37.84 %" */
  reference?: Reference<D>
}

type RefLine = {
  value?: number | null
  label?: string
  format?: Fmt
  decimals?: number
}
type Reference<D> = RefLine | ((data: D) => RefLine)

export const CategoryBars = defineComponent(
  function CategoryBars(p: CategoryBarsProps<AnyData, string>) {
    const rows = useSeries(p.series)
    const { data } = useKitData()
    const ref =
      typeof p.reference === "function"
        ? p.reference(data as AnyData)
        : p.reference
    const value = ref?.value == null ? NaN : Number(ref.value)
    // The label reads "Label: value" once a format says how to print the
    // value; without one it is the label as given (pages that wrote the
    // value into it already).
    const shown = ref?.format
      ? fmt(value, { format: ref.format, decimals: ref.decimals })
      : undefined
    const refLabel =
      ref?.label && shown ? `${ref.label}: ${shown}` : (ref?.label ?? shown)
    return (
      <Frame {...p} empty={rows.length === 0}>
        <CategoryBarsChart
          data={rows as Datum[]}
          xKey={p.x}
          valueKey={p.value}
          labelKey={p.label}
          height={p.height}
          reference={
            Number.isFinite(value) ? { value, label: refLabel } : undefined
          }
        />
      </Frame>
    )
  },
  { span: 1, skeleton: chartSkeleton }
)

export type BarsWithLineProps<D, K extends SeriesOf<D>> = Common<D> & {
  series: K
  x: ColOf<D, K>
  bar: ColOf<D, K>
  line: ColOf<D, K>
  labels?: Partial<Record<ColOf<D, K>, string>>
  xFormat?: XFormat
  /** extra hover rows (column → label, or {label, format, decimals}) */
  tooltip?: Tooltip<D, K>
  /** the chart's height class (default h-64): h-72 for ~25 categories */
  height?: string
  /** the line dashed: a run-rate or a projection beside measured bars */
  dashed?: boolean
  /** the line on its own right-hand axis (default) or on the bars' axis */
  lineAxis?: "right" | "left"
  /** the line is a rate in % (default) or a plain number */
  lineFormat?: "percent" | "number"
  legend?: boolean
  /** the bars' axis domain (and the line's, on one axis) */
  yDomain?: readonly [DomainEnd, DomainEnd]
  /** the line's own axis domain */
  lineDomain?: readonly [DomainEnd, DomainEnd]
  /** small multiples: one panel per value of this column, every panel on
   *  the same scales */
  split?: ColOf<D, K>
  /** the line in its own plot under the bars, on one shared x, rather than
   *  on a second axis: each titled by its label (a count and an amount that
   *  are not a rate over a count, DESIGN-REPORTS §2) */
  separate?: boolean
  /** each bar's value printed above it */
  barLabels?: boolean
  /** each point's value printed above it */
  lineLabels?: boolean
}

const numbers = (rows: Row[], k: string) =>
  rows.flatMap((r) => (r[k] == null || r[k] === "" ? [] : [Number(r[k])]))

/** A label column for a bar's value, compact (DESIGN-REPORTS §7). */
const BAR_LABEL = "__barLabel"

export const BarsWithLine = defineComponent(
  function BarsWithLine(p: BarsWithLineProps<AnyData, string>) {
    const rows = useSeries(p.series)
    const { data } = useKitData()
    const labels = p.labels as Record<string, string> | undefined
    const tips = tooltipRows(p.tooltip, data)
    const oneAxis = p.lineAxis === "left"
    // Panels share every scale; one chart takes its own (autoScale).
    const shared = (() => {
      if (!p.split) return undefined
      if (p.separate || !oneAxis) {
        const bar = niceScale(numbers(rows, p.bar), p.yDomain)
        const line = niceScale(numbers(rows, p.line), p.lineDomain)
        if (p.separate) return { bar, line }
        const [a, b] = alignScales(bar, line)
        return { bar: a ?? bar, line: b ?? line }
      }
      return {
        bar: niceScale([...numbers(rows, p.bar), ...numbers(rows, p.line)], p.yDomain),
        line: undefined,
      }
    })()
    const draw = (rs: Row[], panel: boolean) => {
      const d = chartRows(rs, p.x, p.xFormat)
      if (p.separate) {
        const caption = (k: string) => (
          <div className="text-xs text-muted-foreground">{labels?.[k] ?? k}</div>
        )
        return (
          <div className="flex flex-col gap-1">
            {caption(p.bar)}
            <StackedBarsChart
              data={
                p.barLabels
                  ? d.map((r) => ({
                      ...r,
                      [BAR_LABEL]:
                        r[p.bar] == null ? "" : formatCompact(Number(r[p.bar])),
                    }))
                  : d
              }
              xKey={p.x}
              keys={[p.bar]}
              labels={labels}
              legend={false}
              topLabelKey={p.barLabels ? BAR_LABEL : undefined}
              tooltipRows={tips}
              yDomain={shared?.bar.domain ?? p.yDomain}
              yTicks={shared?.bar.ticks}
              weekTicks={p.xFormat === "week"}
              height={p.height ?? "h-44"}
            />
            <div className="pt-3">{caption(p.line)}</div>
            <MultiLine
              data={d}
              xKey={p.x}
              keys={[p.line]}
              labels={labels}
              percent={(p.lineFormat ?? "percent") === "percent"}
              legend={false}
              dashed={p.dashed ? [p.line] : undefined}
              valueLabels={p.lineLabels ? [p.line] : undefined}
              tooltipRows={tips}
              yDomain={shared?.line?.domain ?? p.lineDomain}
              yTicks={shared?.line?.ticks}
              weekTicks={p.xFormat === "week"}
              height={p.height ?? "h-44"}
            />
          </div>
        )
      }
      return (
        <BarsWithLineChart
          data={d}
          xKey={p.x}
          barKey={p.bar}
          lineKey={p.line}
          labels={labels}
          tooltipRows={tips}
          weekTicks={p.xFormat === "week"}
          height={p.height ?? (panel ? "h-64" : undefined)}
          dashed={p.dashed}
          lineAxis={p.lineAxis}
          lineFormat={p.lineFormat}
          legend={panel ? false : p.legend}
          yDomain={shared?.bar.domain ?? p.yDomain}
          yTicks={shared?.bar.ticks}
          lineDomain={shared?.line?.domain ?? p.lineDomain}
          lineTicks={shared?.line?.ticks}
        />
      )
    }
    if (p.split)
      return (
        <Frame {...p} empty={rows.length === 0}>
          <Panels
            panels={splitRows(rows, p.split)}
            draw={(rs) => draw(rs, true)}
            legend={
              p.separate || p.legend === false
                ? undefined
                : legendItems([p.bar, p.line], labels)
            }
          />
        </Frame>
      )
    return (
      <Frame {...p} empty={rows.length === 0}>
        {draw(rows, false)}
      </Frame>
    )
  },
  { span: 1, skeleton: splitSkeleton }
)

export type TreemapProps<D, K extends SeriesOf<D>> = Common<D> & {
  series: K
  name: ColOf<D, K>
  value: ColOf<D, K>
  format?: Fmt
  /** printed after each slice's figure (a unit: " kr") */
  suffix?: string
  /** one map of several groups (the column's values, in order of first
   *  appearance), each in its own tone, all slices on one area scale */
  group?: ColOf<D, K>
  /** a text column: a group's muted line in the legend (its first row's) */
  groupNote?: ColOf<D, K>
  /** each slice's share of the whole map after its figure, "1 234 · 12.3 %" */
  share?: boolean
}

/** A grouped map's tones: the ramp's ends first (two groups read as a pale
 *  and a dark area), then the steps between; the label ink follows the
 *  fill. Tones of the ramp, never a literal colour. */
const GROUP_TONES: { tone: string; ink: "dark" | "light" }[] = [
  { tone: "var(--color-chart-2)", ink: "dark" },
  { tone: "var(--color-chart-5)", ink: "light" },
  { tone: "var(--color-chart-3)", ink: "light" },
  { tone: "var(--color-chart-1)", ink: "dark" },
  { tone: "var(--color-chart-4)", ink: "light" },
]

export const Treemap = defineComponent(
  function Treemap(p: TreemapProps<AnyData, string>) {
    const rows = useSeries(p.series)
    const total = rows.reduce((s, r) => s + (Number(r[p.value]) || 0), 0)
    const print = (n: number) => {
      const v = fmt(n, { format: p.format, suffix: p.suffix })
      return p.share
        ? `${v} · ${total > 0 ? fmt((100 * n) / total, { format: "percent" }) : DASH}`
        : v
    }
    if (p.group) {
      const g = p.group
      const groups = splitRows(rows, g).map((grp, i) => ({
        name: grp.title,
        note: p.groupNote ? grp.rows[0]?.[p.groupNote] : undefined,
        ...GROUP_TONES[i % GROUP_TONES.length],
        children: grp.rows.map((r) => ({
          name: String(r[p.name]),
          value: Number(r[p.value]) || 0,
        })),
      }))
      return (
        <Frame {...p} empty={rows.length === 0}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pb-2 text-sm">
            {groups.map((grp) => (
              <span key={grp.name} className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: grp.tone }}
                />
                <span className="font-medium text-foreground">{grp.name}</span>
                {grp.note != null && grp.note !== "" && (
                  <span className="text-muted-foreground">
                    {String(grp.note)}
                  </span>
                )}
              </span>
            ))}
          </div>
          <GroupedTreemap groups={groups} fmt={print} />
        </Frame>
      )
    }
    const slices = rows.map((r) => ({
      name: String(r[p.name]),
      value: r[p.value] == null ? null : Number(r[p.value]),
    }))
    return (
      <Frame {...p} empty={rows.length === 0}>
        <CategoryTreemap data={slices} fmt={print} />
      </Frame>
    )
  },
  { span: 1, skeleton: chartSkeleton }
)

export type FunnelProps<D, K extends SeriesOf<D>> = Common<D> & {
  series: K
  label: ColOf<D, K>
  value: ColOf<D, K>
}

export const Funnel = defineComponent(
  function Funnel(p: FunnelProps<AnyData, string>) {
    const rows = useSeries(p.series)
    const stages = rows.map((r) => ({
      label: String(r[p.label]),
      value: Number(r[p.value] ?? 0),
    }))
    return (
      <Frame {...p} empty={rows.length === 0}>
        <NestedAreaFunnel stages={stages} />
      </Frame>
    )
  },
  { span: 1, skeleton: chartSkeleton }
)

// ── Tiles ──────────────────────────────────────────────────────────────────

export type Tile<D, K extends keyof D> = FmtSpec & {
  /** default: the metric's label */
  label?: string
  /** the column printed; with `metric` and no value, the metric of the
   *  row's own columns */
  value?: ColOf<D, K>
  /** a named metric: the label and format, and the value when `value` is
   *  omitted */
  metric?: MetricName
  /** a text column: the one line under the figure */
  line?: ColOf<D, K>
  /** a text column: the period the tile covers, set smaller */
  period?: ColOf<D, K>
  /** a numeric column: a signed % change printed beside the figure */
  delta?: ColOf<D, K>
  deltaLabel?: string
  /** the tile opens the `{% drill name="…" %}` of this name */
  drill?: string
} & TargetTile<D, K>

/** The target and status tile: the target after the figure ("/ 2 500", in
 *  the figure's format) and, on the label's row, "On track" in
 *  `text-emerald-600` or "Off track" muted — words, not a chip, like the
 *  delta (product/DESIGN.md → Tokens: the one sanctioned non-grey). */
type TargetTile<D, K extends keyof D> = {
  /** a numeric column: the target */
  target?: ColOf<D, K>
  /** a boolean column: whether the figure is on track (null: no word) */
  status?: ColOf<D, K>
}

export type KpisProps<D, K extends SeriesOf<D>> = {
  series: K
  /** tiles read off the series' first row */
  tiles?: Tile<D, K>[]
  /** or one tile per row, its columns named here */
  each?: FmtSpec &
    TargetTile<D, K> & {
      label: ColOf<D, K>
      value: ColOf<D, K>
      line?: ColOf<D, K>
      period?: ColOf<D, K>
      /** a text column naming each row's format ("number", "percent", …),
       *  for a row of tiles in mixed units */
      formatColumn?: ColOf<D, K>
    } & TrendTile<D, K>
  span?: 1 | 2
  /** the kpis' `{% drill %}` children: a tile opens one (render.tsx) */
  drills?: DrillSpec[]
}

type TileView = {
  /** the row the tile reads, and the drill it opens */
  row?: Row
  drill?: string
  label: string
  value: string
  line?: string
  period?: string
  delta?: number | null
  deltaLabel?: string
  target?: string
  status?: boolean | null
}

function tileViews(p: KpisProps<AnyData, string>, rows: Row[]): TileView[] {
  const text = (r: Row, k?: string) =>
    k && r[k] != null ? String(r[k]) : undefined
  const goal = (
    r: Row,
    t: { target?: string; status?: string },
    f: FmtSpec
  ) => ({
    target: t.target && r[t.target] != null ? fmt(r[t.target], f) : undefined,
    status: t.status && r[t.status] != null ? Boolean(r[t.status]) : null,
  })
  if (p.each) {
    const e = p.each
    return rows.map((r) => {
      const f: FmtSpec = e.formatColumn
        ? { ...e, format: r[e.formatColumn] as Fmt }
        : e
      return {
        row: r,
        label: String(r[e.label]),
        value: fmt(r[e.value], f),
        line: text(r, e.line),
        period: text(r, e.period),
        ...goal(r, e, f),
      }
    })
  }
  const r = rows[0] ?? {}
  return (p.tiles ?? []).map((tile) => {
    const m = tile.metric ? getMetric(tile.metric) : undefined
    const t = { ...tile, format: tile.format ?? m?.format }
    const v =
      t.value != null
        ? r[t.value]
        : m
          ? metricOfRow(m.name as MetricName, r)
          : undefined
    return {
      row: r,
      drill: t.drill,
      label: t.label ?? m?.label ?? "",
      value: fmt(v, t),
      line: text(r, t.line),
      period: text(r, t.period),
      delta: t.delta && r[t.delta] != null ? Number(r[t.delta]) : null,
      deltaLabel: t.deltaLabel,
      ...goal(r, t, t),
    }
  })
}

const TILE_GRID = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
} as const

/** A tile that opens a drill: a real button around the card, its focus
 *  ring on the card's corners; otherwise the card as it is. */
function TileButton({
  on,
  onOpen,
  label,
  children,
}: {
  on: boolean
  onOpen: () => void
  label: string
  children: ReactNode
}) {
  if (!on) return <>{children}</>
  return (
    <button
      type="button"
      title={label}
      onClick={onOpen}
      className="group/tile block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  )
}

function tileCount(p: KpisProps<AnyData, string>, rows: number) {
  return p.each ? rows : (p.tiles?.length ?? 0)
}

/** A row of up to four tiles — the plain tile of product/DESIGN.md → Page
 *  layout (label, figure, one line, the period). */
export const Kpis = defineComponent(
  function Kpis(p: KpisProps<AnyData, string>) {
    const rows = useSeries(p.series)
    const drills = useDrills(p.drills)
    if (p.each?.trend) return <TrendTiles p={p} rows={rows} />
    const tiles = tileViews(p, rows)
    const cols = Math.min(Math.max(tiles.length, 2), 4) as 2 | 3 | 4
    // A tile that opens a drill is a button, whole (DESIGN.md: the count is
    // what the reader wants to open, so the tile is the target).
    const opens = (t: TileView) =>
      t.drill ? drills.has(t.drill) : drills.rows && !!p.each
    const open = (t: TileView) =>
      t.drill ? drills.openNamed(t.drill, t.row, t.label) : t.row && drills.open(t.row)
    return (
      <div className={cn("grid grid-cols-1 gap-4", TILE_GRID[cols])}>
        {drills.dialog}
        {tiles.map((t) => (
          // A tile is a widget card with its label INSIDE, beside its figure:
          // a metric's name belongs with the number, not above the card.
          <TileButton key={t.label} on={opens(t)} onOpen={() => open(t)} label={t.label}>
          <Widget bodyClassName={cn("flex flex-col gap-1 p-4", opens(t) && "transition-colors group-hover/tile:bg-muted/50")}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-muted-foreground">{t.label}</span>
                {t.status != null && (
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      t.status ? "text-emerald-600" : "text-muted-foreground"
                    )}
                  >
                    {t.status ? "On track" : "Off track"}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
                  {t.value}
                </span>
                {t.target != null && (
                  <span className="text-sm font-medium whitespace-nowrap text-muted-foreground tabular-nums">
                    / {t.target}
                  </span>
                )}
                {t.delta != null && (
                  <span
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      t.delta >= 0
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    )}
                  >
                    {t.delta >= 0 ? "+" : ""}
                    {fmt(t.delta, { format: "percent0" })} {t.deltaLabel}
                  </span>
                )}
              </div>
              {t.line && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t.line}
                </span>
              )}
              {t.period && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {t.period}
                </span>
              )}
          </Widget>
          </TileButton>
        ))}
      </div>
    )
  },
  {
    span: 2,
    skeleton: (props) => {
      const p = props as unknown as KpisProps<AnyData, string>
      const n = Math.max(tileCount(p, 4), 1)
      const cols = Math.min(Math.max(n, 2), 4) as 2 | 3 | 4
      return (
        <div className={cn("grid grid-cols-1 gap-4", TILE_GRID[cols])}>
          {Array.from({ length: n }, (_, i) => (
            <Skeleton
              key={i}
              className={cn("rounded-xl", p.each?.trend ? "h-40" : "h-28")}
            />
          ))}
        </div>
      )
    },
  }
)

// ── Tiles with a trend ─────────────────────────────────────────────────────

/** The KPI card of product/DESIGN.md → Page layout: value against a target,
 *  the signed delta, "Target N" and a sparkline (`KpiCard`). A row of the
 *  series becomes one when `each.trend` is set; `target` is then required. */
type TrendTile<D, K extends keyof D> = {
  /** a column holding the trend, `{ value }` points oldest first */
  trend?: ColOf<D, K>
  /** a text column, "up" or "down": which way is good (default up) */
  direction?: ColOf<D, K>
  /** a boolean column: the definition is not validated (the approx badge) */
  approx?: ColOf<D, K>
  /** a text column: the definition, in the card's (i) */
  definition?: ColOf<D, K>
}

function TrendTiles({
  p,
  rows,
}: {
  p: KpisProps<AnyData, string>
  rows: Row[]
}) {
  const e = p.each!
  const cols = Math.min(Math.max(rows.length, 2), 4) as 2 | 3 | 4
  return (
    <div className={cn("grid grid-cols-1 gap-4", TILE_GRID[cols])}>
      {rows.map((r, i) => {
        const format = e.formatColumn ? (r[e.formatColumn] as Fmt) : e.format
        const num = (k?: string) =>
          k && r[k] != null && Number.isFinite(Number(r[k]))
            ? Number(r[k])
            : null
        return (
          <KpiCard
            key={i}
            label={String(r[e.label])}
            kind={
              format === "percent" || format === "percent0" ? "rate" : "count"
            }
            direction={e.direction && r[e.direction] === "down" ? "down" : "up"}
            target={num(e.target) ?? 0}
            validated={!(e.approx && r[e.approx])}
            info={e.definition ? String(r[e.definition] ?? "") : ""}
            value={num(e.value)}
            series={
              (e.trend && Array.isArray(r[e.trend]) ? r[e.trend] : []) as {
                value: number | null
              }[]
            }
          />
        )
      })}
    </div>
  )
}

// ── Tables ─────────────────────────────────────────────────────────────────

export type Column<D, K extends keyof D> = FmtSpec & {
  /** the column printed; with `metric` and no key, the metric of the row's
   *  own columns (a totals row carrying the sums: a ratio of sums) */
  key?: ColOf<D, K>
  /** a named metric: the label and format, and the value when `key` is
   *  omitted */
  metric?: MetricName
  label?: string
  /** a column printed after the value, small and muted (a share) */
  share?: ColOf<D, K>
  shareFormat?: Fmt
  /** a column printed on a second, muted line under the value (a text
   *  column, or a figure with `subFormat`: the count-over-share cell) */
  sub?: ColOf<D, K>
  subFormat?: Fmt
  align?: "left" | "right"
  /** dropped below `lg`, or below `xl` with "xl" (DESIGN.md → Tables:
   *  narrow windows drop columns, they do not squeeze them) */
  wide?: boolean | "xl"
  /** the column's cells set in `font-medium` — a Total column (DESIGN.md →
   *  Tables: a total is `font-medium`, never bold) */
  strong?: boolean
  /** `table` only: the column's width ("7rem", "96px", "12%"). Any width
   *  lays the table out fixed; the columns without one share the rest
   *  equally, so a rate column can be narrower than a 9-digit sum, and two
   *  label columns line up across stacked tables */
  width?: string
  /** the header's definition on hover (DESIGN.md → Tables: HeadTip) */
  note?: string
  /** the few words the column picker shows beside its name */
  short?: string
  /** left out until the reader picks it (`picker`) */
  hidden?: boolean
  /** false: the picker cannot sort by it */
  sortable?: boolean
  /** "muted": a percent's unit printed smaller and muted after the figure,
   *  so the column reads as its figures (Board Updates' rate cells) */
  unit?: "muted"
}

/** A column with its metric's label and format filled in, and how to read
 *  its value off a row. */
function resolveColumn(c: Column<AnyData, string>) {
  if (!c.metric) return c
  const m = getMetric(c.metric)
  return {
    ...c,
    label: c.label ?? m.label,
    format: c.format ?? m.format,
  }
}

const colId = (c: Column<AnyData, string>) => c.key ?? c.metric ?? ""

function cellValue(c: Column<AnyData, string>, r: Row): unknown {
  if (c.key != null) return r[c.key]
  return c.metric ? metricOfRow(c.metric, r) : undefined
}

/** A table whose rows are measures in their own units names each row's
 *  format in a column (`formatColumn`); a column's own format wins. */
function rowFormat(
  c: Column<AnyData, string>,
  r: Row,
  formatColumn?: string
): Column<AnyData, string> {
  if (c.format || !formatColumn || r[formatColumn] == null) return c
  return { ...c, format: String(r[formatColumn]) as Fmt }
}

/** A cell's figure; a percent with `unit: "muted"` prints its unit smaller
 *  and muted after the number. */
function CellValue({ c, v }: { c: Column<AnyData, string>; v: unknown }) {
  const base = (c.format ?? "").replace(/^\+/, "")
  if (
    c.unit === "muted" &&
    typeof v === "number" &&
    Number.isFinite(v) &&
    (base === "percent" || base === "percent0")
  ) {
    // formatPercent's digits, without its unit
    const digits = v.toFixed(base === "percent0" ? 0 : (c.decimals ?? 1))
    const text = `${c.prefix ?? ""}${c.format?.startsWith("+") && v > 0 ? "+" : ""}${digits}`
    return (
      <>
        {text}
        <span className="ml-0.5 text-xs text-muted-foreground">%</span>
      </>
    )
  }
  return <>{fmt(v, c)}</>
}

/** A header cell's label, with its definition on hover when it has one. */
const HeadLabel = ({ c }: { c: Column<AnyData, string> }) => (
  <Term note={c.note}>{c.label ?? ""}</Term>
)

/** The row options `table` and `grouped_table` share. */
type TableRows<D, K extends SeriesOf<D>> = {
  /** a text column naming each row's format ("number", "percent", …) */
  formatColumn?: ColOf<D, K>
  /** a text column: the first cell's definition, on hover */
  note?: ColOf<D, K>
  /** a column: the row is an estimate — a clock after its first cell, the
   *  column's text on hover */
  estimate?: ColOf<D, K>
  /** the first column stays put while the rest scroll sideways */
  sticky?: boolean
  /** a copy glyph: the table as text and HTML on the clipboard */
  copy?: boolean
  /** an .xlsx of the table, a glyph in the header: the file's name stem */
  download?: string
  /** the `{% drill %}` children: a row click opens one (render.tsx) */
  drills?: DrillSpec[]
}

/** The first column, pinned while the rest scroll under it: its own fill
 *  hides them. */
const STICKY = "sticky left-0 z-10 bg-background"

/** The .xlsx's name: the stem, the inputs in force, today. */
function exportName(stem: string, filters: ReportFilters) {
  const parts = [
    stem,
    ...Object.values(filters.params ?? {}).filter(Boolean),
    isoDay(new Date()),
  ]
  return `${parts.join("-").replace(/[^\w.-]+/g, "_")}.xlsx`
}

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** The first cell's extras: its definition on hover, a muted tag, the
 *  estimate clock, and the drill button filling the cell. */
function FirstCell({
  p,
  r,
  children,
  onOpen,
}: {
  p: TableRows<AnyData, string> & { tag?: string }
  r: Row
  children: ReactNode
  onOpen?: () => void
}) {
  const note = p.note && r[p.note] != null ? String(r[p.note]) : undefined
  const est = p.estimate ? r[p.estimate] : undefined
  const body = (
    <>
      <Term note={note}>{children}</Term>
      {p.tag && r[p.tag] ? (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {String(r[p.tag])}
        </span>
      ) : null}
      {est != null && est !== false && est !== "" && (
        <EstimateMark note={typeof est === "string" ? est : undefined} />
      )}
    </>
  )
  return onOpen ? <DrillCell onOpen={onOpen}>{body}</DrillCell> : body
}

export type TableProps<D, K extends SeriesOf<D>> = Omit<
  Common<D>,
  "span" | "title"
> &
  TableRows<D, K> & {
    /** omit inside a titled component (a tab), where the header is already said */
    title?: Text<D>
    series: K
    /** the columns, or read off the data (`columns=$cols`: rows of
     *  `{key, label, format, …}`, a table whose columns are the markets
     *  in scope) */
    columns: Column<D, K>[] | ((data: D) => Column<D, K>[])
    /** a boolean column: the row is a total, set in `font-medium` */
    strong?: ColOf<D, K>
    /** a boolean column: the row is set muted */
    muted?: ColOf<D, K>
    /** a text column: a muted word after the first cell (e.g. "Default") */
    tag?: ColOf<D, K>
    /** the first column's width ("10rem", "18%"): the table is then laid out
     *  fixed, the other columns sharing the rest equally, so tables stacked
     *  on one page with the same columns line up column for column */
    firstWidth?: string
    /** a "Columns" button on the title row: which columns after the first,
     *  in what order (`?cols=`); a string names the params (`?<it>_cols=`) */
    picker?: boolean | string
    /** the picker also sorts the rows by one column (`?sort=`) */
    sort?: boolean
    /** draw the table in a card with a hairline edge (default: none) */
    border?: boolean
    span?: 1 | 2
  }

/** A table's own controls on its title row (DESIGN.md → Tables), or on a
 *  row of their own when the table has no title. */
function TableHeading({
  p,
  extra,
}: {
  p: { title?: Text<never>; description?: Text<never>; info?: ComponentInfoSpec }
  extra?: ReactNode
}) {
  if (p.title != null)
    return (
      <Header title={p.title} description={p.description} info={p.info} extra={extra} />
    )
  return extra ? (
    <div className="flex items-center justify-end gap-2">{extra}</div>
  ) : null
}

/** An open table (product/DESIGN.md → Tables): hairline rows, numbers right,
 *  one font, a total in `font-medium`, no fills, no badges. */
export const Table = defineComponent(
  function Table(p: TableProps<AnyData, string>) {
    const { data, filters } = useKitData()
    const series = useSeries(p.series)
    const all = (
      typeof p.columns === "function"
        ? (p.columns(data as AnyData) ?? [])
        : p.columns
    ).map(resolveColumn)
    // The picker chooses among the columns after the first (the row's name).
    const pickable = all.slice(1)
    const picker = usePicker(
      typeof p.picker === "string" ? p.picker : null,
      pickable.map(colId),
      pickable.filter((c) => !c.hidden).map(colId)
    )
    const columns = p.picker
      ? [
          ...all.slice(0, 1),
          ...picker.selected.map((k) => pickable.find((c) => colId(c) === k)!),
        ]
      : all.filter((c) => !c.hidden)
    // A sorted table keeps its totals at the foot, in their own order.
    const sortBy =
      p.picker && p.sort && picker.sort
        ? columns.find((c) => colId(c) === picker.sort!.key)
        : undefined
    const rows = sortBy
      ? [
          ...sortRows(
            series.filter((r) => !(p.strong && r[p.strong])),
            picker.sort,
            (r) => {
              const v = Number(cellValue(sortBy, r))
              return cellValue(sortBy, r) == null || !Number.isFinite(v) ? null : v
            }
          ),
          ...series.filter((r) => p.strong && r[p.strong]),
        ]
      : series
    const drills = useDrills(p.drills)
    const right = (c: Column<AnyData, string>) => alignsRight(c, rows)
    // `firstWidth` is the first column's `width`; a column's own wins
    const width = (c: Column<AnyData, string>, j: number) =>
      c.width ?? (j === 0 ? p.firstWidth : undefined)
    const fixed = columns.some((c, j) => width(c, j) != null)
    const model = (): ExportModel => ({
      title: (resolveText(p.title as Text<never>, data) as string) ?? "Table",
      lead: 1,
      columns: columns.map((c) => ({ label: c.label ?? "", format: c.format, decimals: c.decimals })),
      rows: rows.map((r) => ({
        cells: columns.map((c) => cellValue(c, r)),
        formats: columns.map((c, j) => (j === 0 ? c : rowFormat(c, r, p.formatColumn)).format),
        strong: !!(p.strong && r[p.strong]),
        estimate: !!(p.estimate && r[p.estimate]),
      })),
    })
    const extra =
      p.copy || p.picker ? (
        <>
          {p.copy && rows.length > 0 && <CopyButton onCopy={() => copyTable(model())} />}
          {p.picker && (
            <ColumnsButton
              options={pickable.map((c) => ({
                key: colId(c),
                label: c.label ?? colId(c),
                short: c.short ?? "",
                sortable: c.sortable,
              }))}
              selected={picker.selected}
              defaults={pickable.filter((c) => !c.hidden).map(colId)}
              onChange={picker.setColumns}
              sort={picker.sort}
              onSortChange={picker.setSort}
              sortable={!!p.sort}
            />
          )}
        </>
      ) : undefined
    const hidden = (c: Column<AnyData, string>) =>
      c.wide && (c.wide === "xl" ? "hidden xl:table-cell" : "hidden lg:table-cell")
    return (
      <TooltipProvider delay={150}>
      <section className="flex flex-col gap-3 py-2">
        <TableHeading p={p as never} extra={extra} />
        {p.download && rows.length > 0 && (
          <DownloadButton
            onDownload={() => downloadXlsx(model(), exportName(p.download!, filters))}
          />
        )}
        {drills.dialog}
        <div data-slot="widget" className={tableCard(p.border)}>
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <UiTable className={fixed ? "table-fixed" : undefined}>
            <TableHeader>
              <TableRow>
                {columns.map((c, j) => (
                  <TableHead
                    key={colId(c)}
                    style={
                      width(c, j) ? { width: width(c, j) } : undefined
                    }
                    className={cn(
                      "whitespace-normal",
                      right(c) && "text-right",
                      hidden(c),
                      j === 0 && p.sticky && STICKY
                    )}
                  >
                    {picker.sort?.key === colId(c) && p.sort && (
                      <SortMark sort={picker.sort} column={colId(c)} />
                    )}
                    <HeadLabel c={c} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow
                  key={i}
                  onClick={drills.rows ? () => drills.open(r) : undefined}
                  className={cn(
                    p.strong && r[p.strong] ? "font-medium" : undefined,
                    p.muted && r[p.muted] ? "text-muted-foreground" : undefined,
                    drills.rows && "cursor-pointer"
                  )}
                >
                  {columns.map((c0, j) => {
                    // the row's format is for its figures, not its name
                    const c = j === 0 ? c0 : rowFormat(c0, r, p.formatColumn)
                    const value = (
                      <>
                        <CellValue c={c} v={cellValue(c, r)} />
                        {c.share && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {fmt(r[c.share], {
                              format: c.shareFormat ?? "percent",
                            })}
                          </span>
                        )}
                      </>
                    )
                    return (
                      <TableCell
                        key={colId(c)}
                        className={cn(
                          right(c0)
                            ? "text-right tabular-nums"
                            : "whitespace-normal",
                          c.sub && "align-top",
                          c.strong && "font-medium",
                          hidden(c),
                          j === 0 && p.sticky && STICKY,
                          j === 0 && drills.rows && "hover:bg-muted/50"
                        )}
                      >
                        {j === 0 ? (
                          <FirstCell
                            p={p}
                            r={r}
                            onOpen={drills.rows ? () => drills.open(r) : undefined}
                          >
                            {value}
                          </FirstCell>
                        ) : (
                          value
                        )}
                        <SubLine c={c} r={r} />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </UiTable>
        )}
        </div>
      </section>
      </TooltipProvider>
    )
  },
  {
    span: 2,
    skeleton: () => (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    ),
  }
)

/** A cell's muted second line (`Column.sub`). */
function SubLine({ c, r }: { c: Column<AnyData, string>; r: Row }) {
  if (!c.sub || r[c.sub] == null) return null
  return (
    <span className="block text-xs font-normal text-muted-foreground">
      {fmt(r[c.sub], { format: c.subFormat ?? "text" })}
    </span>
  )
}

/** Numbers right, text left: by the format, or with none by the first value
 *  the column holds. */
function alignsRight(c: Column<AnyData, string>, rows: Row[]) {
  return (
    (c.align ??
      ((
        c.format
          ? isNumeric(c.format)
          : typeof rows.map((r) => cellValue(c, r)).find((v) => v != null) ===
            "number"
      )
        ? "right"
        : "left")) === "right"
  )
}

// ── Grouped table ──────────────────────────────────────────────────────────

export type ColumnGroup<D, K extends keyof D> = {
  label: string
  columns: Column<D, K>[]
  /** the group's cells in `font-medium` (a Total group) */
  strong?: boolean
  /** the group repeated per value: a list, or read off the data (rows of
   *  `{key, label, strong?}` or plain values), `{key}` and `{label}`
   *  replaced in its label and its columns' keys and labels */
  each?: unknown
}

export type GroupedTableProps<D, K extends SeriesOf<D>> = Omit<
  Common<D>,
  "span"
> &
  TableRows<D, K> & {
    series: K
    /** draw the table in a card with a hairline edge (default: none) */
    border?: boolean
    /** the columns before the groups (the period, the row's name) */
    lead: Column<D, K>[]
    /** the same measures per category, one group each (or read off the
     *  data: `groups=$groups`) */
    groups: ColumnGroup<D, K>[] | ((data: D) => ColumnGroup<D, K>[])
    strong?: ColOf<D, K>
    muted?: ColOf<D, K>
    /** a boolean column: the row goes in the table's foot, under a rule */
    footer?: ColOf<D, K>
    span?: 1 | 2
  }

/** The groups with every `each` spelled out. */
function expandGroups(
  groups: ColumnGroup<AnyData, string>[]
): ColumnGroup<AnyData, string>[] {
  return groups.flatMap((g) => {
    if (g.each == null) return [g]
    type Item = { key: string; label: string; strong?: boolean }
    const items = (Array.isArray(g.each) ? g.each : []).flatMap((x): Item[] => {
      if (x == null) return []
      if (typeof x !== "object") return [{ key: String(x), label: String(x) }]
      const o = x as Record<string, unknown>
      const key = o.key ?? o.value
      // an item's own `strong` (the Total among the markets) wins
      const strong = typeof o.strong === "boolean" ? o.strong : undefined
      return key == null ? [] : [{ key: String(key), label: String(o.label ?? key), strong }]
    })
    return items.map(({ key, label, strong }) => {
      const put = (s: string | undefined) =>
        s?.split("{key}").join(key).split("{label}").join(label)
      return {
        ...g,
        each: undefined,
        strong: strong ?? g.strong,
        label: put(g.label) ?? label,
        columns: g.columns.map((c) => ({
          ...c,
          key: put(c.key),
          share: put(c.share),
          sub: put(c.sub),
          label: put(c.label),
        })),
      }
    })
  })
}

/** The same measures per category in column GROUPS (product/DESIGN.md →
 *  Tables): a first header row naming each group over its columns, a second
 *  with the measures in muted, wrapping `font-normal` text, and a hairline
 *  `border-l` opening each group — nothing between a group's own columns.
 *  Wide by construction, so it is set a step denser than `Table`: `h-8`
 *  headers and `text-xs` cells, the scale's floor. With `sticky` the
 *  columns keep their natural width and the table scrolls sideways under
 *  its first column (the Board Updates exception). */
export const GroupedTable = defineComponent(
  function GroupedTable(p: GroupedTableProps<AnyData, string>) {
    const { data, filters } = useKitData()
    const series = useSeries(p.series)
    const drills = useDrills(p.drills)
    const body = p.footer ? series.filter((r) => !r[p.footer!]) : series
    const foot = p.footer ? series.filter((r) => r[p.footer!]) : []
    // A lead cell (the period, the row's name) keeps to one line: it is
    // short, and a wrapped month doubles every row's height.
    const lead = p.lead.map(resolveColumn)
    const groups = expandGroups(
      typeof p.groups === "function" ? (p.groups(data as AnyData) ?? []) : p.groups
    ).map((g) => ({
      ...g,
      columns: g.columns.map(resolveColumn),
    }))
    const all = [...lead, ...groups.flatMap((g) => g.columns)]
    const model = (): ExportModel => ({
      title: (resolveText(p.title as Text<never>, data) as string) ?? "Table",
      lead: lead.length,
      groups: groups.map((g) => ({ label: g.label, span: g.columns.length })),
      columns: all.map((c) => ({ label: c.label ?? "", format: c.format, decimals: c.decimals })),
      rows: series.map((r) => ({
        cells: all.map((c) => cellValue(c, r)),
        formats: all.map((c, j) => (j < lead.length ? c : rowFormat(c, r, p.formatColumn)).format),
        strong: !!((p.strong && r[p.strong]) || (p.footer && r[p.footer])),
        estimate: !!(p.estimate && r[p.estimate]),
      })),
    })
    const cell = (
      c0: Column<AnyData, string>,
      r: Row,
      open: boolean,
      first: boolean,
      strong?: boolean
    ) => {
      const c = first ? c0 : rowFormat(c0, r, p.formatColumn)
      const value = <CellValue c={c} v={cellValue(c, r)} />
      return (
        <TableCell
          key={colId(c)}
          className={cn(
            alignsRight(c0, series) && "text-right tabular-nums",
            c.sub && "align-top",
            (c.strong || strong) && "font-medium",
            open && "border-l",
            first && p.sticky && STICKY,
            first && drills.rows && "hover:bg-muted/50"
          )}
        >
          {first ? (
            <FirstCell p={p} r={r} onOpen={drills.rows ? () => drills.open(r) : undefined}>
              {value}
            </FirstCell>
          ) : (
            value
          )}
          <SubLine c={c} r={r} />
        </TableCell>
      )
    }
    const row = (r: Row, i: number) => (
      <TableRow
        key={i}
        onClick={drills.rows ? () => drills.open(r) : undefined}
        className={cn(
          p.strong && r[p.strong] ? "font-medium" : undefined,
          p.muted && r[p.muted] ? "text-muted-foreground" : undefined,
          drills.rows && "cursor-pointer"
        )}
      >
        {lead.map((c, j) => cell(c, r, false, j === 0))}
        {groups.flatMap((g) =>
          g.columns.map((c, j) => cell(c, r, j === 0, false, g.strong))
        )}
      </TableRow>
    )
    const natural = p.sticky && "min-w-24 whitespace-nowrap"
    return (
      <TooltipProvider delay={150}>
      <section className="flex flex-col gap-3 py-2">
        <Header title={p.title} description={p.description} info={p.info} />
        {p.download && series.length > 0 && (
          <DownloadButton
            onDownload={() => downloadXlsx(model(), exportName(p.download!, filters))}
          />
        )}
        {drills.dialog}
        <div data-slot="widget" className={tableCard(p.border)}>
        {series.length === 0 ? (
          <Empty />
        ) : (
          <UiTable className="text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className={cn("group/corner h-8", p.sticky && STICKY)}
                  colSpan={lead.length}
                >
                  {p.copy && <CopyButton corner onCopy={() => copyTable(model())} />}
                </TableHead>
                {groups.map((g) => (
                  <TableHead
                    key={g.label}
                    colSpan={g.columns.length}
                    className="h-8 border-l text-center"
                  >
                    {g.label}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow className="hover:bg-transparent">
                {lead.map((c, j) => (
                  <TableHead
                    key={colId(c)}
                    className={cn(
                      "h-8 whitespace-normal",
                      alignsRight(c, series) && "text-right",
                      j === 0 && p.sticky && STICKY
                    )}
                  >
                    <HeadLabel c={c} />
                  </TableHead>
                ))}
                {groups.flatMap((g) =>
                  g.columns.map((c, j) => (
                    <TableHead
                      key={`${g.label}|${colId(c)}`}
                      className={cn(
                        "h-8 font-normal whitespace-normal text-muted-foreground",
                        alignsRight(c, series) && "text-right",
                        j === 0 && "border-l",
                        natural
                      )}
                    >
                      <HeadLabel c={c} />
                    </TableHead>
                  ))
                )}
              </TableRow>
            </TableHeader>
            <TableBody>{body.map(row)}</TableBody>
            {foot.length > 0 && (
              <TableFooter className="border-t-0 bg-transparent [&>tr:first-child>td]:border-t [&>tr:first-child>td]:border-t-foreground/40">
                {foot.map(row)}
              </TableFooter>
            )}
          </UiTable>
        )}
        </div>
      </section>
      </TooltipProvider>
    )
  },
  {
    span: 2,
    skeleton: () => (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-48" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-7" />
        ))}
      </div>
    ),
  }
)

// ── Share bars ─────────────────────────────────────────────────────────────

export type ShareBarsProps<D, K extends SeriesOf<D>> = Common<D> & {
  series: K
  label: ColOf<D, K>
  /** 0–100: the filled part of the bar */
  value: ColOf<D, K>
  /** a text column printed right of the label */
  line?: ColOf<D, K>
}

/** One labelled bar per row: the filled part is `value` %, the track the rest.
 *  The fill is the chart's first colour, as a bar chart's bars. */
export const ShareBars = defineComponent(
  function ShareBars(p: ShareBarsProps<AnyData, string>) {
    const rows = useSeries(p.series)
    return (
      <section className="flex flex-col gap-3 py-2">
        <Header title={p.title} description={p.description} info={p.info} />
        {rows.length === 0 ? (
          <Empty />
        ) : (
          <div data-slot="widget" className="flex flex-col gap-3 pt-1">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between gap-2 text-xs">
                  <span className="font-medium">{String(r[p.label])}</span>
                  {p.line && (
                    <span className="text-muted-foreground tabular-nums">
                      {String(r[p.line] ?? "")}
                    </span>
                  )}
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded bg-muted">
                  <div
                    data-slot="share-bar"
                    className="h-full bg-(--series-1,var(--color-chart-1))"
                    style={{
                      width: `${Math.max(0, Math.min(100, Number(r[p.value] ?? 0)))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    )
  },
  { span: 1, skeleton: () => <Skeleton className="h-48 rounded-xl" /> }
)

// ── Structure ──────────────────────────────────────────────────────────────

export type SectionProps<D> = {
  /** omit for a bare row of components (`columns=3`, no heading) */
  title?: Text<D>
  description?: Text<D>
  info?: ComponentInfoSpec
  /** 3: the span-1 components three across when each gets ~380 px, else two
   *  (the odd last one a whole row), one column below (PowerBI's
   *  three charts side by side); default 2, as on the page */
  columns?: Columns
  children: ReactNode
}

/** A heading over a group of components, laid out like the page (or three
 *  across). */
export const Section = defineComponent(
  function Section(p: SectionProps<unknown>) {
    return (
      <section className="flex flex-col gap-6">
        {p.title != null && <SectionHeading p={p} />}
        <Layout components={p.children} columns={p.columns} />
      </section>
    )
  },
  {
    span: 2,
    skeleton: (props) => {
      const p = props as { title?: unknown; columns?: Columns; children?: ReactNode }
      return (
        <div className="flex flex-col gap-6">
          {p.title != null && <Skeleton className="h-10 w-2/3" />}
          <LayoutSkeleton components={p.children} columns={p.columns} />
        </div>
      )
    },
  }
)

/** A section's title is a Notion heading (20 px semibold, the wiki's
 *  `####`), not a widget title: it names a group of widgets. */
function SectionHeading({ p }: { p: SectionProps<unknown> }) {
  const { data } = useKitData()
  const t = resolveText(p.title as Text<never>, data) ?? ""
  return (
    <div className="flex flex-col gap-1 pt-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl leading-[1.3] font-semibold">{t}</h2>
        {p.info && <ComponentInfo title={t} spec={p.info} />}
      </div>
      {p.description != null && (
        <p className="text-sm text-muted-foreground">
          {resolveText(p.description as Text<never>, data)}
        </p>
      )}
    </div>
  )
}

export type TabsProps<D> = {
  title?: Text<D>
  description?: Text<D>
  info?: ComponentInfoSpec
  /** one tab per group of components; the first is open */
  tabs: { label: string; value?: string; components: ReactNode }[]
  /** the open tab is this report param (`?<param>=<tab value>`), an input
   *  the transforms read: the view the loader used is the view drawn
   *  (DESIGN.md → Tabs: put the tab in the URL when the loader reads it) */
  param?: string
}

/** Switching between groups of components — by GRAIN (product/DESIGN.md → Tabs:
 *  a month and a week table of one measure), not to shorten a page. Underline
 *  tabs, `w-fit` over a hairline, in local state: every tab is a slice of the
 *  same fetch, so a URL tab would buy nothing but a re-fetch per click. */
export const Tabs = defineComponent(
  function Tabs(p: TabsProps<unknown>) {
    const id = (t: TabsProps<unknown>["tabs"][number]) =>
      p.param ? (t.value ?? t.label) : t.label
    const first = p.tabs[0] ? id(p.tabs[0]) : undefined
    const { filters } = useKitData()
    const [, setSearchParams] = useSearchParams()
    const bound = p.param
      ? {
          value: filters.params?.[p.param] ?? first,
          onValueChange: (v: unknown) =>
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev)
                next.set(p.param!, String(v))
                return next
              },
              { replace: true, preventScrollReset: true }
            ),
        }
      : { defaultValue: first }
    return (
      <section className="flex flex-col gap-3">
        {p.title != null && (
          <Header title={p.title} description={p.description} info={p.info} />
        )}
        <UiTabs {...bound}>
          <TabsList variant="line" className="border-b">
            {p.tabs.map((t) => (
              <TabsTrigger key={t.label} value={id(t)}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {p.tabs.map((t) => (
            <TabsContent key={t.label} value={id(t)} className="pt-3">
              <Layout components={t.components} />
            </TabsContent>
          ))}
        </UiTabs>
      </section>
    )
  },
  {
    span: 2,
    skeleton: (props) => {
      const p = props as unknown as TabsProps<unknown>
      return (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-40" />
          <LayoutSkeleton components={p.tabs[0]?.components} />
        </div>
      )
    },
  }
)

export type CustomProps<D> = {
  /** a component written in the report's report.tsx (a report folder holds
   *  no other code), given the page's data and filters */
  component: ComponentType<{ data: D; filters: ReportFilters }>
  span?: 1 | 2
  /** its loading state (default: a chart-sized component) */
  skeleton?: ReactNode
}

/** One visual the kit does not have, drawn by the report's own component. */
export const Custom = defineComponent(
  function Custom(p: CustomProps<unknown>) {
    const { data, filters } = useKitData()
    const C = p.component
    return <C data={data} filters={filters} />
  },
  {
    span: 2,
    skeleton: (props) =>
      (props as { skeleton?: ReactNode }).skeleton ?? chartSkeleton(),
  }
)

// ── The typed set a page receives ──────────────────────────────────────────

type B<P> = (props: P) => ReactNode

/** Every component, with its props bound to the data `D` of one spec: a series
 *  the data does not have, or a column its rows do not have, fails typecheck. */
export type Kit<D> = {
  Line: <K extends SeriesOf<D>>(p: LineProps<D, K>) => ReactNode
  StackedBars: <K extends SeriesOf<D>>(p: StackedBarsProps<D, K>) => ReactNode
  CategoryBars: <K extends SeriesOf<D>>(p: CategoryBarsProps<D, K>) => ReactNode
  BarsWithLine: <K extends SeriesOf<D>>(p: BarsWithLineProps<D, K>) => ReactNode
  Treemap: <K extends SeriesOf<D>>(p: TreemapProps<D, K>) => ReactNode
  Funnel: <K extends SeriesOf<D>>(p: FunnelProps<D, K>) => ReactNode
  Kpis: <K extends SeriesOf<D>>(p: KpisProps<D, K>) => ReactNode
  Table: <K extends SeriesOf<D>>(p: TableProps<D, K>) => ReactNode
  GroupedTable: <K extends SeriesOf<D>>(p: GroupedTableProps<D, K>) => ReactNode
  ShareBars: <K extends SeriesOf<D>>(p: ShareBarsProps<D, K>) => ReactNode
  Waffle: <K extends SeriesOf<D>>(p: WaffleProps<D, K>) => ReactNode
  Progress: <K extends SeriesOf<D>>(p: ProgressProps<D, K>) => ReactNode
  DriverTree: <K extends SeriesOf<D>>(p: DriverTreeComponentProps<D, K>) => ReactNode
  Section: B<SectionProps<D>>
  Tabs: B<TabsProps<D>>
  Custom: B<CustomProps<D>>
  Inputs: B<{ children: ReactNode; span?: 1 | 2 }>
}

export const KIT = {
  Line,
  StackedBars,
  CategoryBars,
  BarsWithLine,
  Treemap,
  Funnel,
  Kpis,
  Table,
  GroupedTable,
  ShareBars,
  Waffle,
  Progress,
  DriverTree,
  Section,
  Tabs,
  Custom,
  Inputs,
}
