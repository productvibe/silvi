// What a metric (an entry of `app/src/metrics/metrics.ts`) may say, and a
// check that holds a parsed value to it. Pure, so a skill or script can run
// it on a metric it reads from elsewhere.
//
// A metric is data, not code: which columns a series must carry and how they
// combine. The SQL that returns those columns stays in the report.
//
//   name         camelCase, the entry's key
//   label        Attachment rate
//   type         ratio | sum | count | mean | change
//   numerator    ratio, mean, change: the summed column on top
//   denominator  ratio, mean: the summed column below (a mean's is the count
//                of what was summed; a change's the base: (num − den) ÷ den)
//   column       sum, count: the summed column
//   format       a kit format (report-kit/format.ts)
//   scale        optional: the ratio × scale (percent points)
//   decimals     optional: rounded in the data, as toFixed
//   better       higher | lower
//   definition   one line: Net signed ÷ eligible applications, by week created.
//   compute      optional: the rare metric a function computes

export const METRIC_TYPES = ["ratio", "sum", "count", "mean", "change"] as const
export const METRIC_FORMATS = [
  "number",
  "percent",
  "percent0",
  "decimal",
  "millions",
] as const

export type Metric = {
  name: string
  label: string
  type: (typeof METRIC_TYPES)[number]
  numerator?: string
  denominator?: string
  column?: string
  format: (typeof METRIC_FORMATS)[number]
  scale?: number
  decimals?: number
  better: "higher" | "lower"
  definition: string
  compute?: string
}

const KEYS: (keyof Metric)[] = [
  "name",
  "label",
  "type",
  "numerator",
  "denominator",
  "column",
  "format",
  "scale",
  "decimals",
  "better",
  "definition",
  "compute",
]

export type MetricError = { rule: "invalid-metric"; file: string; message: string }

const COLUMN = /^[a-z_][a-z0-9_]*$/

/** The errors in one metric (`file` names where it came from); none means
 *  it is a `Metric`. */
export function checkMetric(value: unknown, file: string): MetricError[] {
  const out: MetricError[] = []
  const err = (message: string) =>
    out.push({ rule: "invalid-metric", file, message })
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    err("a metric is one object")
    return out
  }
  const m = value as Record<string, unknown>
  for (const k of Object.keys(m))
    if (!(KEYS as string[]).includes(k))
      err(`unknown key "${k}" (${KEYS.join(", ")})`)
  const str = (k: keyof Metric, required = true) => {
    const v = m[k]
    if (v == null) {
      if (required) err(`"${k}" is required`)
      return
    }
    if (typeof v !== "string" || !v.trim()) err(`"${k}" is a non-empty string`)
  }
  str("name")
  str("label")
  str("definition")
  if (typeof m.name === "string") {
    if (!/^[a-z][A-Za-z0-9]*$/.test(m.name))
      err(`name "${m.name}" is camelCase`)
  }
  if (!METRIC_TYPES.includes(m.type as never))
    err(`type is one of ${METRIC_TYPES.join(", ")}`)
  if (!METRIC_FORMATS.includes(m.format as never))
    err(`format is one of ${METRIC_FORMATS.join(", ")}`)
  if (m.better !== "higher" && m.better !== "lower")
    err(`better is higher or lower`)
  const col = (k: "numerator" | "denominator" | "column", need: boolean) => {
    const v = m[k]
    if (v == null) {
      if (need && m.compute == null) err(`a ${m.type} metric needs "${k}"`)
      return
    }
    if (typeof v !== "string" || !COLUMN.test(v))
      err(`"${k}" is a column name (${COLUMN})`)
  }
  const ratioLike =
    m.type === "ratio" || m.type === "mean" || m.type === "change"
  col("numerator", ratioLike)
  col("denominator", ratioLike)
  col("column", m.type === "sum" || m.type === "count")
  if (!ratioLike && (m.numerator != null || m.denominator != null))
    err(`a ${m.type} metric names "column", not numerator / denominator`)
  for (const k of ["scale", "decimals"] as const)
    if (m[k] != null && (typeof m[k] !== "number" || !Number.isFinite(m[k])))
      err(`"${k}" is a number`)
  if (m.decimals != null && (!Number.isInteger(m.decimals) || Number(m.decimals) < 0))
    err(`"decimals" is a whole number`)
  str("compute", false)
  return out
}
