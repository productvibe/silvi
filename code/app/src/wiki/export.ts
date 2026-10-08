import { APP_ID } from "~/lib/app"
import { data } from "react-router"

import type { Route } from "./+types/export"
import { renderDoc, renderPdf } from "./export.server"
import { sourceFor, wikiTree } from "./pages.server"
import { findPage } from "./tree"

// /wiki-export/<slug>?format=md|doc|pdf — the page as a file. Read-only and
// GET like the .xlsx export; the format decides the body and the extension.
// `md` is the source itself; `doc` is the compiled page rendered to plain HTML
// under Word's media type, which Word opens with headings, lists and tables
// intact; `pdf` is laid out server-side (export.server.ts).

export async function loader({ params, request }: Route.LoaderArgs) {
  const slug = (params["*"] ?? "").replace(/\/+$/, "")
  const page = findPage(wikiTree, slug)
  if (!page) throw data(null, { status: 404 })

  const format = new URL(request.url).searchParams.get("format") ?? "md"
  const base = `${APP_ID}-wiki-${page.slug.replace(/\//g, "-") || "brief"}`
  const disposition = (ext: string) => `attachment; filename="${base}.${ext}"`

  if (format === "md") {
    const body = `# ${page.title}\n\n${page.description ? `${page.description}\n\n` : ""}${sourceFor(page.file)}\n`
    return new Response(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": disposition("md"),
      },
    })
  }
  if (format === "doc") {
    return new Response(renderDoc(page), {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": disposition("doc"),
      },
    })
  }
  if (format === "pdf") {
    return new Response((await renderPdf(page)) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition("pdf"),
      },
    })
  }
  throw data(null, { status: 400 })
}
