// The named metrics (metrics.ts) and the helpers that compute them.
// Client-safe, so a report, a block and the wiki read the same definitions.
//
//   import { metricValue, ratioOfSums } from "~/metrics"
//   metricValue("attachmentRate", net, eligible)     one row
//   ratioOfSums("attachmentRate", rows)              a totals row: Σ num / Σ den
//
// One way to compute a rate: summed numerator over summed denominator, at any
// grain and in totals rows. Never an average of rates.

import { METRICS, type MetricName } from "./metrics"
import type { Metric } from "./schema"
import { TERMS, type TermEntry, type TermId } from "./dictionary"

export { METRICS, type MetricName }
export type { Metric }

export const METRIC_NAMES = Object.keys(METRICS) as MetricName[]

export function getMetric(name: MetricName | string): Metric {
  const m = (METRICS as Record<string, Metric>)[name]
  if (!m) throw new Error(`No metric "${name}" in app/src/metrics/`)
  return m
}

/** How a figure is rounded to its decimals: as `toFixed` does (the
 *  default), half up on the scaled parts (`Math.round((scale·10^k·n) / d) /
 *  10^k`), or half up on the scaled rate (`Math.round(((scale·n) / d)·10^k) /
 *  10^k`). The three can differ on an exact .x5, so each report keeps its own. */
export type Rounding = "fixed" | "half" | "scaled"

/** A ratio, mean or change from its two parts: `scale × n / d` (a change:
 *  `scale × (n − d) / d`), rounded to the metric's decimals or the call's
 *  (`decimals: null` leaves it unrounded), null when `d` is not positive. A
 *  sum or count is `n` itself. */
export function metricValue(
  name: MetricName,
  n: number | null | undefined,
  d?: number | null,
  opts: { decimals?: number | null; round?: Rounding } = {}
): number | null {
  const m = getMetric(name)
  if (m.type === "sum" || m.type === "count") return n ?? null
  const num = Number(n ?? 0)
  const den = Number(d ?? 0)
  if (!(den > 0)) return null
  const scale = m.scale ?? 1
  const top = m.type === "change" ? num - den : num
  const decimals = opts.decimals === undefined ? m.decimals : opts.decimals
  if (decimals == null) return (scale * top) / den
  const f = 10 ** decimals
  if (opts.round === "half") return Math.round((scale * f * top) / den) / f
  if (opts.round === "scaled") return Math.round(((scale * top) / den) * f) / f
  return Number(((scale * top) / den).toFixed(decimals))
}

type Row = Record<string, unknown>

/** The metric over several rows: Σ numerator / Σ denominator (or Σ column),
 *  read from the columns the metric names. */
export function ratioOfSums(name: MetricName, rows: readonly Row[]): number | null {
  const m = getMetric(name)
  const sum = (k?: string) =>
    k ? rows.reduce((s, r) => s + Number(r[k] ?? 0), 0) : 0
  if (m.type === "sum" || m.type === "count") return sum(m.column)
  return metricValue(name, sum(m.numerator), sum(m.denominator))
}

/** The metric on one row, from its own columns. */
export function metricOfRow(name: MetricName, row: Row): number | null {
  return ratioOfSums(name, [row])
}

export { TERMS, TERM_IDS, TERM_USAGE, type TermId } from "./dictionary"

/** A dictionary entry (`./dictionary.ts`) as a reader shows it: an entry
 *  that carries a metric takes that metric's label and definition as its
 *  name and one line. */
export function termOf(id: TermId) {
  const t: TermEntry = (TERMS as Record<string, TermEntry>)[id]
  const m = t.metric ? getMetric(t.metric) : undefined
  return {
    id,
    ...t,
    name: m ? m.label : t.name!,
    oneLine: m ? m.definition : t.oneLine!,
    rules: t.rules ?? [],
    caveats: t.caveats ?? [],
  }
}
