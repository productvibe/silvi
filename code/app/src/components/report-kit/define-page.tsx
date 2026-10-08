// A kit page: the shell (ReportShell: header "(i)", filter bar, Suspense),
// the grid, each component's card, empty state and "(i)", and a skeleton derived
// from the same component list. A report.tsx's `Page` (define.tsx) is drawn with
// it, its options from the report's `meta` and `page`.

import type { ReactElement } from "react"

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import type { ParamFilter, ReportFilters } from "~/lib/filters"

import {
  KitDataContext,
  KitReportContext,
  type InfoContent,
  type SeriesOf,
} from "./context"
import { KitInfoDialog } from "./info"
import { InputControls } from "./input-controls"
import { Layout, LayoutSkeleton } from "./layout"
import { useParamFilters } from "./param-filters"
import { ReportShell } from "./report-shell"

/** A report-specific filter as the page draws it: `ParamFilter` with its
 *  options worked out for the request. */
export type ResolvedParam = Omit<ParamFilter, "options" | "default" | "accept"> & {
  options: { value: string; label: string }[]
  default?: string
}

export type PageOptions<D> = {
  /** the report's name, in its "(i)" and the breadcrumb */
  title: string
  /** its one line, in the "(i)" */
  description: string
  /** the report's "(i)" content: its Info, Technical and Panel parts
   *  (info.tsx) */
  info?: InfoContent
  /** when this series is empty the page says so instead of drawing components */
  empty?: { series: SeriesOf<D>; text: string }
  /** what an empty component says (default "No data in this range") */
  emptyText?: string
  /** draw the date filter (default true) */
  filterBar?: boolean
  width?: "6xl" | "7xl"
  /** a header button that saves the page as HTML, to this file name */
  downloadHtml?: string
  /** restrict the date control to these presets, with no Start/End fields
   *  (DESIGN.md: a page read per fixed period offers only those presets) */
  filterPresets?: string[]
  /** the earliest day the date control offers (the spec's `earliest`) */
  filterEarliest?: string
  /** the report's own filters, drawn in the filter bar's popover — the same
   *  list its spec declares in `filters.params` */
  filterParams?: readonly ParamFilter[]
  /** the page's inputs, drawn as one View trigger on the filter line */
  inputs?: readonly ResolvedParam[]
  inputsLabel?: string
  /** where the "(i)" puts its "Data as of" line */
  asOfIn?: "header" | "info"
  /** the report's SQL by query name, for its dialogs */
  sql?: Record<string, string>
}

export type KitPageProps = {
  /** the report's folder name, from the URL */
  id: string
  filters: ReportFilters
  data: Promise<unknown> | unknown
  asOf: number | null
  /** why the report's connector cannot run: shown in place of the data */
  connectorError?: string
}

/** A kit page drawn from its options and its list of components — what a
 *  report.tsx's `Page` renders (define.tsx). */
export function KitPageView({
  options,
  components: list,
  id,
  filters,
  data,
  asOf,
  connectorError,
}: KitPageProps & {
  options: PageOptions<unknown>
  components: ReactElement[]
}) {
  const emptyText = options.emptyText ?? "No data in this range"
  const params = useParamFilters(options.filterParams, filters)
  return (
    <KitReportContext.Provider
      value={{
        id,
        title: options.title,
        description: options.description,
        info: options.info,
        data,
        sql: options.sql,
      }}
    >
      <ReportShell
        title={options.title}
        description={options.description}
        info={<KitInfoDialog asOfIn={options.asOfIn} />}
        filters={filters}
        data={data}
        asOf={asOf}
        error={connectorError}
        filterBar={options.filterBar}
        filterPresets={options.filterPresets}
        filterEarliest={options.filterEarliest}
        filterExtra={params.extra}
        filterExtraSummary={params.summary}
        controls={
          options.inputs?.length ? (
            <InputControls
              inputs={options.inputs}
              filters={filters}
              label={options.inputsLabel}
            />
          ) : undefined
        }
        width={options.width}
        downloadFilename={options.downloadHtml}
        skeleton={<LayoutSkeleton components={list} />}
      >
        {(d) => {
          const resolved = (d ?? {}) as Record<string, unknown>
          const e = options.empty
          const empty =
            e != null &&
            !(
              Array.isArray(resolved[e.series as string]) &&
              (resolved[e.series as string] as unknown[]).length > 0
            )
          return empty ? (
            <Alert>
              <AlertTitle>No data</AlertTitle>
              <AlertDescription>{e.text}</AlertDescription>
            </Alert>
          ) : (
            <KitDataContext.Provider
              value={{ data: resolved, filters, emptyText }}
            >
              <Layout components={list} />
            </KitDataContext.Provider>
          )
        }}
      </ReportShell>
    </KitReportContext.Provider>
  )
}
