import type { LucideIcon } from "lucide-react"

import { navItems } from "~/lib/nav"


/** A content match with the matched text split out so the UI can emphasise it. */
export type SearchSnippet = { before: string; match: string; after: string }

/** One content hit returned by the /search resource route. */
export type ContentResult = {
  /** route to navigate to */
  path: string
  /** title of the page the hit lives on */
  page: string
  /** breadcrumb-style context, e.g. "Wiki" */
  context: string
  snippet: SearchSnippet
}

/** A navigable page, pre-flattened for the command palette. */
export type PageEntry = {
  path: string
  title: string
  description?: string
  context: string
  icon: LucideIcon
  /** lowercase title + description + context, for client-side matching */
  haystack: string
}

// One entry per module, from the registry (lib/nav.ts). The wiki's pages are
// found through the content index (search.server.ts).
export const pageEntries: PageEntry[] = navItems.map((item) => ({
  path: item.path,
  title: item.title,
  description: item.description,
  context: "Modules",
  icon: item.icon,
  haystack: [item.title, item.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase(),
}))

/** Every whitespace-separated token of the query appears in the haystack. */
export function matchesPage(entry: PageEntry, query: string): boolean {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => entry.haystack.includes(token))
}
