// How a component prints a value. Every figure goes through ~/lib/format, so a
// page never formats a number itself (product/DESIGN.md → Tables).

import {
  formatDate,
  formatDecimal,
  formatMillions,
  formatMonth,
  formatMultiple,
  formatNumber,
  formatPercent,
} from "~/lib/format"

/** The numeric formats. "count" is a whole number from 100 up and one
 *  decimal below it (a count averaged or summed from decimals); "in_millions"
 *  a value over a million as a plain decimal, its unit in `suffix`
 *  (`{format: "in_millions", suffix: " MNOK"}` → "45,2 MNOK"). */
export type NumericFmt =
  | "number"
  | "count"
  | "percent"
  | "percent0"
  | "decimal"
  | "millions"
  | "in_millions"
  | "multiple"

/** A numeric format with a leading "+" prints a sign on a positive value
 *  too ("+1 234", "−56", "+2.5 %"): a change, not a level. */
export type Fmt = NumericFmt | `+${NumericFmt}` | "month" | "date" | "text"

/** Every format, for the schema's checks. */
export const NUMERIC_FORMATS: NumericFmt[] = [
  "number",
  "count",
  "percent",
  "percent0",
  "decimal",
  "millions",
  "in_millions",
  "multiple",
]
export const FORMATS: string[] = [
  ...NUMERIC_FORMATS,
  ...NUMERIC_FORMATS.map((f) => `+${f}`),
  "month",
  "date",
  "text",
]

export type FmtSpec = {
  format?: Fmt
  prefix?: string
  suffix?: string
  /** decimals for "decimal", "percent", "millions" and "multiple" (default 1) */
  decimals?: number
}

export const DASH = "–"

const ISO_MONTH = /^\d{4}-\d{2}(-\d{2})?$/

export const isNumeric = (f: Fmt | undefined) =>
  NUMERIC_FORMATS.includes((f ?? "number").replace(/^\+/, "") as NumericFmt)

/** A value as the page prints it; null, undefined and "" are an en dash. A
 *  string under a numeric format is printed as it is (a label already made). */
export function fmt(
  v: unknown,
  { format: f = "number", prefix = "", suffix = "", decimals }: FmtSpec = {}
): string {
  const signed = f.startsWith("+")
  const format = f.replace(/^\+/, "") as Fmt
  // An empty string under `text` is a blank cell by intent (a total row's
  // label column); anything else missing is a dash.
  if (v === "" && format === "text") return ""
  if (v == null || v === "") return DASH
  if (typeof v !== "number") {
    const s = String(v)
    // A month key ("2026-03") prints as "Mar 2026"; any other text in the
    // column (a total row's label) prints as it is.
    if (format === "month") return ISO_MONTH.test(s) ? formatMonth(s) : s
    if (format === "date") return formatDate(s)
    return `${prefix}${s}${suffix}`
  }
  if (!Number.isFinite(v)) return DASH
  const s = numberText(v, format, decimals)
  // the formatters print a minus already; a sign is added on the plus side
  return `${prefix}${signed && v > 0 ? "+" : ""}${s}${suffix}`
}

/** A number in a format, without prefix, suffix or a plus sign. */
export function numberText(v: number, format: Fmt, decimals?: number): string {
  return format === "percent"
      ? formatPercent(v, decimals)
      : format === "percent0"
        ? formatPercent(v, 0)
        : format === "decimal"
          ? formatDecimal(v, decimals)
          : format === "millions"
            ? formatMillions(v, decimals)
            : format === "in_millions"
              ? formatDecimal(v / 1e6, decimals)
              : format === "multiple"
                ? formatMultiple(v, decimals)
                : format === "count"
                  ? Math.abs(v) >= 100
                    ? formatNumber(v)
                    : formatDecimal(v, decimals)
                  : format === "text"
                    ? String(v)
                    : formatNumber(v)
}
