// The one route module every report is served by: the Reports module's
// screens (blocks/reports/routes.ts) mount it at /reports/<id> for a folder holding a
// `report.tsx`.
//
// The loader returns `{ title, filters, data, asOf }` with `data` UN-AWAITED;
// the page is the report's own `Page` (define.tsx). A report whose connector
// cannot run gets `connectorError` instead of data, and the page says what to
// set.

import type { LoaderFunctionArgs } from "react-router"
import { useLoaderData, useParams } from "react-router"

import { APP_NAME } from "~/lib/app"

import { loadKitReport } from "./load.server"
import { findReport } from "./pages"

export async function loader({ request, params }: LoaderFunctionArgs) {
  return loadKitReport(request, params.report ?? "")
}

type Loaded = Awaited<ReturnType<typeof loader>>

// The report's title as the last crumb (routes/shell.tsx) and the tab's title.
export const handle = {
  crumb: (data: Loaded | undefined) => data?.title ?? "Report",
}
export const meta = ({ data }: { data: Loaded | undefined }) => [
  { title: `${data?.title ?? "Report"} — ${APP_NAME}` },
]

export { ErrorBoundary } from "./report-shell"

export default function KitRoute() {
  const loaded = useLoaderData<typeof loader>()
  const id = useParams().report ?? ""
  const report = findReport(id)
  if (!report) throw new Response("No such report", { status: 404 })
  return (
    <report.Page
      id={id}
      filters={loaded.filters}
      data={loaded.data}
      asOf={loaded.asOf}
      connectorError={
        "connectorError" in loaded ? loaded.connectorError : undefined
      }
    />
  )
}
