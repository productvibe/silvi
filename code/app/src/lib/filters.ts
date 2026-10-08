export type ReportFilters = {
  /** inclusive, YYYY-MM-DD, first day of a month */
  from: string
  /** inclusive, YYYY-MM-DD */
  to: string
  /** A kit report's own filters (`spec.filters.params`), resolved by its
   *  loader: param name → the value in force. They pick a VIEW of the one
   *  fetch — reconstruct reads them — and reach the SQL only when the spec
   *  lists them in `fetchParams` (the cache then keys on their values). */
  params?: Record<string, string>
}

/** One report-specific filter: a select in the filter bar's popover, carried
 *  in the URL as `?<param>=`. Declared in a client-safe file of the report's
 *  folder, because both the spec (which resolves it) and the page (which draws
 *  it) read it. */
export type ParamFilter = {
  param: string
  label: string
  /** the values it offers for the range in force (the filter bar renders
   *  outside the data's Suspense boundary, so they come from filters alone) */
  options: (f: ReportFilters) => { value: string; label: string; short?: string }[]
  /** the value when the URL names none or one not offered (default: the
   *  first option) */
  default?: (options: string[], f: ReportFilters) => string | undefined
  /** how the value reads in the trigger's summary: always, or only when it
   *  is not the default (a filter is worth naming only when it narrows) */
  summary?: "always" | "unlessDefault"
  /** A report.md input (`{% select %}`, `{% toggle %}`): a VIEW control,
   *  drawn in the one View trigger on the filter line rather than in the
   *  filter bar's popover. Resolved and carried the same way. A slider or
   *  number is drawn in its {% inputs %} card on the page, and `tabs` by its
   *  `{% tabs param %}`. */
  input?: "select" | "toggle" | "multi" | "slider" | "number" | "tabs"
  /** A value outside `options` the param still takes (a slider's number, a
   *  month or a value the page's data offers). Server-side only: never sent
   *  to the page. */
  accept?: (value: string) => boolean
  /** What the page needs to draw an input whose options or default come
   *  from the data (paths into it; report-kit input-values.ts). */
  meta?: { optionsFrom?: string; defaultFrom?: string }
}

/** The value of each declared param for a request: the URL's if offered,
 *  otherwise the default. A param with no options is left out. */
export function resolveParams(
  declared: readonly ParamFilter[],
  searchParams: URLSearchParams,
  f: ReportFilters
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const d of declared) {
    const values = d.options(f).map((o) => o.value)
    const asked = searchParams.get(d.param)
    const value =
      asked != null && (values.includes(asked) || d.accept?.(asked))
        ? asked
        : d.default
          ? d.default(values, f)
          : values[0]
    if (value != null) out[d.param] = value
  }
  return out
}

/**
 * Format from LOCAL components, never `toISOString()`.
 *
 * `toISOString()` converts to UTC first, so in Oslo it reports yesterday's date
 * for the first one or two hours of every day — which silently shortens every
 * report's default window by a day and drops the current day's rows.
 */
export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Trailing 12 complete months plus the running month. */
export function defaultDateRange(today = new Date()): {
  from: string
  to: string
} {
  const y = today.getFullYear()
  const m = today.getMonth()
  return {
    from: isoDate(new Date(y - 1, m, 1)),
    to: isoDate(today),
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseFilters(
  searchParams: URLSearchParams,
  today = new Date()
): ReportFilters {
  const defaults = defaultDateRange(today)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  return {
    from: from && DATE_RE.test(from) ? from : defaults.from,
    to: to && DATE_RE.test(to) ? to : defaults.to,
  }
}
