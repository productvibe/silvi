import { NavLink } from "react-router"

import { listReports } from "~/components/report-kit/pages"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { APP_NAME } from "~/lib/app"

// The list of reports: one row per `app/src/reports/<id>/report.tsx`, read
// from the folder, so a report added there is listed with no edit here.

export const meta = () => [{ title: `Reports — ${APP_NAME}` }]

export default function ReportsIndex() {
  const rows = listReports()
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pt-10 pb-24 lg:px-12">
      <h1 className="text-[2.5rem] leading-[1.2] font-bold">Reports</h1>
      {rows.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.path}>
                <TableCell>
                  <NavLink to={r.path} className="hover:underline">
                    {r.title}
                  </NavLink>
                </TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {r.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No reports yet</EmptyTitle>
            <EmptyDescription>
              A report is a folder in app/src/reports/ with a report.tsx.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
