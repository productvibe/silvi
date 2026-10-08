import { searchContent } from "~/lib/search.server"

import type { Route } from "./+types/search"

// Resource route backing the ⌘K palette: /search?q=<text> returns free-text
// matches across every JSON data file, tagged with the page they live on.
export async function loader({ request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  return { q, results: searchContent(q) }
}
