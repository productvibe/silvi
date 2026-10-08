// Report authoring core. A report.tsx becomes a `spec` (report-kit
// load.server.ts), which `load-report.server.ts` consumes generically.
//
// A spec maps the report's output onto named, period-keyed "series" so one
// query per report can be run over a wide window and sliced back to
// whatever range the filter bar asks for. `fetch` runs the report's queries for
// a range; the optional `reconstruct` reassembles sliced series into the shape
// the loader returns (defaults to returning the sliced series object as-is).

import { format, parseISO } from "date-fns"

import type { ParamFilter, ReportFilters } from "~/lib/filters"

// "month"/"week" rows are sliced to the requested date range; "all" rows are
// returned unsliced (for range-independent data — latest-value rows, fixed-year
// YTD series, driver-tree blobs).
export type Grain = "month" | "week" | "all"
export type SnapshotRow = Record<string, string | number | null>

/** Either a grain (period field defaults to the grain name) or an explicit
 *  grain + the row field holding the period label. */
export type SeriesSpec = Grain | { grain: Grain; field: string }

export type ReportSpec<T = Record<string, SnapshotRow[]>> = {
  id: string
  /** Output array name → how it is stored and sliced. */
  series: Record<string, SeriesSpec>
  /** The filters the report accepts beyond parseFilters' dates.
   *  Read by the report-kit's shared route, which parses a request for every
   *  kit report. */
  filters?: {
    /** The range a link with no `from` / `to` opens on, when the default
     *  trailing year does not suit (e.g. data that starts later). It gets the
     *  request's query too, for a fixed window that depends on one of the
     *  report's own filters (P2 Potential's rolling year starts on a full
     *  week or a full month, by `?period=`). */
    defaults?: (
      today: Date,
      query: URLSearchParams
    ) => Pick<ReportFilters, "from" | "to">
    /** Report-specific filters (a select each), resolved into
     *  `filters.params` for reconstruct. The page draws the same list
     *  (KitPageView's `filterParams`). */
    params?: readonly ParamFilter[]
    /** The earliest day a range may start on (YYYY-MM-DD), for a report
     *  that reads only a bounded window (`windowStart` for the wide one): the
     *  loader clamps `from` (and `to`) to it, so the page never covers a
     *  stretch the report did not read, and the filter bar offers no earlier
     *  day. */
    earliest?: (today: Date) => string
  }
  /** Page inputs (`filters.params`) the queries read: the cache keys on
   *  their values and the fetch receives them. */
  fetchParams?: readonly string[]
  /** Run the report's queries for `filters`, returning rows per series. */
  fetch: (filters: ReportFilters) => Promise<Record<string, SnapshotRow[]>>
  /** Reassemble sliced series into the loader's shape (default: identity). */
  reconstruct?: (
    sliced: Record<string, SnapshotRow[]>,
    filters: ReportFilters
  ) => T | Promise<T>
}

/** Identity helper for typing/consistency; returns the spec unchanged. */
export function report<T>(spec: ReportSpec<T>): ReportSpec<T> {
  return spec
}

export function seriesGrain(s: SeriesSpec): Grain {
  return typeof s === "string" ? s : s.grain
}

export function seriesField(s: SeriesSpec): string {
  return typeof s === "string" ? s : s.field
}

const WINDOW_MONTHS = 24

/** Trailing `WINDOW_MONTHS` (first of the oldest month) through today. */
export function wideWindow(today = new Date()): { from: string; to: string } {
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()
  const from = new Date(Date.UTC(y, m - (WINDOW_MONTHS - 1), 1))
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  }
}

/** The first day the wide window reads (the first of the oldest month). */
export function windowStart(today = new Date()): string {
  return wideWindow(today).from
}

/** "2025-07-01" → "2025-07" */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** "2025-07-01" → "2025-W27" (ISO week-year + week, matching the SQL). */
export function weekKey(isoDate: string): string {
  return format(parseISO(isoDate), "RRRR-'W'II")
}
