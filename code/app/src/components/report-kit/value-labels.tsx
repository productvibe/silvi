// Value labels on a chart — a stack's total, a segment's value, a line's
// points — placed together, so they never print over each other.
//
// Recharts' LabelList draws each series on its own, with no idea what the
// others drew: on a 270 px small multiple, eleven weeks of bar totals plus two
// rate lines overprinted into "9.6k9.7k" and rates sitting on the totals
// (1P - 20 Marketing, 2026-09-29). Here one layer lays them all out:
//
// - A series labels every point only when the widest of its labels fits the
//   per-point width (the plot width over the points, less a gap); otherwise
//   every 2nd, 3rd, … point, counted back from the LAST one so the latest
//   period always keeps its label — the same thinning as the ticks.
// - Series are placed in priority order (totals, then segments, then lines in
//   their order), and a label that would touch one already placed moves below
//   its point (lines only) or is dropped.
// - A label stays inside the plot: it slides inward at the first and last
//   point rather than over a y-axis tick, and never drops into the x ticks.
// - The drawn LINES are obstacles too: a label never sits on a line other
//   than its own (a column total on a rate line, 2026-09-29).
// - Labels above a mark sit on a small plate in the card's colour (token
//   --card, both themes), so a rate label over a column still reads. It was
//   a 3 px stroke in that colour until 2026-09-29: in dark mode, over a light
//   column, the dark outline round light glyphs read as garbled.

import {
  DefaultZIndexes,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  ZIndexLayer,
} from "recharts"

type Datum = Record<string, string | number | null>

export type LabelGroup = {
  /** "above": over a bar top or a line point; "inside": centred in a band */
  kind: "above" | "inside"
  /** which y axis the values are on (recharts' `yAxisId`) */
  axis: "primary" | "secondary"
  /** the value the label anchors to (bar top, point); null = no label */
  at: (row: Datum) => number | null
  /** inside: the band's two ends, in the axis' units */
  band?: (row: Datum) => [number, number] | null
  text: (row: Datum) => string
  /** the text colour: a class (`fill-…`) or a CSS colour */
  className?: string
  fill?: string
  /** above only: may move below its point when the space above is taken */
  flip?: boolean
  /** above only: this row's label goes under its point (a negative total) */
  below?: (row: Datum) => boolean
  /** the drawn line this group labels (its own points never hide it) */
  line?: string
}

/** A drawn line, as an obstacle for every other line's labels. */
export type LinePath = {
  key: string
  axis: "primary" | "secondary"
  at: (row: Datum) => number | null
}

type Rect = { x0: number; x1: number; y0: number; y1: number }

const SIZE = 11
/** px between two labels of one series, side by side — as the x ticks
 *  keep (4 px read as touching: "2.9k3.3k", 2026-09-29) */
const GAP = 8
/** px kept clear around a label against every other label */
const PAD = 2
/** a bar's share of its band (recharts' default barCategoryGap is 10 %) */
const BAR_SHARE = 0.8

let measureCtx: CanvasRenderingContext2D | null | undefined
let family = "sans-serif"
/** A label's width in px: measured on a canvas in the page's font in the
 *  browser, estimated from its length on the server. */
export function textWidth(t: string, size = 12): number {
  if (measureCtx === undefined) {
    measureCtx =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d")
    if (measureCtx) family = getComputedStyle(document.body).fontFamily
  }
  if (!measureCtx) return t.length * size * 0.55
  measureCtx.font = `${size}px ${family}`
  return measureCtx.measureText(t).width
}

const hit = (a: Rect, b: Rect) =>
  a.x0 < b.x1 + PAD && b.x0 < a.x1 + PAD && a.y0 < b.y1 + PAD && b.y0 < a.y1 + PAD

type Seg = { key: string; ax: number; ay: number; bx: number; by: number }

/** Does a segment pass through the rect (grown by PAD)? Clipped to the
 *  rect's x span, then its y range there is compared. */
function crosses(s: Seg, r: Rect): boolean {
  const x0 = r.x0 - PAD
  const x1 = r.x1 + PAD
  const lo = Math.max(Math.min(s.ax, s.bx), x0)
  const hi = Math.min(Math.max(s.ax, s.bx), x1)
  if (lo > hi) return false
  const yAt = (x: number) =>
    s.bx === s.ax ? s.ay : s.ay + ((x - s.ax) / (s.bx - s.ax)) * (s.by - s.ay)
  const ya = yAt(lo)
  const yb = yAt(hi)
  return Math.max(ya, yb) >= r.y0 - PAD && Math.min(ya, yb) <= r.y1 + PAD
}

/** The smallest stride (1, 2, 3, …) at which labels this wide stand apart. */
export function labelStride(widest: number, perPoint: number): number {
  if (!(perPoint > 0)) return 1
  return Math.max(1, Math.ceil((widest + GAP) / perPoint))
}

export function ValueLabels({
  data,
  xKey,
  groups,
  primary,
  secondary,
  lines = [],
}: {
  data: Datum[]
  xKey: string
  groups: LabelGroup[]
  primary?: string | number
  secondary?: string | number
  /** the lines drawn on the chart, which no other line's label may sit on */
  lines?: LinePath[]
}) {
  const plot = usePlotArea()
  const x = useXAxisScale()
  const y1 = useYAxisScale(primary)
  const y2 = useYAxisScale(secondary ?? "__none__")
  if (!plot || !x || !groups.length || !data.length) return null
  const n = data.length
  const perPoint = plot.width / n
  const left = plot.x
  const right = plot.x + plot.width
  const bottom = plot.y + plot.height
  const placed: Rect[] = []
  const out: React.ReactNode[] = []
  // Each drawn line as segments between its points (connectNulls: a blank
  // point is skipped, as the line skips it).
  const segs: Seg[] = lines.flatMap((l) => {
    const y = l.axis === "secondary" ? y2 : y1
    if (!y) return []
    const pts = data.flatMap((row) => {
      const v = l.at(row)
      const px = x(row[xKey], { position: "middle" })
      const py = v == null || !Number.isFinite(v) ? null : y(v)
      return px == null || py == null || !Number.isFinite(px) || !Number.isFinite(py)
        ? []
        : [[px, py] as const]
    })
    return pts
      .slice(1)
      .map(([bx, by], i) => ({ key: l.key, ax: pts[i][0], ay: pts[i][1], bx, by }))
  })
  const onLine = (r: Rect, own?: string) =>
    segs.some((sg) => sg.key !== own && crosses(sg, r))

  groups.forEach((g, gi) => {
    const y = g.axis === "secondary" ? y2 : y1
    if (!y) return
    const texts = data.map((r) => g.text(r))
    // Labels print in tabular figures, so every digit is as wide as a "0":
    // measured that way, panels whose values differ only in their digits
    // thin alike.
    const widths = texts.map((t) =>
      t ? textWidth(t.replace(/\d/g, "0"), SIZE) : 0
    )
    const stride =
      g.kind === "above" ? labelStride(Math.max(0, ...widths), perPoint) : 1
    data.forEach((row, i) => {
      if ((n - 1 - i) % stride !== 0) return
      const t = texts[i]
      if (!t) return
      const cx = x(row[xKey], { position: "middle" })
      if (cx == null || !Number.isFinite(cx)) return
      const w = widths[i]
      if (g.kind === "inside") {
        const b = g.band?.(row)
        if (!b) return
        const ya = y(b[0])
        const yb = y(b[1])
        if (ya == null || yb == null) return
        const h = Math.abs(ya - yb)
        if (h < SIZE + 3 || w + 4 > perPoint * BAR_SHARE) return
        const mid = (ya + yb) / 2
        const r = { x0: cx - w / 2, x1: cx + w / 2, y0: mid - 6, y1: mid + 6 }
        if (placed.some((p) => hit(p, r))) return
        if (onLine(r, g.line)) return
        placed.push(r)
        out.push(
          <text
            key={`${gi}-${i}`}
            x={cx}
            y={mid}
            dy={4}
            textAnchor="middle"
            fontSize={SIZE}
            fill={g.fill}
            className="tabular-nums"
          >
            {t}
          </text>
        )
        return
      }
      const v = g.at(row)
      if (v == null || !Number.isFinite(v)) return
      const py = y(v)
      if (py == null || !Number.isFinite(py)) return
      // slide inward at the plot's edges rather than over an axis tick
      const half = w / 2
      const lx = Math.min(Math.max(cx, left + half), right - half)
      // baselines: above the mark, or (a line) below it
      const tries = g.below?.(row)
        ? [py + 7 + SIZE]
        : g.flip
          ? [py - 7, py + 7 + SIZE]
          : [py - 6]
      for (const base of tries) {
        const r = { x0: lx - half, x1: lx + half, y0: base - 9, y1: base + 2 }
        if (r.y0 < 0 || r.y1 > bottom) continue
        if (placed.some((p) => hit(p, r))) continue
        if (onLine(r, g.line)) continue
        placed.push(r)
        out.push(
          <g key={`${gi}-${i}`}>
            <rect
              x={r.x0 - 2}
              y={r.y0}
              width={w + 4}
              height={r.y1 - r.y0 + 1}
              rx={2}
              fill="var(--card)"
            />
            <text
              x={lx}
              y={base}
              textAnchor="middle"
              fontSize={SIZE}
              fill={g.fill}
              className={g.className}
            >
              {t}
            </text>
          </g>
        )
        return
      }
    })
  })
  // recharts draws bars and lines in their own layers; labels go in its
  // label layer, over every mark
  return (
    <ZIndexLayer zIndex={DefaultZIndexes.label}>
      <g className="recharts-value-labels">{out}</g>
    </ZIndexLayer>
  )
}
