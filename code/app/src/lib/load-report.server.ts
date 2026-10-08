// Serving a report's data — live from its connector, on every request.
//
//  1. **Fetch the WIDE window, slice to the filter range.** A report's `spec`
//     declares its output as period-keyed series, so one query per report
//     answers EVERY date range the filter bar can ask for. Changing the range
//     re-slices in memory instead of re-querying.
//  2. **`spec.reconstruct`** reassembles the sliced series into the shape the
//     page wants.
//
// Everything goes through `cached()` (query-cache.server.ts), which also
// dedupes in-flight queries.
//
// The one rule for callers: `loadReport` returns `data` UN-AWAITED so the route
// can stream it under <Suspense>. Awaiting it in a loader turns a 2 s query into
// 2 s of blank page.

import { cached, cachedAt } from "~/lib/query-cache.server"
import type { ReportFilters } from "~/lib/filters"
import {
  monthKey,
  seriesField,
  seriesGrain,
  weekKey,
  wideWindow,
  type ReportSpec,
  type SnapshotRow,
} from "~/lib/report"

/** Cache key for one report. The wide window's end is today, so the key
 *  rolls over at the date change as well as when the entry expires. */
function reportKey(spec: ReportSpec<unknown>, filters: ReportFilters): string {
  const window = wideWindow()
  const params = (spec.fetchParams ?? [])
    .map((p) => `:${p}=${filters.params?.[p] ?? ""}`)
    .join("")
  return `report:${spec.id}:${window.from}:${window.to}${params}`
}

/** The page inputs a spec's fetch reads, from the request's filters. */
function fetchParamsOf(spec: ReportSpec<unknown>, filters: ReportFilters) {
  if (!spec.fetchParams?.length) return {}
  return {
    params: Object.fromEntries(
      spec.fetchParams.map((p) => [p, filters.params?.[p] ?? ""])
    ),
  }
}

/** Run the report's own queries over the wide window, cached. */
function fetchWide(
  spec: ReportSpec<unknown>,
  filters: ReportFilters
): Promise<Record<string, SnapshotRow[]>> {
  const window = wideWindow()
  return cached(reportKey(spec, filters), () =>
    spec.fetch({
      from: window.from,
      to: window.to,
      ...fetchParamsOf(spec, filters),
    })
  )
}

/** Slice each declared series to the rows whose period falls in [from, to].
 *  Month-grain rows compared as "YYYY-MM", week-grain as "YYYY-Www".
 *
 *  The bounds are worked out only for a grain the spec has: a report whose
 *  series are all "all" may carry no dates at all (`from: ""`), and
 *  `weekKey("")` throws. */
function sliceSeries(
  fetched: Record<string, SnapshotRow[]>,
  filters: ReportFilters,
  spec: ReportSpec<unknown>
): Record<string, SnapshotRow[]> {
  const bounds = {
    month: () => [monthKey(filters.from), monthKey(filters.to)],
    week: () => [weekKey(filters.from), weekKey(filters.to)],
  }

  const out: Record<string, SnapshotRow[]> = {}
  for (const [series, def] of Object.entries(spec.series)) {
    const grain = seriesGrain(def)
    if (grain === "all") {
      // Range-independent: return every row untouched.
      out[series] = fetched[series] ?? []
      continue
    }
    const field = seriesField(def)
    const [lo, hi] = bounds[grain]()
    out[series] = (fetched[series] ?? []).filter((row) => {
      const period = String(row[field])
      return period >= lo && period <= hi
    })
  }
  return out
}

/** Read a report's data for `filters`, from its connector. */
export async function getReport<T>(
  spec: ReportSpec<T>,
  filters: ReportFilters
): Promise<T> {
  const fetched = await fetchWide(spec as ReportSpec<unknown>, filters)
  const sliced = sliceSeries(fetched, filters, spec as ReportSpec<unknown>)
  return (spec.reconstruct ? spec.reconstruct(sliced, filters) : sliced) as T
}

/** When this report's rows were read, for the "Data as of" line — the moment
 *  the cached query ran, or now if this request is the one running it. Costs no
 *  await, so it cannot delay first paint. */
export function reportAsOf(
  spec: ReportSpec<unknown>,
  filters: ReportFilters
): number {
  return cachedAt(reportKey(spec, filters)) ?? Date.now()
}

/** Loader data for a report: `{ data, asOf }`. `data` is left UN-AWAITED so the
 *  route streams it under <Suspense>; see the note at the top of this file. */
export function loadReport<T>(
  spec: ReportSpec<T>,
  filters: ReportFilters
): { data: Promise<T>; asOf: number } {
  return {
    data: getReport(spec, filters),
    asOf: reportAsOf(spec as ReportSpec<unknown>, filters),
  }
}
