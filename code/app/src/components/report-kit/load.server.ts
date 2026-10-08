// The loader behind every report: a folder of `app/src/reports/` with a
// `report.tsx` (define.tsx). It finds the report by its folder name (the
// route's `:report`, route.tsx beside this file) and turns its queries into a ReportSpec: one
// fetch per request window, every query run once on the report's connector,
// each sliced on its grain.
//
// It returns `{ filters, data, asOf }` (plus `connectorError` when its
// connector cannot run), with `data` UN-AWAITED so the page streams it.

import { createHash } from "node:crypto"

import { connectorProblem } from "~/connectors/index.server"
import { parseFilters, resolveParams } from "~/lib/filters"
import { loadReport } from "~/lib/load-report.server"
import { report, type ReportSpec, type SnapshotRow } from "~/lib/report"

import { runCompiled } from "./data.server"
import type { ReportDefinition } from "./define"
import { compileSql } from "./sql"

const REPORTS = import.meta.glob<ReportDefinition>(
  "../../reports/*/report.tsx",
  { import: "default" }
)

/** A report's definition, or undefined when the folder has none. */
async function definitionFor(id: string) {
  return REPORTS[`../../reports/${id}/report.tsx`]?.()
}

// One spec per definition (a new object after an edit in dev).
const specs = new WeakMap<ReportDefinition, ReportSpec<unknown>>()

/** A report's spec: its queries run in ONE fetch over the wide window, with
 *  `$from`, `$to` and the page's params bound as positional parameters. */
export function reportSpec(id: string, r: ReportDefinition): ReportSpec<unknown> {
  const cached = specs.get(r)
  if (cached) return cached
  const queries = Object.entries(r.queries)
  const connector = r.meta.connector
  // the cache key changes with the SQL and the connector, so an edit (or a
  // deploy) never serves rows an older query fetched
  const hash = createHash("sha1")
    .update(
      JSON.stringify([
        queries.map(([n, q]) => [n, q.sql, q.grain]),
        connector ?? process.env.SILVI_CONNECTOR ?? "",
      ])
    )
    .digest("hex")
    .slice(0, 10)
  const params = r.page.filterParams ?? []
  // The params the SQL reads (`$period`): the fetch receives them and the
  // cache keys on their values; the rest only pick a view of the page.
  const sql = queries.map(([, q]) => q.sql).join("\n")
  const fetchParams = params
    .map((p) => p.param)
    .filter((p) => new RegExp(`\\$${p}\\b`).test(sql))
  const earliest = r.page.filterEarliest
  const spec = report<unknown>({
    id: `${id}#${hash}`,
    series: Object.fromEntries(queries.map(([n, q]) => [n, q.grain])),
    ...(fetchParams.length ? { fetchParams } : {}),
    filters: {
      ...(params.length ? { params } : {}),
      ...(earliest ? { earliest: () => earliest } : {}),
    },
    fetch: async (f) =>
      Object.fromEntries(
        await Promise.all(
          queries.map(async ([name, q]) => {
            const { text, args } = compileSql(q.sql, {
              vars: { ...f.params, from: f.from, to: f.to },
            })
            return [
              name,
              await runCompiled<SnapshotRow>(name, text, args, connector),
            ] as const
          })
        )
      ),
    // each query's own `reconstruct`, on its sliced rows
    ...(queries.some(([, q]) => q.reconstruct)
      ? {
          reconstruct: (sliced, f) =>
            Object.fromEntries(
              queries.map(([name, q]) => [
                name,
                q.reconstruct
                  ? q.reconstruct(sliced[name] as never[], f)
                  : sliced[name],
              ])
            ),
        }
      : {}),
  })
  specs.set(r, spec)
  return spec
}

/** A request's filters for a spec: defaults, earliest and the declared
 *  params resolved. */
export function filtersFor(spec: ReportSpec<unknown>, params: URLSearchParams) {
  const filters = parseFilters(params)
  const defaults = spec.filters?.defaults
  if (defaults && (!params.get("from") || !params.get("to"))) {
    Object.assign(filters, defaults(new Date(), params))
  }
  // A range may not start before the report's earliest day: clamped here, so
  // the page and its filter bar agree.
  const earliest = spec.filters?.earliest?.(new Date())
  if (earliest && filters.from && filters.from < earliest) {
    filters.from = earliest
    if (filters.to < earliest) filters.to = earliest
  }
  const declared = spec.filters?.params
  if (declared?.length) filters.params = resolveParams(declared, params, filters)
  return filters
}

export async function loadKitReport(request: Request, id: string) {
  const url = new URL(request.url)
  const r = await definitionFor(id)
  if (!r) throw new Response("No such report", { status: 404 })
  const spec = reportSpec(id, r)
  const filters = filtersFor(spec, url.searchParams)
  // A report whose connector cannot run (none chosen, its .env keys unset)
  // says so on the page instead of running.
  const connectorError = connectorProblem(r.meta.connector)
  return {
    title: r.meta.title,
    filters,
    ...(connectorError
      ? { data: null, asOf: null, connectorError }
      : loadReport(spec, filters)),
  }
}
