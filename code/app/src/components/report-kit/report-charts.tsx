import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  Treemap,
  useYAxisScale,
  XAxis,
  YAxis,
} from "recharts"

import { Widget } from "~/components/report-kit/widget"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { useSyncExternalStore } from "react"
import { scalePow } from "victory-vendor/d3-scale"

import { cn } from "~/lib/utils"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"
import { formatCompact, formatNumber, formatPercent } from "~/lib/format"

import { fmt, type Fmt } from "./format"
import { alignScales, autoScale, cellValues } from "./scale"
import { textWidth, ValueLabels, type LabelGroup } from "./value-labels"

// A chart's series: the theme's tool colours (theme.css --series-*, the
// Power BI, Tableau and Looker styles, in their own colour) where set, else the ramp.
const PALETTE = [
  "var(--series-1, var(--color-chart-1))",
  "var(--series-2, var(--color-chart-2))",
  "var(--series-3, var(--color-chart-3))",
  "var(--series-4, var(--color-chart-4))",
  "var(--series-5, var(--color-chart-5))",
]

/** A bar chart's look from the theme (theme.css): its top corners,
 *  --chart-bar-radius (a style that squares its bars sets 0, else 4 px),
 *  and the gap between categories, --chart-bar-gap (per side: Power BI's 25%, else
 *  Recharts' 10%). Read again when the theme changes (create's preview
 *  swaps theme.css live). */
function useBarStyle() {
  const snapshot = useSyncExternalStore(
    onThemeChange,
    readBarStyle,
    () => "4|10%"
  )
  const [radius, gap] = snapshot.split("|")
  return { radius: Number(radius), gap }
}

function readBarStyle() {
  const css = getComputedStyle(document.documentElement)
  const radius = parseFloat(css.getPropertyValue("--chart-bar-radius"))
  const gap = css.getPropertyValue("--chart-bar-gap").trim()
  return `${Number.isFinite(radius) ? radius : 4}|${gap || "10%"}`
}

function onThemeChange(change: () => void) {
  const observer = new MutationObserver(change)
  observer.observe(document.documentElement, { attributes: true })
  observer.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  })
  return () => observer.disconnect()
}

// Overlay lines only — see product/DESIGN-REPORTS.md §5. Bars stay grey.
const LINE_PALETTE = [
  "var(--color-line-1)",
  "var(--color-line-2)",
  "var(--color-line-3)",
  "var(--color-line-4)",
]

/** The top margin every chart keeps at least: the top y tick is centred on
 *  the plot's top edge, so with no margin half of it ("100 %", "500") was
 *  cut off (kit pass 7, 2026-09-29). */
const TOP = 8

/** Kit lines are straight between points (kit pass 7, 2026-09-29). A
 *  smoothed curve invents dips and humps between categories that no row
 *  holds, and the label layer's line obstacles are straight segments. */
const CURVE = "linear" as const

/** Does an x label read as a period (a date, an ISO week or month, a month
 *  name, a quarter, a number) rather than a category ("Adwords", "Mon")? */
const TEMPORAL =
  /^(\d{4}([-\s/]|$)|\d+([.,/-]\d+)*$|W\d{1,2}\b|Q[1-4]\b|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b)/i

/** An x axis of categories: some label is not a period. Its ticks wrap and
 *  truncate to their band, and a line over it sits in the band centres. */
export const isCategorical = (data: Datum[], xKey: string) =>
  data.length > 0 &&
  data.some((d) => !TEMPORAL.test(String(d[xKey] ?? "").trim()))

export function seriesConfig(
  keys: string[],
  labels?: Record<string, string>
): ChartConfig {
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      { label: labels?.[key] ?? key, color: PALETTE[i % PALETTE.length] },
    ])
  )
}

/** A legend's items as the chart draws them: the ramp in the chart's own
 *  order (reversed with `darkFirst`), then overlay lines in their palette. */
export function legendItems(
  keys: string[],
  labels?: Record<string, string>,
  opts: { darkFirst?: boolean; lines?: { key: string; label: string }[] } = {}
): { key: string; label: string; color: string }[] {
  const order = opts.darkFirst ? [...keys].reverse() : keys
  return [
    ...keys.map((k) => ({
      key: k,
      label: labels?.[k] ?? k,
      color: PALETTE[order.indexOf(k) % PALETTE.length],
    })),
    ...(opts.lines ?? []).map((l, i) => ({
      key: l.key,
      label: l.label,
      color: LINE_PALETTE[i % LINE_PALETTE.length],
    })),
  ]
}

/** One legend for several panels, drawn as ChartLegendContent draws its
 *  items, below them. */
export function SeriesLegend({
  items,
}: {
  items: { key: string; label: string; color: string }[]
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-xs">
      {items.map((it) => (
        <div key={it.key} className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: it.color }}
          />
          {it.label}
        </div>
      ))}
    </div>
  )
}

/** A chart as a Notion dashboard widget: the title and "(i)" above the plot,
 *  which sits open on the page — no card, no edge (widget.tsx). */
export function ChartCard({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  /** Optional control rendered top-right of the header (e.g. an info button). */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Widget
      title={title}
      description={description}
      action={action}
      frame={false}
    >
      {children}
    </Widget>
  )
}

type Datum = Record<string, string | number | null>

/** Hover card for a plain (single-series) bar: the drawn value as the headline,
 *  then a breakdown read off the same row. Recharts hands the whole datum over
 *  in `payload[0].payload`, so the breakdown fields don't have to be drawn as
 *  series to be shown here — which is the point: the bars stay plain. */
function BreakdownTooltip({
  rows,
  keys,
  active,
  payload,
  label,
}: {
  rows: TipRow[]
  /** the stacked keys: the headline is their sum, the column's total (it
   *  was the first payload's value — the bottom band's — until 2026-09-28) */
  keys?: string[]
  active?: boolean
  payload?: { value?: unknown; payload?: Datum }[]
  label?: unknown
}) {
  if (!active || !payload?.length) return null
  const datum = payload[0]?.payload ?? {}
  const total = keys?.length
    ? keys.reduce((s, k) => s + (Number(datum[k]) || 0), 0)
    : Number(payload[0]?.value ?? 0)
  return (
    <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{String(label ?? "")}</span>
        <span className="font-medium tabular-nums">{formatNumber(total)}</span>
      </div>
      <div className="grid gap-1">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-baseline justify-between gap-3"
          >
            <span className="text-muted-foreground">{r.label}</span>
            <span className="tabular-nums">
              {r.format
                ? tipValue(r, datum[r.key])
                : formatNumber(Number(datum[r.key] ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Stacked bar chart — one stacked series per key. `scale` switches the Y axis
 *  off linear: a numeric `scale` is a power exponent (0.5 = √, lower = more
 *  compressed, 1 = linear), "sqrt" == 0.5, and "log" compresses hardest — all
 *  useful when stages span orders of magnitude (e.g. a funnel). `overlays` draw
 *  extra same-width series layered (slightly offset right) over the main bars —
 *  e.g. subsets shown inside their parent stage. They take successive palette
 *  shades, so list them light→dark. */
export function StackedBars({
  data,
  xKey,
  keys,
  labels,
  scale,
  overlays,
  height = "h-64",
  yWidth,
  legend = true,
  tooltipRows,
  onSelectX,
  onSelectSeries,
  highlightX,
  topLabelKey,
  percent = false,
  darkFirst = false,
  tooltipCounts,
  lines,
  seriesOpacity,
  weekTicks,
  segmentLabels,
  labelDecimals = 1,
  headlineKeys,
  yDomain,
  yTicks,
  linesDomain,
  linesTicks,
  lineLabels,
  linesFormat = "percent",
  linesAxis = "right",
}: {
  data: Datum[]
  xKey: string
  keys: string[]
  labels?: Record<string, string>
  scale?: "sqrt" | "log" | number
  overlays?: { key: string; label: string }[]
  height?: string
  /** Show the series legend (default true). Pass false for a single series —
   *  the section title already names it, so the chip is noise. */
  legend?: boolean
  /** Extra fields to list in the hover tooltip, read off the hovered row rather
   *  than drawn as series. Use this to keep the bars plain while hover still
   *  gives the breakdown behind the number. */
  tooltipRows?: TipRow[]
  /** Called with the x value of the clicked column — makes the chart a filter
   *  control. Bars get a pointer cursor when set. */
  onSelectX?: (x: string) => void
  /** Called with the series key of the clicked SEGMENT — the stack's own
   *  drill-down. Takes precedence over onSelectX for clicks on a bar. */
  onSelectSeries?: (key: string) => void
  /** x values to draw in the emphasis shade — the current selection, when the
   *  chart doubles as a control. Everything else recedes. */
  highlightX?: readonly string[]
  /** Field holding a label to print above each stack — the stack's own total,
   *  which the segments can't show. */
  topLabelKey?: string
  /** Format values as percentages on the axis and in the tooltip. */
  percent?: boolean
  /** Run the ramp the other way, so the FIRST key (the bottom of the stack)
   *  takes the darkest of the shades in use. Same tokens, reversed order. */
  darkFirst?: boolean
  /** Series key → the row field holding its COUNT. The hover then prints each
   *  series' count instead of its drawn value — for a chart of shares whose
   *  reader wants the numbers behind them. */
  tooltipCounts?: Record<string, string>
  /** Y-axis gutter in px. The default fits 4 digits; widen it when the axis
   *  reaches 5 (e.g. a stack topping 10 000), or the leading digit is clipped. */
  yWidth?: number
  /** Rates drawn over the bars, on their OWN right-hand axis in % — the only
   *  sanctioned way to put a rate and a count on one chart. */
  lines?: { key: string; label: string }[]
  /** Per-series fill opacity, for a shade the five tokens do not carry. */
  seriesOpacity?: Record<string, number>
  /** x labels are "2026 W30": draw the week over its year */
  weekTicks?: boolean
  /** keys whose segments print their value inside, compact ("8.9k", or
   *  "12.3 %" on a chart of shares); a segment too short for it prints none */
  segmentLabels?: readonly string[]
  /** decimals of a percent segment label (default 1; PowerBI prints whole %) */
  labelDecimals?: number
  /** the columns whose sum heads the hover (default the stacked keys): on a
   *  chart of shares, the counts behind them, so the headline is the column's
   *  count total rather than "100" */
  headlineKeys?: string[]
  /** the left axis' domain on a linear scale: `[0, 100]`, or an "auto" end */
  yDomain?: readonly [number | "auto", number | "auto"]
  /** the left axis' ticks, when panels share one nice scale */
  yTicks?: number[]
  /** the right-hand % axis' domain */
  linesDomain?: readonly [number | "auto", number | "auto"]
  /** the right-hand axis' ticks, for the same reason */
  linesTicks?: number[]
  /** `lines` keys whose points print their rate, small and muted */
  lineLabels?: readonly string[]
  /** what the `lines` are: rates in % (the default), or plain numbers — a
   *  count or an amount beside the bars, compact on its axis ("1.2k") */
  linesFormat?: "percent" | "number"
  /** the axis the `lines` are drawn on: their own on the right (the
   *  default), or the bars' own, for a line in the bars' unit (a target) */
  linesAxis?: "right" | "left"
}) {
  const { radius, gap } = useBarStyle()
  const ov = overlays ?? []
  const lineRate = linesFormat === "percent"
  const lineAxis: "left" | "right" = linesAxis === "left" ? "left" : "right"

  // A numeric scale is a power exponent; "sqrt" is the same as 0.5.
  const powExp =
    typeof scale === "number" ? scale : scale === "sqrt" ? 0.5 : null
  const yScale = powExp != null ? scalePow().exponent(powExp) : "auto"
  const nonLinear = scale != null
  const ln = lines ?? []
  const config = {
    ...seriesConfig(
      darkFirst ? [...keys].reverse() : [...keys, ...ov.map((o) => o.key)],
      {
        ...labels,
        ...Object.fromEntries(ov.map((o) => [o.key, o.label])),
      }
    ),
    // Lines take their own muted palette, one hue each: a rate drawn over the
    // bars has to read as neither of them, and two rates on one chart have to
    // read as two. Four hues, because a fifth line is a second chart.
    ...Object.fromEntries(
      ln.map((l, i) => [
        l.key,
        { label: l.label, color: LINE_PALETTE[i % LINE_PALETTE.length] },
      ])
    ),
  }
  // Every value label on the chart, in priority order: the stack's total,
  // then the segments, then the rates — placed together (value-labels.tsx).
  const stackTop = (r: Datum) =>
    keys.reduce((s, k) => s + (Number(r[k]) || 0), 0)
  // A stack with negative segments is stacked by sign, as PowerBI draws a
  // loss: the positive bands up from zero, the negative ones down from it.
  const signed = data.some((r) => keys.some((k) => Number(r[k]) < 0))
  const stackPos = (r: Datum) =>
    keys.reduce((s, k) => s + Math.max(0, Number(r[k]) || 0), 0)
  const stackNeg = (r: Datum) =>
    keys.reduce((s, k) => s + Math.min(0, Number(r[k]) || 0), 0)
  const stackLabels: LabelGroup[] = [
    ...(topLabelKey
      ? [
          {
            kind: "above" as const,
            axis: "primary" as const,
            at: (r: Datum) =>
              signed && stackTop(r) < 0
                ? stackNeg(r)
                : stackTop(r) > 0
                  ? signed
                    ? stackPos(r)
                    : stackTop(r)
                  : null,
            // a net loss prints its total under the bar
            below: (r: Datum) => signed && stackTop(r) < 0,
            text: (r: Datum) => String(r[topLabelKey] ?? ""),
            className: "fill-foreground tabular-nums",
          },
        ]
      : []),
    ...keys
      .filter((k) => segmentLabels?.includes(k))
      .map((key): LabelGroup => {
        // The ramp is the same in both themes, so the text is too: the
        // darkest shade on the lightest band, the lightest on the rest.
        const shade = darkFirst
          ? keys.length - 1 - keys.indexOf(key)
          : keys.indexOf(key)
        const below = keys.slice(0, keys.indexOf(key))
        return {
          kind: "inside",
          axis: "primary",
          at: () => null,
          band: (r) => {
            const v = Number(r[key])
            if (!Number.isFinite(v) || v === 0) return null
            // stacked by sign: a band sits on the bands of its own sign
            const lo = below.reduce((s, k) => {
              const b = Number(r[k]) || 0
              return s + (!signed || Math.sign(b) === Math.sign(v) ? b : 0)
            }, 0)
            return [lo, lo + v]
          },
          text: (r) => {
            const v = Number(r[key])
            if (!Number.isFinite(v) || v === 0) return ""
            return percent ? formatPercent(v, labelDecimals) : formatCompact(v)
          },
          fill:
            shade % PALETTE.length === 0
              ? "var(--color-chart-5)"
              : "var(--color-chart-1)",
        }
      }),
    ...ln
      .filter((l) => lineLabels?.includes(l.key))
      .map(
        (l): LabelGroup => ({
          kind: "above",
          axis: lineAxis === "left" ? "primary" : "secondary",
          at: (r) =>
            r[l.key] == null || r[l.key] === "" ? null : Number(r[l.key]),
          text: (r) => lineValue(lineRate, labelDecimals)(r[l.key]),
          className: "fill-muted-foreground tabular-nums",
          flip: true,
          line: l.key,
        })
      ),
  ]
  const MAIN = 44
  const OVERLAY_OFFSET = 8
  // Round, even ticks on a linear axis the page gave none (autoScale). The
  // left axis spans the stack tops and any overlay bar; a chart of shares
  // sums to 100, give or take the rounding of its bands, so it ends there.
  const leftScale =
    nonLinear || yTicks
      ? undefined
      : (() => {
          const tops = [
            ...(signed
              ? [...data.map(stackPos), ...data.map(stackNeg)]
              : data.map(stackTop)),
            ...cellValues(
              data,
              ov.map((o) => o.key)
            ),
            ...(lineAxis === "left"
              ? cellValues(
                  data,
                  ln.map((l) => l.key)
                )
              : []),
          ]
          const max = Math.max(0, ...tops)
          const domain =
            yDomain ??
            (percent && signed
              ? [-100, 100]
              : percent && max > 0 && max <= 100.5
                ? [0, 100]
                : undefined)
          return autoScale(tops, domain as typeof yDomain)
        })()
  const rightScale =
    ln.length && lineAxis === "right" && !linesTicks
      ? autoScale(
          cellValues(
            data,
            ln.map((l) => l.key)
          ),
          linesDomain
        )
      : undefined
  const leftDomain = leftScale?.domain ?? yDomain
  const leftTicks = leftScale?.ticks ?? yTicks
  const rightDomain = rightScale?.domain ?? linesDomain
  const rightTicks = rightScale?.ticks ?? linesTicks
  return (
    <ChartContainer
      config={config}
      className={cn(
        `${height} w-full`,
        // Recharts paints a full-height "cursor" rectangle over the hovered
        // category, which sits above the bars and swallows their clicks — so a
        // per-segment click never fires until it is made transparent to events.
        onSelectSeries && "[&_.recharts-tooltip-cursor]:pointer-events-none"
      )}
    >
      {/* Negative barGap lays the overlay series on top of the main bars (same
          width) instead of in side-by-side slots; the residual gap nudges each
          slightly to the right so the bars peek out. */}
      <BarChart
        barCategoryGap={gap}
        data={data}
        margin={{
          left: 4,
          right: 4,
          top: topLabelKey || lineLabels?.length ? 20 : TOP,
        }}
        barGap={ov.length ? -(MAIN - OVERLAY_OFFSET) : 4}
        stackOffset={signed ? "sign" : undefined}
        // Recharts reports the clicked column via activeLabel — the x value.
        onClick={
          onSelectX
            ? (e: { activeLabel?: string | number }) =>
                e?.activeLabel != null && onSelectX(String(e.activeLabel))
            : undefined
        }
        className={onSelectX ? "cursor-pointer" : undefined}
      >
        {/* The grid takes its lines from the left axis's ticks; unnamed, it
            finds no axis and draws only the plot's top and bottom edges. */}
        <CartesianGrid vertical={false} yAxisId="left" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          {...weekAxis(weekTicks)}
        />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          // The gutter has to fit the widest tick, and the old fixed 36px clipped
          // a leading digit once a series passed 10 000 ("16000" rendered as
          // "6000"). Size it from the data instead: ~8px a digit plus padding,
          // and a little extra for the "%" suffix.
          width={
            yWidth ??
            (() => {
              const max = Math.max(
                0,
                ...data.flatMap((d) =>
                  [...keys, ...ov.map((o) => o.key)].map((k) =>
                    Number(d[k] ?? 0)
                  )
                )
              )
              // a negative axis end ("-100 %", "-2.5M") needs its sign too
              const min = leftDomain?.[0]
              const negative = signed || (typeof min === "number" && min < 0)
              const digits = String(Math.round(max)).length + (negative ? 1 : 0)
              return Math.min(
                64,
                Math.max(36, digits * 8 + 12 + (percent ? 12 : 0))
              )
            })()
          }
          scale={scale === "log" ? "log" : yScale}
          // power scales anchor at 0 (bars keep their proportions, just
          // compressed); log can't include 0, so floor it at the power of ten
          // below the smallest value.
          domain={
            scale === "log"
              ? [
                  (min: number) =>
                    Math.pow(10, Math.floor(Math.log10(Math.max(min, 1)))),
                  "auto",
                ]
              : powExp != null
                ? [0, "auto"]
                : leftDomain
                  ? [...leftDomain]
                  : undefined
          }
          ticks={nonLinear ? undefined : leftTicks}
          interval={!nonLinear && leftTicks ? 0 : undefined}
          allowDataOverflow={scale === "log"}
          tickFormatter={
            percent ? (v) => `${v}\u00a0%` : (v) => formatCompact(Number(v))
          }
        />
        {ln.length > 0 && lineAxis === "right" && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={
              lineRate ? (v) => `${v}\u00a0%` : (v) => formatCompact(Number(v))
            }
            domain={rightDomain ? [...rightDomain] : undefined}
            ticks={rightTicks}
            interval={rightTicks ? 0 : undefined}
          />
        )}
        <ChartTooltip
          content={
            tooltipRows ? (
              <BreakdownTooltip
                rows={tooltipRows}
                keys={headlineKeys ?? keys}
              />
            ) : (
              <ChartTooltipContent
                formatter={
                  tooltipCounts
                    ? (_value, name, item) => (
                        <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                          <span className="text-muted-foreground">
                            {labels?.[String(name)] ?? name}
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatNumber(
                              Number(
                                (item?.payload as Datum | undefined)?.[
                                  tooltipCounts[String(name)] ?? ""
                                ] ?? 0
                              )
                            )}
                          </span>
                        </div>
                      )
                    : percent || ln.length
                      ? (value, name) => {
                          // A line is a rate whatever the bars are, so the
                          // suffix follows the SERIES, not the chart.
                          const isLine = ln.some((l) => l.key === String(name))
                          const rate = isLine ? lineRate : percent
                          return (
                            <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                              <span className="text-muted-foreground">
                                {labels?.[String(name)] ??
                                  ln.find((l) => l.key === String(name))
                                    ?.label ??
                                  name}
                              </span>
                              <span className="font-medium tabular-nums">
                                {rate
                                  ? `${Number(value).toFixed(1)} %`
                                  : formatNumber(Number(value))}
                              </span>
                            </div>
                          )
                        }
                      : undefined
                }
              />
            )
          }
        />
        {legend && (
          <ChartLegend
            content={<ChartLegendContent className="flex-wrap gap-y-1" />}
          />
        )}
        {keys.map((key) => (
          <Bar
            key={key}
            yAxisId="left"
            dataKey={key}
            stackId="a"
            fill={`var(--color-${key})`}
            fillOpacity={seriesOpacity?.[key]}
            barSize={ov.length ? MAIN : undefined}
            radius={key === keys[keys.length - 1] ? [radius, radius, 0, 0] : 0}
            isAnimationActive={false}
            onClick={onSelectSeries ? () => onSelectSeries(key) : undefined}
            className={onSelectSeries ? "cursor-pointer" : undefined}
          >
            {highlightX &&
              data.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    highlightX.includes(String(d[xKey]))
                      ? "var(--color-chart-4)"
                      : `var(--color-${key})`
                  }
                />
              ))}
          </Bar>
        ))}
        {ov.map((o) => (
          <Bar
            key={o.key}
            yAxisId="left"
            dataKey={o.key}
            fill={`var(--color-${o.key})`}
            fillOpacity={0.9}
            barSize={MAIN}
            radius={[radius, radius, 0, 0]}
            isAnimationActive={false}
          />
        ))}
        {ln.map((l) => (
          <Line
            key={l.key}
            yAxisId={lineAxis}
            dataKey={l.key}
            type={CURVE}
            stroke={`var(--color-${l.key})`}
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        ))}
        <ValueLabels
          data={data}
          xKey={xKey}
          primary="left"
          secondary="right"
          groups={stackLabels}
          lines={ln.map((l) => ({
            key: l.key,
            axis:
              lineAxis === "left"
                ? ("primary" as const)
                : ("secondary" as const),
            at: (r: Datum) =>
              r[l.key] == null || r[l.key] === "" ? null : Number(r[l.key]),
          }))}
        />
      </BarChart>
    </ChartContainer>
  )
}

/** Vertical single-series bar chart over categories: bars stand up, categories
 *  read left to right. One series, so there's no legend (the section title names
 *  the measure) and no Y axis — every bar carries its own label instead, which
 *  can be a formatted string (`labelKey`) rather than the raw number. */
export function CategoryBars({
  data,
  xKey,
  valueKey,
  labelKey,
  height = "h-52",
  reference,
}: {
  data: Datum[]
  xKey: string
  valueKey: string
  /** Field holding the text to print above each bar; defaults to the value. */
  labelKey?: string
  height?: string
  /** a dashed reference line across the bars (DESIGN-REPORTS §7: hairline,
   *  dashed, muted, labelled once at the end) — PowerBI's "Average
   *  (excluding selected)" */
  reference?: { value: number; label?: string }
}) {
  const { radius, gap } = useBarStyle()
  const ref =
    reference && Number.isFinite(reference.value) ? reference : undefined
  // The reference label takes its own strip above the plot, so it never
  // meets a bar's value label (which sits in the 20 px above the tallest bar).
  const top = ref?.label ? 20 + REF_STRIP : 20
  return (
    <ChartContainer
      config={seriesConfig([valueKey])}
      className={`${height} aspect-auto w-full`}
    >
      <BarChart
        data={data}
        margin={{ left: 4, right: 4, top }}
        barCategoryGap={gap}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          {...categoryAxis(data, xKey)}
        />
        {/* the hidden axis still sets the scale: it has to reach the line */}
        <YAxis
          hide
          domain={
            ref
              ? [0, (dataMax: number) => Math.max(dataMax, ref.value)]
              : undefined
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {ref && (
          <ReferenceLine
            y={ref.value}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1}
            ifOverflow="extendDomain"
            label={ref.label ? <RefLabel text={ref.label} /> : undefined}
          />
        )}
        <Bar
          dataKey={valueKey}
          fill={`var(--color-${valueKey})`}
          radius={[radius, radius, 0, 0]}
          // Wide enough that a "count · share" label fits on one line: Recharts
          // wraps a bar label to the bar's own width.
          maxBarSize={104}
          isAnimationActive={false}
        >
          <LabelList
            dataKey={labelKey ?? valueKey}
            content={<BarTopLabel reference={ref?.value} />}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** A category bar's value label, above the bar. One that would sit on the
 *  reference line moves up to stand clear above it ("36.38 %" on a 37.99 %
 *  average, kit pass 7, 2026-09-29), and every label is on a plate in
 *  `--card`, so the dashed line never runs through digits. */
function BarTopLabel(props: {
  x?: number | string
  y?: number | string
  width?: number | string
  value?: unknown
  reference?: number
}) {
  const yScale = useYAxisScale()
  if (props.value == null || props.value === "") return null
  const t = String(props.value)
  const cx = Number(props.x ?? 0) + Number(props.width ?? 0) / 2
  let base = Number(props.y ?? 0) - 6
  const refY =
    props.reference != null && yScale ? Number(yScale(props.reference)) : NaN
  // the text spans base-10 … base+3; clear the line by 3 px
  if (Number.isFinite(refY) && base - 10 < refY + 3 && base + 3 > refY - 3)
    base = refY - 6
  const w = textWidth(t, 11)
  return (
    <g>
      <rect
        x={cx - w / 2 - 3}
        y={base - 10}
        width={w + 6}
        height={13}
        rx={2}
        fill="var(--card)"
      />
      <text
        x={cx}
        y={base}
        textAnchor="middle"
        fontSize={11}
        className="fill-foreground"
      >
        {t}
      </text>
    </g>
  )
}

/** The height of the strip above category bars that holds the reference
 *  line's label. */
const REF_STRIP = 18

/** A reference line's label, drawn once at the top right of the plot area
 *  (in the strip above it, clear of every bar and value label) with a short
 *  dashed stroke after it that says which line it names — PowerBI's
 *  "Average (excluding selected): 37.84 %". Recharts hands it the line's
 *  `viewBox`: the plot's left edge and width at the line's height. */
function RefLabel(props: {
  text: string
  viewBox?: { x?: number; width?: number }
}) {
  const right =
    Number(props.viewBox?.x ?? 0) + Number(props.viewBox?.width ?? 0)
  // the baseline of the strip above the plot (the chart's top margin)
  const y = 12
  return (
    <g>
      <text
        x={right - 22}
        y={y}
        textAnchor="end"
        fontSize={11}
        className="fill-muted-foreground"
      >
        {props.text}
      </text>
      <line
        x1={right - 16}
        x2={right}
        y1={y - 4}
        y2={y - 4}
        stroke="var(--muted-foreground)"
        strokeDasharray="4 4"
        strokeWidth={1}
      />
    </g>
  )
}

/** At most two lines, each within `max` px: words fill the first line, the
 *  rest goes on the second, and what still does not fit (on either line) is
 *  cut with an ellipsis. A word is never broken. */
export function tickLines(
  label: string,
  max: number,
  width: (t: string) => number = textWidth
): string[] {
  if (width(label) <= max) return [label]
  const cut = (t: string) => {
    if (width(t) <= max) return t
    let n = t.length
    while (n > 1 && width(`${t.slice(0, n).trimEnd()}…`) > max) n--
    return `${t.slice(0, n).trimEnd()}…`
  }
  const words = label.split(/\s+/)
  let first = words[0]
  let i = 1
  while (i < words.length && width(`${first} ${words[i]}`) <= max)
    first = `${first} ${words[i++]}`
  const rest = words.slice(i).join(" ")
  return rest ? [cut(first), cut(rest)] : [cut(first)]
}

/** A category tick: the label on one line when it fits its band, else on
 *  two, else cut with the full text as a hover title. Recharts passes the
 *  axis width and the tick count, so a band is their quotient. */
function CategoryTick(props: {
  x?: number | string
  y?: number | string
  width?: number | string
  visibleTicksCount?: number
  payload?: { value?: unknown }
}) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const v = String(props.payload?.value ?? "")
  const band =
    Number(props.width ?? 0) / Math.max(1, props.visibleTicksCount ?? 1)
  const lines = tickLines(v, band - 6)
  const cut = lines.join(" ") !== v
  return (
    <text
      x={x}
      y={y}
      dy={12}
      textAnchor="middle"
      fontSize={12}
      className="fill-muted-foreground"
    >
      {cut && <title>{v}</title>}
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 13}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

/** An x tick for `"2026 W30"` labels (`xFormat="week"`): the week over its
 *  year, the year muted — PowerBI prints "2026 W30" on one line, which a
 *  thinned axis cannot fit. Any other label draws on one line as before. */
function WeekTick(props: {
  x?: number | string
  y?: number | string
  payload?: { value?: unknown }
}) {
  const x = Number(props.x ?? 0)
  const y = Number(props.y ?? 0)
  const v = String(props.payload?.value ?? "")
  const m = /^(\d{4}) (W\d{2})$/.exec(v)
  return (
    <text x={x} y={y} dy={12} textAnchor="middle" fontSize={12}>
      <tspan x={x} className="fill-muted-foreground">
        {m ? m[2] : v}
      </tspan>
      {m && (
        <tspan x={x} dy={13} fontSize={11} className="fill-muted-foreground/70">
          {m[1]}
        </tspan>
      )}
    </text>
  )
}

/** The XAxis props a category axis needs: every category keeps its label,
 *  wrapped to two lines and then cut with the full text on hover, inside
 *  its own band, so the first and last never reach a y axis
 *  (DESIGN-REPORTS §7: never rotated or thinned). */
const categoryAxis = (data: Datum[], xKey: string) => ({
  interval: 0 as const,
  tickMargin: 6,
  tick: <CategoryTick />,
  height: data.some((d) => String(d[xKey] ?? "").length > 8) ? 40 : 30,
})

/** The XAxis props a two-line week axis needs. */
const weekAxis = (on?: boolean) =>
  on
    ? {
        tick: <WeekTick />,
        // Recharts sizes a tick by its formatted text: "W30" is what the
        // widest line of WeekTick draws, so every week that fits gets a label
        // (with the raw "2026 W30" it thinned to every other week).
        tickFormatter: (v: unknown) => String(v).replace(/^\d{4} /, ""),
        height: 40,
        // Recharts measures "W30"; 8 px keeps neighbouring weeks apart.
        minTickGap: 8,
        interval: "preserveStartEnd" as const,
      }
    : {}

/** A y value as a line prints it: a rate "12.3 %" (`decimals`, default 1),
 *  a count compact. */
const lineValue =
  (percent?: boolean, decimals = 1) =>
  (v: unknown) =>
    v == null || v === "" || !Number.isFinite(Number(v))
      ? ""
      : percent
        ? formatPercent(Number(v), decimals)
        : formatCompact(Number(v), decimals)

/** One extra hover row: a column read off the hovered row, its label and,
 *  optionally, its kit format (a rate "12.3 %", a count "1 234"). */
export type TipRow = {
  key: string
  label: string
  format?: Fmt
  decimals?: number
}

/** An extra row's value: in its format when it names one, else a number as
 *  a count and text as it is. */
function tipValue(r: TipRow, v: unknown): string {
  if (r.format) return fmt(v, { format: r.format, decimals: r.decimals })
  if (v == null || v === "") return "–"
  return typeof v === "number" ? formatNumber(v) : String(v)
}

/** Hover card for a line (or a bar with a line) with extra rows: the drawn
 *  series in their format, then the columns behind them read off the hovered
 *  row (the counts behind a rate), muted. */
function SeriesTooltip({
  rows,
  value,
  labels,
  active,
  payload,
  label,
}: {
  rows: TipRow[]
  /** a drawn series' value as printed */
  value: (key: string, v: number) => string
  labels?: Record<string, string>
  active?: boolean
  payload?: {
    value?: unknown
    dataKey?: unknown
    color?: string
    /** "none": a series with no hover row (a faint line) */
    type?: string
    payload?: Datum
  }[]
  label?: unknown
}) {
  if (!active || !payload?.length) return null
  const datum = payload[0]?.payload ?? {}
  payload = payload.filter((p) => p.type !== "none")
  return (
    <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-medium">{String(label ?? "")}</span>
      <div className="grid gap-1">
        {payload.map((p) => {
          const key = String(p.dataKey ?? "")
          return (
            <div key={key} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ background: p.color }}
              />
              <span className="flex flex-1 items-baseline justify-between gap-3">
                <span className="text-muted-foreground">
                  {labels?.[key] ?? key}
                </span>
                <span className="font-medium tabular-nums">
                  {p.value == null ? "–" : value(key, Number(p.value))}
                </span>
              </span>
            </div>
          )
        })}
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-baseline justify-between gap-3 pl-4.5"
          >
            <span className="text-muted-foreground">{r.label}</span>
            <span className="tabular-nums">{tipValue(r, datum[r.key])}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Multi-line chart. Y ticks are compact ("1.2k", DESIGN-REPORTS §7); the
 *  full number is in the tooltip. */
export function MultiLine({
  data,
  xKey,
  keys,
  labels,
  percent,
  target,
  targetLabel = "Target",
  legend = true,
  dashed,
  yWidth = 40,
  yDomain,
  yTicks,
  valueLabels,
  labelDecimals,
  tooltipRows,
  weekTicks,
  height = "h-64",
  band,
  focus,
  xLabel,
}: {
  data: Datum[]
  xKey: string
  keys: string[]
  labels?: Record<string, string>
  percent?: boolean
  height?: string
  /** the one key drawn in full (`--chart-5`, 2.5 px); every other key is a
   *  faint 1.5 px line in `--chart-1` with no hover row — a spaghetti of
   *  cohorts under their pooled line, where the shape is the message */
  focus?: string
  /** a muted caption under the x axis ("months after signing") */
  xLabel?: string
  /** points in the centres of category bands, as a bar chart's columns,
   *  and category ticks (wrapped, then cut): the default when the x labels
   *  are categories, not periods (`isCategorical`) */
  band?: boolean
  /** keys drawn dashed: a projected or modelled series beside the actual */
  dashed?: readonly string[]
  /** optional horizontal reference line, e.g. a KPI target */
  target?: number
  targetLabel?: string
  /** Show the series legend (default true). Pass false for a single series —
   *  the card title already names it, so the chip is noise (DESIGN-REPORTS §7).
   *  Same rationale, and same default, as StackedBars. */
  legend?: boolean
  /** Y-axis gutter in px (default 40). */
  yWidth?: number
  /** The y domain, in the data's units (a percent line is 0–100): each end a
   *  number or "auto" — `[0, 100]` a fixed rate axis, `["auto", "auto"]` an
   *  axis that need not start at zero (a line may, DESIGN-REPORTS §2).
   *  Overrides the target's domain. */
  yDomain?: readonly [number | "auto", number | "auto"]
  /** the y ticks, when panels share one nice scale */
  yTicks?: number[]
  /** keys whose points carry their value, small and muted, in the series'
   *  format ("12.3 %", "1.2k") */
  valueLabels?: readonly string[]
  /** decimals of a percent value label (default 1; PowerBI prints whole %) */
  labelDecimals?: number
  /** extra hover rows read off the row (column → label, format): the counts
   *  behind a rate */
  tooltipRows?: TipRow[]
  /** x labels are "2026 W30": draw the week over its year */
  weekTicks?: boolean
}) {
  const config: ChartConfig =
    focus != null
      ? {
          ...seriesConfig(keys, labels),
          ...Object.fromEntries(
            keys.map((k) => [
              k,
              {
                label: labels?.[k] ?? k,
                color:
                  k === focus ? "var(--color-chart-5)" : "var(--color-chart-1)",
              },
            ])
          ),
        }
      : seriesConfig(keys, labels)
  const pointLabel = lineValue(percent, labelDecimals)
  const pointLabels: LabelGroup[] = keys
    .filter((k) => valueLabels?.includes(k))
    .map((key) => ({
      kind: "above",
      axis: "primary",
      at: (r) => (r[key] == null || r[key] === "" ? null : Number(r[key])),
      text: (r) => pointLabel(r[key]),
      className: "fill-muted-foreground tabular-nums",
      flip: true,
      line: key,
    }))
  // Round, even ticks when the page gave none (autoScale); the target is
  // part of what the axis has to reach.
  const scale = yTicks
    ? undefined
    : autoScale(
        [...cellValues(data, keys), ...(target != null ? [target] : [])],
        yDomain
      )
  const domain = scale?.domain ?? yDomain
  const ticks = scale?.ticks ?? yTicks
  // A line over categories (weekdays, sources) sits in band centres, so its
  // first point and tick clear the y gutter ("Mon" touched "0") and its
  // points stand over the columns of a bar chart drawn above it.
  const banded = band ?? (!weekTicks && isCategorical(data, xKey))
  return (
    <ChartContainer config={config} className={`${height} w-full`}>
      <LineChart
        data={data}
        margin={{
          left: 4,
          // banded, the end labels sit inside their band; 4 px, as a bar
          // chart's, keeps the points over the columns of one drawn above
          right: banded ? 4 : valueLabels?.length ? 16 : 8,
          top: valueLabels?.length ? 16 : TOP,
          bottom: xLabel ? 16 : undefined,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          {...(banded ? categoryAxis(data, xKey) : {})}
          {...(banded ? { scale: "band" as const } : {})}
          {...weekAxis(weekTicks)}
          label={
            xLabel
              ? {
                  value: xLabel,
                  position: "insideBottom",
                  offset: -12,
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                }
              : undefined
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={yWidth}
          tickFormatter={
            percent ? (v) => `${v}%` : (v) => formatCompact(Number(v))
          }
          domain={
            domain
              ? [...domain]
              : target != null
                ? [
                    0,
                    (dataMax: number) =>
                      Math.ceil(Math.max(dataMax, target) * 1.05),
                  ]
                : undefined
          }
          ticks={ticks}
          interval={ticks ? 0 : undefined}
        />
        <ChartTooltip
          content={
            tooltipRows?.length || focus != null ? (
              <SeriesTooltip
                rows={tooltipRows ?? []}
                value={(_k, v) =>
                  percent ? formatPercent(v, 1) : formatNumber(v)
                }
                labels={labels}
              />
            ) : (
              <ChartTooltipContent />
            )
          }
        />
        {legend && (
          <ChartLegend
            content={<ChartLegendContent className="flex-wrap gap-y-1" />}
          />
        )}
        {target != null && (
          <ReferenceLine
            y={target}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: `${targetLabel} ${percent ? `${target}%` : target}`,
              position: "insideTopRight",
              fill: "var(--muted-foreground)",
              fontSize: 11,
            }}
          />
        )}
        {/* the faint keys first, so the focus line is drawn over them */}
        {(focus != null
          ? [
              ...keys.filter((k) => k !== focus),
              ...keys.filter((k) => k === focus),
            ]
          : keys
        ).map((key) => {
          const faint = focus != null && key !== focus
          return (
            <Line
              key={key}
              dataKey={key}
              type={CURVE}
              stroke={`var(--color-${key})`}
              strokeWidth={faint ? 1.5 : focus != null ? 2.5 : 2}
              strokeDasharray={dashed?.includes(key) ? "5 4" : undefined}
              dot={false}
              activeDot={faint ? false : undefined}
              tooltipType={faint ? "none" : undefined}
              connectNulls
              isAnimationActive={false}
            />
          )
        })}
        <ValueLabels
          data={data}
          xKey={xKey}
          groups={pointLabels}
          lines={keys.map((key) => ({
            key,
            axis: "primary" as const,
            at: (r: Datum) =>
              r[key] == null || r[key] === "" ? null : Number(r[key]),
          }))}
        />
      </LineChart>
    </ChartContainer>
  )
}

/** Bars for a count series with an overlaid percentage line on a second axis. */
export function BarsWithLine({
  data,
  xKey,
  barKey,
  lineKey,
  labels,
  tooltipRows,
  weekTicks,
  height = "h-64",
  categories,
  dashed,
  lineAxis = "right",
  lineFormat = "percent",
  legend = true,
  yDomain,
  yTicks,
  lineDomain,
  lineTicks,
}: {
  data: Datum[]
  xKey: string
  barKey: string
  lineKey: string
  labels?: Record<string, string>
  /** extra hover rows read off the row (column → label, format) */
  tooltipRows?: TipRow[]
  /** x labels are "2026 W30": draw the week over its year */
  weekTicks?: boolean
  height?: string
  /** category ticks (wrapped, then cut to their band): the default when
   *  the x labels are categories, not periods (`isCategorical`) */
  categories?: boolean
  /** the line dashed (`5 4`): a run-rate, a projection — a modelled series
   *  beside the measured bars (DESIGN-REPORTS §7) */
  dashed?: boolean
  /** the line on its own right-hand axis (default) or on the bars' axis, for
   *  a line in the bars' unit (the run-rate a budget needs) */
  lineAxis?: "right" | "left"
  /** the line is a rate in % (default) or a plain number */
  lineFormat?: "percent" | "number"
  legend?: boolean
  /** fixed scales, when panels share them (`split=`) */
  yDomain?: readonly [number | "auto", number | "auto"]
  yTicks?: number[]
  lineDomain?: readonly [number | "auto", number | "auto"]
  lineTicks?: number[]
}) {
  const { radius, gap } = useBarStyle()
  const config = seriesConfig([barKey, lineKey], labels)
  const oneAxis = lineAxis === "left"
  const lineRate = lineFormat === "percent"
  // Round, even ticks on both axes (autoScale); on one axis, one scale over
  // both series.
  const [left, right] = oneAxis
    ? [
        yTicks && yDomain
          ? { domain: [...yDomain] as [number, number], ticks: yTicks }
          : autoScale(cellValues(data, [barKey, lineKey]), yDomain),
        undefined,
      ]
    : yTicks && yDomain && lineTicks && lineDomain
      ? [
          { domain: [...yDomain] as [number, number], ticks: yTicks },
          { domain: [...lineDomain] as [number, number], ticks: lineTicks },
        ]
      : alignScales(
          autoScale(cellValues(data, [barKey]), yDomain),
          autoScale(cellValues(data, [lineKey]), lineDomain)
        )
  const cats = categories ?? (!weekTicks && isCategorical(data, xKey))
  return (
    <ChartContainer config={config} className={`${height} w-full`}>
      <BarChart
        data={data}
        margin={{ left: 4, right: 8, top: TOP }}
        barCategoryGap={gap}
      >
        {/* The grid takes its lines from the left axis's ticks; unnamed, it
            finds no axis and draws only the plot's top and bottom edges. */}
        <CartesianGrid vertical={false} yAxisId="left" />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          {...(cats ? categoryAxis(data, xKey) : {})}
          {...weekAxis(weekTicks)}
        />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v) => formatCompact(Number(v))}
          domain={left?.domain}
          ticks={left?.ticks}
          interval={left ? 0 : undefined}
        />
        {!oneAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={
              lineRate ? (v) => `${v}%` : (v) => formatCompact(Number(v))
            }
            domain={right?.domain}
            ticks={right?.ticks}
            interval={right ? 0 : undefined}
          />
        )}
        <ChartTooltip
          content={
            tooltipRows?.length || !lineRate ? (
              <SeriesTooltip
                rows={tooltipRows ?? []}
                value={(k, v) =>
                  k === lineKey && lineRate
                    ? formatPercent(v, 1)
                    : formatNumber(v)
                }
                labels={labels}
              />
            ) : (
              <ChartTooltipContent />
            )
          }
        />
        {legend && (
          <ChartLegend
            content={<ChartLegendContent className="flex-wrap gap-y-1" />}
          />
        )}
        <Bar
          yAxisId="left"
          dataKey={barKey}
          fill={`var(--color-${barKey})`}
          radius={[radius, radius, 0, 0]}
          fillOpacity={0.35}
          isAnimationActive={false}
        />
        <Line
          yAxisId={oneAxis ? "left" : "right"}
          dataKey={lineKey}
          type={CURVE}
          stroke={`var(--color-${lineKey})`}
          strokeWidth={2}
          strokeDasharray={dashed ? "5 4" : undefined}
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  )
}

type Slice = { name: string; value: number | null }

// Custom treemap cell: a rounded rect in the series colour with the category
// name + formatted value inset. Labels are hidden on cells too small to fit.
function TreemapCell(props: {
  depth?: number
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  value?: number
  fmt?: (n: number) => string
  /** The keys in ramp order, so a cell knows how pale its own fill is. */
  order?: string[]
}) {
  const {
    depth = 0,
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name,
    value,
    fmt,
    order = [],
  } = props
  if (depth !== 1) return <g />
  const showLabel = width > 56 && height > 36

  // THE FILL COMES FROM THE RAMP POSITION, NOT FROM THE LABEL.
  //
  // It used to be `var(--color-${name})`, which is the trap DESIGN-REPORTS.md
  // §5 warns about: a series key becomes a CSS custom property, so a name with
  // a space in it produces a declaration that never resolves and the tile
  // renders with SVG's default fill — solid black (a two-word category turned
  // its tile black; fixed 2026-09-02).
  // Callers pass human labels here by design — this is the one chart whose
  // categories ARE the display text — so the component maps them to the ramp
  // itself rather than asking every caller for synthetic keys.
  //
  // Beyond five slices the darkest shade repeats. Five is the palette's limit
  // (DESIGN-REPORTS.md §5): a caller with more categories should roll the tail
  // into "Other" rather than rely on what happens here.
  const position = order.indexOf(name ?? "")
  const rampIndex = Math.min(position < 0 ? 0 : position, 4)
  const fill = `var(--color-chart-${rampIndex + 1})`

  // INK FOLLOWS THE FILL. The ramp runs light (oklch 0.87) to dark (0.269), so
  // the first two tiles need a dark label and the rest a light one; it was
  // `#fff` on every tile, which put white text on the palest gray.
  //
  // The two literals are deliberate, and match GroupedTreemapCell above: the
  // chart ramp is IDENTICAL in light and dark mode, so a label sitting on it
  // must not use a theme token — `var(--foreground)` would be near-white on a
  // pale tile in dark mode, which is the bug this replaces.
  const ink = rampIndex < 2 ? "#0a0a0a" : "#fafafa"
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={fill}
        stroke="var(--background)"
        strokeWidth={3}
      />
      {showLabel && (
        <text x={x + 12} y={y + 24} fill={ink} fontSize={13} fontWeight={600}>
          {name}
          <tspan
            x={x + 12}
            dy={18}
            fontSize={12}
            fontWeight={400}
            fillOpacity={0.85}
          >
            {value != null && fmt ? fmt(value) : value}
          </tspan>
        </text>
      )}
    </g>
  )
}

/** Proportional treemap of a single-level breakdown (e.g. by country). Cells
 *  are coloured by the shared series palette so they line up with bar/line
 *  charts of the same keys. */
export type TreemapGroup = {
  name: string
  /** The group's fill, as a CSS colour — e.g. "var(--color-blue-400)". A hue per
   *  group is a deliberate exception to the grayscale chart palette: here the
   *  colour identifies which GROUP a tile belongs to, which is the point of the
   *  map, and grayscale can't carry it alongside the per-leaf shade step. */
  tone: string
  /** Text colour on that fill — "dark" for pale tones, "light" for saturated. */
  ink?: "dark" | "light"
  children: { name: string; value: number }[]
}

// Nested treemap cell. Depth 1 is a group: no fill, just a thick background
// stroke that cuts a visible gutter around it, so the two groups read as two
// areas of one map. Depth 2 is a leaf, filled in its group's tone with a small
// per-leaf opacity step so neighbours inside a group stay distinguishable.
function GroupedTreemapCell(props: {
  depth?: number
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
  name?: string
  value?: number
  fmt?: (n: number) => string
  tones?: Map<string, { tone: string; ink: "dark" | "light" }>
}) {
  const {
    depth = 0,
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    index = 0,
    name,
    value,
    fmt,
    tones,
  } = props

  if (depth === 1) {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="var(--background)"
        strokeWidth={8}
      />
    )
  }
  if (depth !== 2) return <g />

  const group = (name ? tones?.get(name) : undefined) ?? {
    tone: "var(--color-chart-1)",
    ink: "dark" as const,
  }
  const showLabel = width > 58 && height > 34
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={group.tone}
        fillOpacity={1 - Math.min(index % 4, 3) * 0.12}
        stroke="var(--background)"
        strokeWidth={3}
      />
      {showLabel && (
        <text
          x={x + 10}
          y={y + 20}
          fill={group.ink === "dark" ? "#0a0a0a" : "#fafafa"}
          fontSize={12}
          fontWeight={600}
        >
          {name}
          <tspan x={x + 10} dy={16} fontSize={11} fontWeight={400}>
            {value != null && fmt ? fmt(value) : value}
          </tspan>
        </text>
      )}
    </g>
  )
}

/** One treemap holding several groups, each in its own tone. Area is share of
 *  the whole map, so groups and leaves are all comparable on one scale — which
 *  is what separate treemaps per group cannot do. */
export function GroupedTreemap({
  groups,
  fmt = (n) => String(n),
  height = "h-80",
}: {
  groups: TreemapGroup[]
  fmt?: (n: number) => string
  height?: string
}) {
  const clean = groups
    .map((g) => ({
      ...g,
      children: g.children.filter((c) => c.value > 0),
    }))
    .filter((g) => g.children.length > 0)
  const tones = new Map<string, { tone: string; ink: "dark" | "light" }>()
  for (const g of clean)
    for (const c of g.children)
      tones.set(c.name, { tone: g.tone, ink: g.ink ?? "dark" })

  return (
    <ChartContainer config={{}} className={`aspect-auto ${height} w-full`}>
      <Treemap
        data={clean}
        dataKey="value"
        nameKey="name"
        isAnimationActive={false}
        content={<GroupedTreemapCell fmt={fmt} tones={tones} />}
      >
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {fmt(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
      </Treemap>
    </ChartContainer>
  )
}

export function CategoryTreemap({
  data,
  fmt = (n) => String(n),
}: {
  data: Slice[]
  fmt?: (n: number) => string
}) {
  const clean = data.filter(
    (d): d is { name: string; value: number } => d.value != null && d.value > 0
  )
  const config = seriesConfig(clean.map((d) => d.name))
  return (
    <ChartContainer config={config} className="aspect-auto h-72 w-full">
      <Treemap
        data={clean}
        dataKey="value"
        nameKey="name"
        isAnimationActive={false}
        content={<TreemapCell fmt={fmt} order={clean.map((d) => d.name)} />}
      >
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {fmt(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
      </Treemap>
    </ChartContainer>
  )
}

/** Nested area funnel — each stage is a rectangle whose AREA is proportional to
 *  its count (width & height each scale with √count). Rectangles share the
 *  bottom-left corner and draw largest→smallest, so the biggest stage (e.g. all
 *  applicants) sits as a backdrop behind the rest. Linear in area — no log/power
 *  axis — with a legend for the exact counts. */
export function NestedAreaFunnel({
  stages,
}: {
  stages: { label: string; value: number }[]
}) {
  const sorted = stages
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
  const max = sorted[0]?.value ?? 1
  const W = 320
  const H = 240
  // grey ramp: lightest for the big backdrop → darkest for the smallest stage
  // in front (matches the theme's greyscale chart palette).
  const shade = (i: number) =>
    `oklch(${(0.88 - (0.58 * i) / Math.max(sorted.length - 1, 1)).toFixed(3)} 0 0)`
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMinYMax meet"
        className="h-60 w-full max-w-xs"
      >
        {sorted.map((s, i) => {
          const k = Math.sqrt(s.value / max)
          return (
            <rect
              key={s.label}
              x={0}
              y={H - H * k}
              width={W * k}
              height={H * k}
              rx={3}
              fill={shade(i)}
              stroke="var(--background)"
              strokeWidth={2}
            />
          )
        })}
      </svg>
      <ul className="flex flex-col gap-1.5 text-sm">
        {sorted.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-[3px]"
              style={{ background: shade(i) }}
            />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto pl-6 font-medium tabular-nums">
              {formatNumber(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
