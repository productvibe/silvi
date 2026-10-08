// The dictionary: the terms the reports use that are not named metrics — a
// count, a status, a dimension — each with its rules, what it is built from
// and where it misleads. A named metric's words live in its YAML file
// (`<name>.yaml` beside this one); an entry here that carries `metric` adds
// only the rules and caveats that metric's one line has no room for, and its
// name and one line are the metric's own.
//
// Two readers, one text: the wiki's Metrics page (/wiki/reference/metrics,
// wiki/definitions.ts) writes every entry out, and a report reads it through
// `termOf` in `~/metrics`. Never restate an entry in a report or a page:
// amend it here.
//
// Plain data with relative type imports only.

import type { MetricName } from "./metrics"

export type TermInput = {
  /** "raw": the source system gives the value; "derived": we work it out */
  kind: "raw" | "derived"
  label: string
  /** where it comes from, or how it is worked out */
  detail: string
}

type TermBody = {
  /** the conditions, in the order they are applied */
  rules?: string[]
  inputs?: TermInput[]
  /** where the number misleads if read naively */
  caveats?: string[]
  /** unresolved questions: decisions still owed. None means settled. */
  open?: string[]
  /** ISO date of the last meaningful review */
  updated: string
  /** who decides what it means */
  owner?: string
}

// A metric's name; any string while there are no metric files (MetricName
// is then `never`, which would make an entry that carries one impossible).
type MetricRef = [MetricName] extends [never] ? string : MetricName

export type TermEntry = TermBody &
  (
    | { name: string; oneLine: string; metric?: never }
    | { metric: MetricRef; name?: never; oneLine?: never }
  )

// An entry, keyed by its id (kebab-case):
//
//   "net-sales": {
//     name: "Net sales",
//     oneLine: "Sales in the period, minus returns.",
//     rules: ["…"],
//     updated: "2026-10-07",
//   },
export const TERMS = {} as const satisfies Record<string, TermEntry>

export type TermId = keyof typeof TERMS

export const TERM_IDS = Object.keys(TERMS) as TermId[]

/** Which report publishes which term: one declaration, so a wiki entry's
 *  "Used by" is derived, never kept by hand. */
export const TERM_USAGE: { report: string; path: string; terms: TermId[] }[] = []
