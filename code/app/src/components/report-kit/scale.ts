// A nice linear scale for panels that share one axis (`split=`): recharts
// spaces its own ticks inside a fixed domain, so the last step came out
// uneven (0, 4k, 8k, 12k, 15k). Here the step is picked first and the
// domain and ticks follow from it, so every panel shows the same even ticks.

/** A y domain end: a number in the data's units, or "auto". */
export type DomainEnd = number | "auto"

export type NiceScale = { domain: [number, number]; ticks: number[] }

const MANTISSAS = [1, 2, 2.5, 5]
const MAX_INTERVALS = 5

const clean = (v: number) => Number(v.toPrecision(12))

/** The smallest step (1 / 2 / 2.5 / 5 × 10ⁿ) that covers `lo`–`hi` in at
 *  most five intervals, i.e. four to six ticks. */
function niceStep(lo: number, hi: number): number {
  const range = hi - lo
  if (!(range > 0)) return hi > 0 ? 10 ** Math.floor(Math.log10(hi)) : 1
  let p = 10 ** (Math.floor(Math.log10(range / MAX_INTERVALS)) - 1)
  for (;;) {
    for (const m of MANTISSAS) {
      const step = m * p
      const n = Math.ceil(clean(hi / step)) - Math.floor(clean(lo / step))
      if (n <= MAX_INTERVALS) return step
    }
    p *= 10
  }
}

/** One scale for every panel. An "auto" end becomes the data's min / max
 *  rounded out to the step; a fixed end stays. A zero-based default
 *  (`[0, "auto"]`). Blank values are the caller's to drop. */
export function niceScale(
  values: number[],
  domain: readonly [DomainEnd, DomainEnd] = [0, "auto"]
): NiceScale {
  const vs = values.filter((v) => Number.isFinite(v))
  const dataLo = vs.length ? Math.min(...vs) : 0
  const dataHi = vs.length ? Math.max(...vs) : 1
  const lo0 = domain[0] === "auto" ? dataLo : domain[0]
  let hi0 = domain[1] === "auto" ? dataHi : domain[1]
  if (hi0 <= lo0) hi0 = lo0 + 1
  const step = niceStep(lo0, hi0)
  const lo =
    domain[0] === "auto" ? clean(Math.floor(clean(lo0 / step)) * step) : lo0
  const hi =
    domain[1] === "auto" ? clean(Math.ceil(clean(hi0 / step)) * step) : hi0
  const ticks: number[] = []
  for (let i = Math.ceil(clean(lo / step)); clean(i * step) <= hi; i++)
    ticks.push(clean(i * step))
  // A fixed end off the step still gets its tick; a step tick within ¾ of
  // a step of it goes, or their labels crowd ("3.5M" 20 px over "3M").
  if (ticks[0] !== lo) {
    if (ticks.length > 1 && ticks[0] - lo < step * 0.75) ticks.shift()
    ticks.unshift(lo)
  }
  if (ticks[ticks.length - 1] !== hi) {
    if (ticks.length > 1 && hi - ticks[ticks.length - 1] < step * 0.75) ticks.pop()
    ticks.push(hi)
  }
  return { domain: [lo, hi], ticks }
}

/** The scale a chart draws when the page gave it no ticks (every non-split
 *  chart, 2026-09-29): round, even ticks (0/1k/2k/3k/4k, 0/20/40 %) rather
 *  than the chart library's own (0/900/1.8k/2.7k/3.6k). `domain` as on
 *  `niceScale`; left out, the axis starts at zero, or below it when the data
 *  does. Undefined when there is nothing to scale (no value, or all zero),
 *  so the library's own ticks stand. */
export function autoScale(
  values: number[],
  domain?: readonly [DomainEnd, DomainEnd]
): NiceScale | undefined {
  const vs = values.filter((v) => Number.isFinite(v))
  if (!vs.some((v) => v !== 0)) return undefined
  const lo = Math.min(...vs)
  return niceScale(vs, domain ?? [lo < 0 ? "auto" : 0, "auto"])
}

/** A row's values under `keys`, blanks dropped (a blank is no value, not 0). */
export const cellValues = (
  rows: Record<string, unknown>[],
  keys: readonly string[]
): number[] =>
  rows.flatMap((r) =>
    keys.flatMap((k) =>
      r[k] == null || r[k] === "" ? [] : [Number(r[k])]
    )
  )

/** Two axes of one chart (bars on the left, a rate on the right) with the
 *  zero at the same height and the same number of intervals, so the
 *  gridlines are shared and a line at 0 % sits on the bars' baseline (the
 *  Incomplete Attribution deltas and uplifts, kit pass 7, 2026-09-29).
 *  Only for two even scales that both reach zero; else they stand as given. */
export function alignScales(
  a: NiceScale | undefined,
  b: NiceScale | undefined
): [NiceScale | undefined, NiceScale | undefined] {
  if (!a || !b) return [a, b]
  const parts = (s: NiceScale) => {
    const t = s.ticks
    const step = t.length > 1 ? clean(t[1] - t[0]) : 0
    if (!(step > 0) || s.domain[0] > 0 || s.domain[1] < 0) return null
    const even = t.every((v, i) => i === 0 || clean(v - t[i - 1]) === step)
    if (!even || clean(s.domain[0] / step) % 1 || clean(s.domain[1] / step) % 1)
      return null
    return {
      step,
      below: Math.round(-s.domain[0] / step),
      above: Math.round(s.domain[1] / step),
    }
  }
  const pa = parts(a)
  const pb = parts(b)
  if (!pa || !pb) return [a, b]
  const below = Math.max(pa.below, pb.below)
  const above = Math.max(pa.above, pb.above)
  const build = (step: number): NiceScale => {
    const ticks: number[] = []
    for (let i = -below; i <= above; i++) ticks.push(clean(i * step))
    return { domain: [ticks[0], ticks[ticks.length - 1]], ticks }
  }
  return [build(pa.step), build(pb.step)]
}
