// The row arithmetic reports share: sums by key, totals, pivots and rates
// over the rows a report's SQL returns. Pure and client-safe, so a
// `reconstruct` or the component a `k.Custom` draws can use it. Each helper does exactly what the reports did
// by hand, in the same order (sums add row by row, as they arrive), so moving
// a report onto one changes no figure.
//
//   import { rollup, total } from "~/components/report-kit/rows"

import { addDays, format, parseISO } from "date-fns"

import { metricValue, type MetricName } from "~/metrics"

type Row = Record<string, unknown>

const num = (v: unknown) => Number(v ?? 0)

/** The rows `where` keeps, grouped by the `keys` columns, with the `sums`
 *  columns added up: one row per group, in the order each group first
 *  appears, holding the keys (as the group's first row had them) and then the
 *  sums. Nulls count as 0. */
export function rollup<
  R extends Row,
  K extends keyof R & string,
  S extends string,
>(
  rows: readonly R[],
  {
    keys,
    sums,
    where,
  }: { keys: readonly K[]; sums: readonly S[]; where?: (r: R) => boolean }
): (Pick<R, K> & Record<S, number>)[] {
  const out = new Map<string, Row>()
  for (const r of rows) {
    if (where && !where(r)) continue
    const k = keys.map((c) => String(r[c])).join("\u0000")
    let o = out.get(k)
    if (!o) {
      o = {}
      for (const c of keys) o[c] = r[c]
      for (const c of sums) o[c] = 0
      out.set(k, o)
    }
    for (const c of sums) o[c] = (o[c] as number) + num(r[c])
  }
  return [...out.values()] as (Pick<R, K> & Record<S, number>)[]
}

/** `fields` of `rows` added up per `key(row)`, in first-seen order. */
export function groupSum<R, F extends keyof R & string>(
  rows: readonly R[],
  key: (r: R) => string,
  fields: readonly F[]
): Map<string, Record<F, number>> {
  const out = new Map<string, Record<F, number>>()
  for (const r of rows) {
    const k = key(r)
    let acc = out.get(k)
    if (!acc) {
      acc = Object.fromEntries(fields.map((f) => [f, 0])) as Record<F, number>
      out.set(k, acc)
    }
    for (const f of fields) acc[f] += num(r[f])
  }
  return out
}

/** `fields` added up over every row (0 each for no rows). */
export function total<R, F extends keyof R & string>(
  rows: readonly R[],
  fields: readonly F[]
): Record<F, number> {
  return (
    groupSum(rows, () => "", fields).get("") ??
    (Object.fromEntries(fields.map((f) => [f, 0])) as Record<F, number>)
  )
}

/** A wide row: the `X` column, then one column per key × value
 *  (`NO_signed`), or per key when the pivot has one value (`NO`). */
export type WideRow<
  X extends string,
  K extends string,
  V extends string | null = null,
  T = number,
> = Record<X, string> & Record<V extends string ? `${K}_${V}` : K, T>

type PivotOptions<R, X, K extends string, T extends string, F> = {
  /** the row column that becomes one wide row per distinct value, sorted */
  x: X
  /** the column whose values name the wide columns */
  by: keyof R & string
  /** the `by` values that get columns, in order; other values are dropped */
  keys: readonly K[]
  /** the x values to build rows for (default: every x in `rows`, sorted) */
  xs?: readonly string[]
  /** a column summing the keys' columns, e.g. "ALL" */
  total?: T
  /** a cell with no row: 0, or null (and then a total of 0 is null too) */
  fill: F
}

type Cell<F> = F extends null ? number | null : number

/** Long rows (x × by) → one row per x with a column per `by` key: `values`
 *  a column name gives `<key>` columns; a map of names to columns gives
 *  `<key>_<name>` columns. A cell sums the value over its rows (nulls as 0;
 *  a row without the column adds nothing). */
export function pivotWide<
  R extends Row,
  X extends keyof R & string,
  K extends string,
  V extends string,
  F extends 0 | null,
  T extends string = never,
>(
  rows: readonly R[],
  opts: PivotOptions<R, X, K, T, F> & { values: Record<V, string> }
): WideRow<X, K | T, V, Cell<F>>[]
export function pivotWide<
  R extends Row,
  X extends keyof R & string,
  K extends string,
  F extends 0 | null,
  T extends string = never,
>(
  rows: readonly R[],
  opts: PivotOptions<R, X, K, T, F> & { values: string }
): WideRow<X, K | T, null, Cell<F>>[]
export function pivotWide(
  rows: readonly Row[],
  opts: PivotOptions<Row, string, string, string, 0 | null> & {
    values: string | Record<string, string>
  }
): Row[] {
  const { x, by, keys, xs, total, fill, values } = opts
  const named = typeof values === "string" ? null : values
  const fields = named ? Object.entries(named) : [["", values as string]]
  const col = (k: string, name: string) => (named ? `${k}_${name}` : k)
  const cells = new Map<string, number>()
  for (const r of rows)
    for (const [name, field] of fields) {
      if (!(field in r)) continue
      const c = `${String(r[x])}\u0000${col(String(r[by]), name)}`
      cells.set(c, (cells.get(c) ?? 0) + num(r[field]))
    }
  const cell = (p: string, k: string, name: string) =>
    cells.get(`${p}\u0000${col(k, name)}`)
  const periods = xs ?? [...new Set(rows.map((r) => String(r[x])))].sort()
  return periods.map((p) => {
    const out: Row = { [x]: p }
    for (const k of keys)
      for (const [name] of fields) out[col(k, name)] = cell(p, k, name) ?? fill
    if (total)
      for (const [name] of fields) {
        const sum = keys.reduce((s, k) => s + (cell(p, k, name) ?? 0), 0)
        out[col(total, name)] = fill === null ? sum || null : sum
      }
    return out
  })
}

/** `min_coverage` → `minCoverage`, `signed_12m` → `signed12m`. */
type Camel<S extends string> = S extends `${infer H}_${infer T}`
  ? `${H}${Capitalize<Camel<T>>}`
  : S

export type CamelRow<R> = { [K in keyof R & string as Camel<K>]: R[K] }

const camel = (k: string) =>
  k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())

/** Rows with snake_case columns (Redshift lowercases every alias) renamed to
 *  camelCase, in the rows' column order, with the `numeric` columns coerced
 *  by Number(). */
export function camelRows<R extends Row>(
  rows: readonly R[],
  { numeric = [] }: { numeric?: readonly (keyof R & string)[] } = {}
): CamelRow<R>[] {
  const coerce = new Set<string>(numeric)
  return rows.map((r) => {
    // Read each numeric column by name; the row is built from its own keys.
    for (const f of numeric) void r[f]
    return Object.fromEntries(
      Object.entries(r).map(([k, v]) => [camel(k), coerce.has(k) ? Number(v) : v])
    ) as CamelRow<R>
  })
}

/** Rows with the `fields` columns coerced by Number(), names kept. */
export function numericRows<R extends Row>(
  rows: readonly R[],
  fields: readonly (keyof R & string)[]
): R[] {
  return rows.map((r) => {
    const o: Row = { ...r }
    for (const f of fields) o[f] = Number(r[f])
    return o as R
  })
}

/** How a rate is worked out from its two sums: a named metric (metricValue:
 *  its scale and decimals) or the report's own function, so each report
 *  keeps its rounding. */
export type RateOf = MetricName | ((n: number, d: number) => number | null)

const rateFn = (r: RateOf) =>
  typeof r === "function" ? r : (n: number, d: number) => metricValue(r, n, d)

/** Long rows → one row per x with a rate per `by` key: Σ`num` ÷ Σ`den` over
 *  the key's rows (the two may come from different rows, e.g. two queries
 *  concatenated), and `total`, the rate of the keys' summed parts — a ratio
 *  of sums, never an average of rates. */
export function rates<
  R extends Row,
  X extends keyof R & string,
  K extends string,
  T extends string = never,
>(
  rows: readonly R[],
  opts: {
    x: X
    by: string
    keys: readonly K[]
    xs?: readonly string[]
    num: string
    den: string
    rate: RateOf
    total?: T
  }
): WideRow<X, K | T, null, number | null>[] {
  const { x, keys, num, den, total } = opts
  const f = rateFn(opts.rate)
  const wide = pivotWide(rows as readonly Row[], {
    ...opts,
    total: total as string | undefined,
    values: { n: num, d: den },
    fill: 0,
  }) as Row[]
  return wide.map((w) => {
    const out: Row = { [x]: w[x] }
    for (const k of [...keys, ...(total ? [total] : [])])
      out[k] = f(w[`${k}_n`] as number, w[`${k}_d`] as number)
    return out
  }) as WideRow<X, K | T, null, number | null>[]
}

/** Wide rows (`NO_paid`, `NO_signed`, …) → one rate column per key (`NO`,
 *  or `NO_<as>`). */
export function rateSeries<
  X extends string,
  K extends string,
  A extends string | null = null,
>(
  rows: readonly Row[],
  opts: {
    x: X
    keys: readonly K[]
    num: string
    den: string
    rate: RateOf
    as?: A
  }
): WideRow<X, K, A, number | null>[] {
  const f = rateFn(opts.rate)
  return rows.map((r) => {
    const out: Row = { [opts.x]: r[opts.x] }
    for (const k of opts.keys)
      out[opts.as ? `${k}_${opts.as}` : k] = f(
        r[`${k}_${opts.num}`] as number,
        r[`${k}_${opts.den}`] as number
      )
    return out
  }) as WideRow<X, K, A, number | null>[]
}

/** The rows and a total row after them, when there are two or more. */
export const withTotal = <T>(rows: T[], total: () => T): T[] =>
  rows.length > 1 ? [...rows, total()] : rows

/** The first `n` items, and the rest folded into one item by `fold` when at
 *  least `minRest` remain (so a single leftover can keep its own row). */
export function topN<T>(
  items: readonly T[],
  n: number,
  fold: (rest: T[]) => T,
  minRest = 1
): T[] {
  const rest = items.slice(n)
  return rest.length >= minRest
    ? [...items.slice(0, n), fold(rest)]
    : [...items]
}

/** The last point with a value. */
export const latest = <P extends { value: number | null }>(points: P[]) =>
  points.filter((p) => p.value != null).at(-1)

/** The mean of the last `n` points with a value, or null. */
export function trailingMean(points: { value: number | null }[], n: number) {
  const vals = points
    .filter((p) => p.value != null)
    .slice(-n)
    .map((p) => p.value as number)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

/** A stock run forward day by day from the opening balance: for each market,
 *  every day from `first` to `last`, the day's changes (`day|market` →
 *  fields) added to the book, and `visit` called with the book as it stands
 *  that evening — so a day on which nothing moved carries the book over. */
export function walkForward<F extends string>(
  change: Map<string, Partial<Record<F, number>>>,
  markets: Iterable<string>,
  first: string,
  last: string,
  fields: readonly F[],
  visit: (day: string, market: string, book: Record<F, number>) => void
) {
  for (const market of markets) {
    const book = Object.fromEntries(fields.map((f) => [f, 0])) as Record<
      F,
      number
    >
    for (let d = parseISO(first); ; d = addDays(d, 1)) {
      const day = format(d, "yyyy-MM-dd")
      if (day > last) break
      const c = change.get(`${day}|${market}`)
      for (const f of fields) book[f] += c?.[f] ?? 0
      visit(day, market, book)
    }
  }
}

/**
 * A stacked chart's data: one datum per period with the dimension values as
 * columns, plus `total`. Series drawn are capped at FIVE (product/DESIGN-REPORTS
 * §5): the four largest values over the window keep their own band and the rest
 * fold into one "Other …" band, while `tooltipRows` still lists every value, so
 * the hover shows exactly what PowerBI's legend does. Keys are synthetic
 * (`s0`…`s4`) because a raw dimension value is not a safe CSS variable name.
 */
export function stackData(
  byPeriod: Map<string, Map<string, number>>,
  order: readonly string[],
  restLabel = "Other",
  /** Extra per-period figures for the hover only (e.g. withdrawals under a
   *  net-sales stack) — PowerBI draws these as a line on a second axis. */
  extra: Record<string, Map<string, number | null>> = {}
): {
  data: Record<string, string | number | null>[]
  keys: string[]
  labels: Record<string, string>
  tooltipRows: { key: string; label: string }[]
} {
  const periods = [...byPeriod.keys()].sort()
  const totals = new Map<string, number>()
  for (const m of byPeriod.values())
    for (const [d, v] of m) totals.set(d, (totals.get(d) ?? 0) + v)
  // Dimension values in PowerBI's legend order first, then anything the data
  // has that the order list does not know.
  const dims = [
    ...order.filter((d) => totals.has(d)),
    ...[...totals.keys()].filter((d) => !order.includes(d)).sort(),
  ]
  const top = [...dims]
    .sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0))
    .slice(0, 4)
  const shown = dims.filter((d) => top.includes(d))
  const rest = dims.filter((d) => !top.includes(d))
  const keys = shown.map((_, i) => `s${i}`)
  const labels: Record<string, string> = Object.fromEntries(
    shown.map((d, i) => [`s${i}`, d])
  )
  if (rest.length) {
    keys.push("s4")
    labels.s4 = rest.length === 1 ? rest[0] : restLabel
  }
  // Ramp order is meaning: smallest band lightest, largest darkest, the
  // folded remainder last (§5).
  const data = periods.map((p) => {
    const m = byPeriod.get(p) ?? new Map()
    const datum: Record<string, string | number | null> = { period: p }
    shown.forEach((d, i) => (datum[`s${i}`] = m.get(d) ?? 0))
    if (rest.length) datum.s4 = rest.reduce((s, d) => s + (m.get(d) ?? 0), 0)
    for (const d of dims) datum[`v:${d}`] = m.get(d) ?? 0
    datum.total = dims.reduce((s, d) => s + (m.get(d) ?? 0), 0)
    for (const [label, series] of Object.entries(extra))
      datum[`x:${label}`] = series.get(p) ?? 0
    return datum
  })
  return {
    data,
    keys,
    labels,
    tooltipRows: [
      ...dims.map((d) => ({ key: `v:${d}`, label: d })),
      ...Object.keys(extra).map((label) => ({ key: `x:${label}`, label })),
    ],
  }
}

/** n ÷ d in percent, null when d is not positive: unrounded, or to
 *  `decimals` rounding half up on the scaled parts (`Math.round(100·10^k·n
 *  / d)`, as most reports do), half up on the scaled rate ("scaled",
 *  `Math.round((100·n / d)·10^k)`, metricValue's "scaled") or as `toFixed`
 *  does ("fixed", as metricValue and the model pages do). The three can
 *  differ on an exact .x5. */
export function pct(
  n: number,
  d: number,
  decimals?: number,
  round: "half" | "fixed" | "scaled" = "half"
): number | null {
  if (!(d > 0)) return null
  if (decimals == null) return (100 * n) / d
  if (round === "fixed") return Number(((100 * n) / d).toFixed(decimals))
  const f = 10 ** decimals
  if (round === "scaled") return Math.round(((100 * n) / d) * f) / f
  return Math.round((100 * f * n) / d) / f
}
