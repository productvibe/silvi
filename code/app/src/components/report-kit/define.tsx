// A report as code: `app/src/reports/<id>/report.tsx`, its queries as `.sql`
// files beside it. Its default export is `defineReport(...)`:
//
//   import regions from "./regions.sql?raw"
//   type Region = { region: string; sales: number; orders: number }
//   export default defineReport({
//     meta: { title: "Example", description: "…" },
//     page: { filterBar: false },
//     queries: { regions: query<Region>(regions) },
//     components: (k) => [<k.CategoryBars key="r" series="regions" x="region" value="sales" />],
//   })
//
// The page's data is one array of rows per query, by the query's name, so
// `k` is `Kit<D>` (components.tsx): a series or a column the queries do not
// return fails `npm run typecheck`.
//
// Client-safe: `defineReport` and `query` only describe. The server turns
// the result into a ReportSpec and runs it (load.server.ts); the page draws
// it with `Page`.

import { useMemo, type ComponentType, type ReactElement } from "react"

import type { ParamFilter, ReportFilters } from "~/lib/filters"
import type { Grain } from "~/lib/report"

import { KIT, type Kit } from "./components"
import {
  KitPageView,
  type KitPageProps,
  type PageOptions,
  type ResolvedParam,
} from "./define-page"

/** One query: its SQL (a `.sql` file imported `?raw`), the row it returns
 *  (type-only) and the grain its rows are sliced on: "all" (default) as
 *  they are, "month" / "week" to the filter bar's range by a `month`
 *  (`YYYY-MM`) or `week` (`YYYY-Www`) column. `reconstruct` reshapes the
 *  sliced rows in code, on the server, for what the SQL cannot say; the
 *  page's data is then what it returns:
 *
 *    query(sql, { reconstruct: (rows: Sale[], f) => rows.map(...) })
 */
export type Query<R> = {
  sql: string
  grain: Grain
  reconstruct?: (rows: never[], filters: ReportFilters) => object[]
  readonly _row?: R
}

export function query<R extends object>(
  sql: string,
  opts?: { grain?: Grain }
): Query<R>
export function query<R extends object, O extends object>(
  sql: string,
  opts: {
    grain?: Grain
    reconstruct: (rows: R[], filters: ReportFilters) => O[]
  }
): Query<O>
export function query(
  sql: string,
  opts: {
    grain?: Grain
    reconstruct?: (rows: never[], filters: ReportFilters) => object[]
  } = {}
): Query<object> {
  return {
    sql,
    grain: opts.grain ?? "all",
    ...(opts.reconstruct ? { reconstruct: opts.reconstruct } : {}),
  }
}

type Queries = Record<string, Query<object>>

/** The page's data: each query's rows by its name. */
export type DataOf<Q extends Queries> = {
  [K in keyof Q]: Q[K] extends Query<infer R> ? R[] : never
}

export type ReportMeta = {
  /** the report's name, in the list, the breadcrumb and its "(i)" */
  title: string
  /** its one line, in the list and the "(i)" */
  description: string
  /** the connector its SQL runs on (a folder of app/src/connectors/);
   *  without it, SILVI_CONNECTOR, else the only one installed */
  connector?: string
}

/** PageOptions without what `meta` and the queries give. `filterParams`
 *  holds every report param: one with `input` is drawn as an input, the
 *  rest in the filter bar. */
export type ReportPage<D> = Omit<
  PageOptions<D>,
  "title" | "description" | "inputs" | "sql"
>

/** What a report.tsx exports. */
export type ReportDefinition = {
  meta: ReportMeta
  queries: Queries
  page: ReportPage<unknown>
  Page: ComponentType<KitPageProps>
}

export function defineReport<Q extends Queries>(r: {
  meta: ReportMeta
  page?: ReportPage<DataOf<Q>>
  queries: Q
  components: (k: Kit<DataOf<Q>>) => ReactElement[]
}): ReportDefinition {
  const page = (r.page ?? {}) as ReportPage<unknown>
  const params = page.filterParams ?? []
  const own = params.filter((p) => !p.input)
  const inputs = params.filter((p) => p.input)
  const sql = Object.fromEntries(
    Object.entries(r.queries).map(([name, q]) => [name, q.sql])
  )
  function Page(props: KitPageProps) {
    const components = useMemo(() => r.components(KIT as unknown as Kit<DataOf<Q>>), [])
    const options: PageOptions<unknown> = {
      ...page,
      title: r.meta.title,
      description: r.meta.description,
      filterParams: own,
      inputs: inputs.length ? resolvedParams(inputs, props.filters) : undefined,
      sql,
    }
    return <KitPageView options={options} components={components} {...props} />
  }
  return { meta: r.meta, queries: r.queries, page, Page }
}

/** The inputs with their options and default worked out for the request. */
function resolvedParams(
  declared: readonly ParamFilter[],
  f: ReportFilters
): ResolvedParam[] {
  // `accept` checks a URL's value on the server; the page needs none
  return declared.map(({ options, default: def, accept: _accept, ...rest }) => {
    const opts = options(f)
    return {
      ...rest,
      options: opts,
      default: def
        ? def(
            opts.map((o) => o.value),
            f
          )
        : opts[0]?.value,
    }
  })
}
