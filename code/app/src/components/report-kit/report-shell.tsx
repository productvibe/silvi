import type { ReactNode } from "react"
import { Suspense, useRef } from "react"
import { Await, isRouteErrorResponse, useNavigation } from "react-router"
import { Download } from "lucide-react"

import { FilterBar } from "~/components/report-kit/filter-bar"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { downloadReportHtml } from "~/lib/export-html"
import type { ReportFilters } from "~/lib/filters"
import { cn } from "~/lib/utils"

import { HeaderSlot } from "~/components/page/header-slot"
import { InfoDialog } from "~/components/report-kit/info-dialog"

// Shared frame for every report. Owns the page container, the header row (filter
// bar + optional HTML download), and the <Suspense>/<Await> streaming wrapper with a default skeleton and error fallback. A report's
// route.tsx supplies metadata + the loader's `data`/`asOf`; the report's own
// `report.tsx` renders the data via the `children` render-prop. See
// product/docs/report-architecture.html.

// Notion's full-width page: the content takes the column it is given, up to
// 1600 px, so a wide table fits on a large screen instead of scrolling. The
// two keys are kept for callers; both mean the same cap.
const MAX_WIDTH = { "6xl": "max-w-[100rem]", "7xl": "max-w-[100rem]" } as const

type ReportShellProps<T> = {
  title: string
  description?: string
  /** The page's parsed filters. Omit for a page with no filter bar (a static
   *  report); the bar is then not drawn. */
  filters?: ReportFilters
  /** Un-awaited loader data — streamed under <Suspense>. Pass a plain value
   *  instead when the loader already awaited it: the body then renders in the
   *  same pass, with no Suspense boundary and so no streamed-in `<div hidden>`
   *  copy of it. That copy is harmless for a page of numbers, but a page whose
   *  interactive parts are portals (dialogs opened from table rows) can end up
   *  with the inert copy on screen. */
  data: Promise<T> | T
  /** Why the data cannot be read at all (the report's connector is not set
   *  up): shown in place of the body. */
  error?: string
  /** Data freshness (epoch ms): when the snapshot (or live query) behind the
   *  numbers was built. Shown as "Data as of …" inside the "(i)" dialog. */
  asOf: number | null
  /** Show the date filter bar (default true). */
  filterBar?: boolean
  /** Report-specific filters, rendered INSIDE the same popover as the
   *  date (compose as `Field` + `FieldLabel`). A page must never grow a second
   *  filter control, so this is the only way to add one. */
  filterExtra?: ReactNode
  /** How those extra filters read in the bar's trigger summary, e.g. "Aug 2026". */
  filterExtraSummary?: string
  /** Restrict the date control to these presets, with no Start/End fields. */
  filterPresets?: string[]
  /** The earliest day a range may start on: the date control offers none
   *  before it (the loader clamps the URL the same way). */
  filterEarliest?: string
  /** View controls drawn on the filter line, left of the filter bar (a kit
   *  page's inputs: one View trigger). */
  controls?: ReactNode
  /** Anything else the loader's data depends on beyond the dates (a
   *  report-specific filter), so changing it shows the skeleton again. */
  dataKey?: string
  /** @deprecated The title is always printed (40 px bold, as a Notion page
   *  opens), except on a `bleed` page. Accepted so existing callers keep
   *  working; it has no effect. */
  showTitle?: boolean
  width?: keyof typeof MAX_WIDTH
  /** Fill the content column edge to edge and to its full height, with no
   *  padding, max-width or filter row: for a page that lays out its own
   *  columns (a slide list beside its stage, say) and portals its
   *  filter into the header itself. Pass `filterBar={false}` with it. */
  bleed?: boolean
  /** The report's "(i)" dialog — portalled into the global breadcrumb bar, where
   *  it carries the report's name, description and documentation. */
  info?: ReactNode
  /** Optional content rendered above the body (e.g. a commentary paragraph). */
  intro?: ReactNode
  /** Optional custom loading skeleton (default: generic placeholders). */
  skeleton?: ReactNode
  /** When set, show a header button that downloads a self-contained HTML copy of
   *  the rendered report to this filename (".html" appended if missing). */
  downloadFilename?: string
  children: (data: T) => ReactNode
}

export function ReportShell<T>({
  title,
  description,
  filters,
  data,
  filterBar = true,
  filterExtra,
  filterExtraSummary,
  filterPresets,
  filterEarliest,
  controls,
  dataKey,
  showTitle: _showTitle,
  width = "6xl",
  bleed = false,
  info,
  intro,
  skeleton,
  downloadFilename,
  children,
  error,
}: ReportShellProps<T>) {
  const navigation = useNavigation()
  const pending = navigation.state === "loading"
  const rootRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={rootRef}
      className={cn(
        "transition-opacity",
        bleed
          ? "flex h-full min-h-0 flex-col"
          : cn(
              "mx-auto flex w-full flex-col gap-6 px-6 pt-10 pb-24 lg:px-12",
              MAX_WIDTH[width]
            ),
        pending && "opacity-60"
      )}
    >
      {/* The report's name and description are NOT printed on the page: the
          breadcrumb bar names it, and the "(i)" dialog (portalled into that same
          bar) carries the name, the description, the data's as-of stamp and the
          full documentation.

          A report that passes no `info` still gets the dialog, built from the
          title and description it already passes here — otherwise the pages
          without written documentation would be the pages with no way to see
          how old their snapshot is (product/DESIGN.md → Page header).
          InfoDialog drops its tab strip when there is no content to put in it. */}
      <HeaderSlot>
        {info ?? <InfoDialog title={title} description={description} />}
      </HeaderSlot>

      {/* The page's own title, as a Notion page opens: 40 / 48 bold. The
          chapter it names is also the last crumb, but a dashboard reads from
          its title down, not from the bar above it. Its description stays in
          the "(i)". */}
      {!bleed && (
        <h1
          data-slot="report-title"
          className="text-[2.5rem] leading-[1.2] font-bold"
        >
          {title}
        </h1>
      )}

      {(downloadFilename || filterBar || controls) && (
        <header className="-mt-2 flex flex-wrap items-center justify-end gap-2">
          {controls}
          <div className="flex items-center gap-2">
            {downloadFilename && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-export-exclude
                onClick={() =>
                  rootRef.current &&
                  downloadReportHtml(rootRef.current, downloadFilename, title)
                }
              >
                <Download />
                Download HTML
              </Button>
            )}
            {filterBar && filters && (
              <FilterBar
                filters={filters}
                extra={filterExtra}
                extraSummary={filterExtraSummary}
                presetLabels={filterPresets}
                earliest={filterEarliest}
              />
            )}
          </div>
        </header>
      )}

      {intro}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Not connected</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : isPromise<T>(data) ? (
        <Suspense
          fallback={skeleton ?? <DefaultSkeleton />}
          key={`${filters?.from}:${filters?.to}:${dataKey ?? ""}`}
        >
          <Await resolve={data} errorElement={<QueryError />}>
            {(d) => children(d as T)}
          </Await>
        </Suspense>
      ) : (
        children(data)
      )}
    </div>
  )
}

/** Thenable check rather than `instanceof Promise`: loader data crosses a
 *  serialization boundary and a deferred value may be any promise-like. */
function isPromise<T>(value: Promise<T> | T): value is Promise<T> {
  return typeof (value as { then?: unknown } | null)?.then === "function"
}

function DefaultSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

/** Body-level error fallback (shown inside the shell when the data promise
 *  rejects — the database unreachable, or SQL broken by an upstream change). */
export function QueryError() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Query failed</AlertTitle>
      <AlertDescription>
        Could not load data. The database may be unreachable, or a query may
        have broken upstream — try again.
      </AlertDescription>
    </Alert>
  )
}

/** Shared route-level error boundary. Re-export from a report's route.tsx:
 *  `export { ErrorBoundary } from "~/components/report-kit/report-shell"`. */
export function ErrorBoundary({ error }: { error: unknown }) {
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "Unknown error"
  return (
    <div className="p-8">
      <Alert variant="destructive">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  )
}
