const number = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 })

export function formatNumber(value: number): string {
  return number.format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)} %`
}

const compacts = new Map<number, Intl.NumberFormat>()

/** A chart tick or value label, compact — "950", "1.2k", "3.4M"
 *  (DESIGN-REPORTS §7). The ONE compact format: the kit's y ticks, its
 *  `labels` and a page's own label column (a `total=` text) all print
 *  through it, so a label never reads "6,5K" beside a tick "8k". `decimals`
 *  is the most it prints (default 1): "6.5k", 6000 → "6k". The full number
 *  lives in the tooltip. */
export function formatCompact(value: number, decimals = 1): string {
  let f = compacts.get(decimals)
  if (!f) {
    f = new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: decimals,
    })
    compacts.set(decimals, f)
  }
  return f.format(value).replace("K", "k")
}

/** A ratio read as a multiple — "1,5×". Same sv-SE formatter as everything
 *  else on the page, so the decimal is a comma like the numbers beside it. */
export function formatMultiple(value: number, decimals = 1): string {
  return `${new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}×`
}

/**
 * A plain decimal — "3,5", "10,523" — for a figure that is neither a count,
 * a percentage nor a multiple: months of tenure, a rung on a ladder, an FX rate.
 * Same sv-SE formatter, so it sits beside the other numbers with a comma decimal.
 */
export function formatDecimal(value: number, decimals = 1): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** "2026-03" or "2026-03-01" → "Mar 2026" */
export function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * A money figure in millions — "1 234,5M".
 *
 * Volume in full kroner overflows both a chart's axis gutter and a table column,
 * so the reports that carry it state "NOK m" once above the table and print this.
 * It goes through the sv-SE formatter like every other number on the page: a bare
 * `toFixed(1)` prints "1234.5M", a dot-decimal thousands-less string sitting in a
 * column of space-grouped comma-decimal ones.
 */
export function formatMillions(value: number, decimals = 1): string {
  return `${new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 1e6)}M`
}

/** Month names for period labels. Not localized: the app is English-only and
 *  `toLocaleDateString` on a synthetic Date was how a UTC/local off-by-one crept
 *  into month labels once already. */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

/**
 * A period key as a label. `"2026-W34"` → `"W34"`, `"2026-08"` → `"Aug"`,
 * `"2026"` → `"2026"`; `long` gives `"2026-W34"` and `"Aug 2026"` instead.
 *
 * Short for a chart axis, which has no room for the year; long for a table,
 * which has no other date context. Several reports had their own copy of this
 * before it moved here.
 */
export function formatPeriod(key: string, long = false): string {
  if (key.includes("-W")) return long ? key : key.replace(/^\d{4}-/, "")
  // A year bucket is its own label at both sizes — there is nothing to trim.
  if (!key.includes("-")) return key
  const [year, month] = key.split("-")
  const name = MONTHS[Number(month) - 1] ?? month
  return long ? `${name} ${year}` : name
}

/** An ISO week key as PowerBI prints it: `"2026-W30"` → `"2026 W30"`. A
 *  chart with `xFormat="week"` draws it as two lines, the week over its year
 *  (`WeekTick`, report-charts.tsx). Any other key is returned as it is. */
export function formatIsoWeek(key: string): string {
  return /^\d{4}-W\d{2}$/.test(key) ? key.replace("-W", " W") : key
}

/**
 * Chart-axis labels for a set of period keys, made UNIQUE.
 *
 * THE BUG THIS EXISTS FOR: the default window on these reports is thirteen
 * months, so a month grain produces two bars labelled "Aug" — and since the
 * tooltip shows the axis label, hovering the older one reads "Aug: 1 749" while
 * the table's "Aug 2026" row says 2 873. It was reported as the chart not
 * matching the table; both numbers were right and the label was ambiguous.
 *
 * Labels stay short while they are distinct and take a two-digit year only when
 * they collide ("Aug 25", "Aug 26"), so the axis does not get noisier in the
 * common case. Pass the keys in any order; the returned map is keyed by period.
 */
export function uniquePeriodLabels(periods: string[]): Map<string, string> {
  const short = new Map(periods.map((p) => [p, formatPeriod(p)]))
  const counts = new Map<string, number>()
  for (const label of short.values())
    counts.set(label, (counts.get(label) ?? 0) + 1)
  const out = new Map<string, string>()
  for (const [period, label] of short) {
    const collides = (counts.get(label) ?? 0) > 1
    out.set(period, collides ? `${label} ${period.slice(2, 4)}` : label)
  }
  return out
}

/**
 * The period bucket in progress right now — "2026-W34", "2026-08", "2026".
 *
 * Reports mark this row partial so a half-week does not read as a collapse, so
 * it has to name the bucket the READER is in. Two rules, both of which have been
 * got wrong here:
 *
 * 1. Take the calendar day from LOCAL components. UTC is behind Oslo, so
 *    `getUTCDate()` in the evening names yesterday — and on the 1st of a month,
 *    or a Monday, that is the previous month or week, i.e. the marker lands on
 *    the bucket that just finished while the live one goes unmarked.
 * 2. Do the ISO-week arithmetic in UTC, on that local calendar day. Adding days
 *    to a local Date crosses DST boundaries and can land 23 or 25 hours away.
 */
export function currentPeriodKey(period: "week" | "month" | "year"): string {
  const d = new Date()
  if (period === "year") return String(d.getFullYear())
  if (period === "month")
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  // Shift to the Thursday of this ISO week — its year is the ISO week-year.
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3)
  const jan4 = new Date(Date.UTC(t.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((t.getTime() - jan4.getTime()) / 86_400_000 -
        3 +
        ((jan4.getUTCDay() + 6) % 7)) /
        7
    )
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`
}

/** "2026-08-12" → "12 Aug 2026"; anything unset → an en dash. For a record's
 *  own dates (a Workteam's start and end), read from a file, never a picker. */
export function formatDate(iso: string | null | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : "–"
}
