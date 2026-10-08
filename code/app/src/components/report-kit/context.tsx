// The two contexts a kit page renders in, and the types that bind a page's
// components to its spec.

import { createContext, useContext, type ReactNode } from "react"


import type { ReportFilters } from "~/lib/filters"
import type { ReportSpec } from "~/lib/report"

// ── Types: a component is checked against the data the spec returns ────────────

/** The loader data of a spec: what its `reconstruct` returns. */
export type DataOf<S> = S extends ReportSpec<infer T> ? T : S

/** The keys of the data that hold an array of rows — the page's series. */
export type SeriesOf<D> = {
  [K in keyof D]-?: D[K] extends readonly (infer R)[]
    ? R extends object
      ? K
      : never
    : never
}[keyof D] &
  string

export type RowOf<D, K extends keyof D> = D[K] extends readonly (infer R)[]
  ? R
  : never

/** The columns of one series. */
export type ColOf<D, K extends keyof D> = Extract<keyof RowOf<D, K>, string>

/** A title or description: fixed, or read off the data. */
export type Text<D> = string | ((data: D) => string)

/** A report's "(i)" content: its `<Info>`, `<Technical>` and `<Panel>`
 *  parts (info.tsx), as a function so the dialog draws it when it opens. */
export type InfoContent = () => ReactNode

// ── Contexts ───────────────────────────────────────────────────────────────

/** The report being drawn — for the "(i)" dialogs, which read its dialog and
 *  its SQL by name. Set above the shell, so the header dialog has it. */
export type KitReport = {
  id: string
  title: string
  description: string
  info?: InfoContent
  /** the loader's data, un-awaited: the header dialog sits outside the
   *  shell's Suspense boundary, so a `<Value>` awaits it itself */
  data?: Promise<unknown> | unknown
  /** the report's own SQL, by query name (its dialogs show these) */
  sql?: Record<string, string>
}

export const KitReportContext = createContext<KitReport | null>(null)

export function useKitReport(): KitReport {
  const r = useContext(KitReportContext)
  if (!r) throw new Error("report-kit component rendered outside a kit page")
  return r
}

/** The resolved data, inside the shell's Suspense boundary. */
export type KitData = {
  data: Record<string, unknown>
  filters: ReportFilters
  emptyText: string
}

export const KitDataContext = createContext<KitData | null>(null)

export function useKitData(): KitData {
  const d = useContext(KitDataContext)
  if (!d) throw new Error("report-kit component rendered outside a kit page")
  return d
}

export type Row = Record<string, unknown>

/** One series' rows (empty when the data has none under that name). */
export function useSeries(series: string): Row[] {
  const v = useKitData().data[series]
  return Array.isArray(v) ? (v as Row[]) : []
}

export function resolveText<D>(t: Text<D> | undefined, data: unknown) {
  return typeof t === "function" ? t(data as D) : t
}
