// The reports, from each report.tsx's `meta` (`title`, `description`): a
// report is listed by existing, with no list kept in code. Client-safe: a
// report.tsx only describes (define.tsx), so the list and the page import it.

import type { ReportDefinition } from "./define"

const REPORTS = import.meta.glob<ReportDefinition>("../../reports/*/report.tsx", {
  import: "default",
  eager: true,
})

const idOf = (k: string) => k.split("/")[3]

/** A report by its folder name. */
export function findReport(id: string): ReportDefinition | undefined {
  return REPORTS[`../../reports/${id}/report.tsx`]
}

/** Every report as the list shows it, by title. */
export function listReports(): { path: string; title: string; description: string }[] {
  return Object.entries(REPORTS)
    .map(([k, r]) => ({
      path: `/reports/${idOf(k)}`,
      title: r.meta.title,
      description: r.meta.description,
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
}
