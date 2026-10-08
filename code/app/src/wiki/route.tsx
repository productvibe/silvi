import { data } from "react-router"

import type { Crumb } from "~/components/page/content-header"
import { APP_NAME } from "~/lib/app"
import type { Route } from "./+types/route"
import { wikiComponents } from "./components"
import { WikiDownloadMenu } from "./download-menu"
import { HeaderSlot } from "~/components/page/header-slot"
import { Badge } from "~/components/ui/badge"
import { htmlFor, sourceFor, wikiTree } from "./pages.server"
import { WikiArticle } from "./page"
import { renderHtml } from "./render"
import { ancestors, findPage } from "./tree"

// The wiki: one route for every page under /wiki, the slug in the splat. The
// loader resolves the slug against the tree built from `wiki/**/*.md` and
// hands the shell what it needs to draw the header and the tree panel — the
// shell reads this loader's data by route id (`useRouteLoaderData`), , so it never imports the pages. Read-only
// by construction: the pages are files in the repo, parsed at build time, and
// changing one is a commit (by an AI builder or by hand), not an action here.

export function meta({ data }: Route.MetaArgs) {
  const title = data?.page.slug ? `${data.page.title} — Wiki` : "Wiki"
  return [{ title: `${title} — ${APP_NAME}` }]
}

export function loader({ params }: Route.LoaderArgs) {
  const slug = (params["*"] ?? "").replace(/\/+$/, "")
  const page = findPage(wikiTree, slug)
  if (!page) throw data(null, { status: 404 })

  // Wiki / folder / … / page. Every folder with an index page is a link — that
  // is the way back up — and a folder without one is a plain crumb, since there
  // is nothing to open. A folder's own index page ends on the folder's title.
  const folders = ancestors(wikiTree, page.slug)
  const isIndex = folders.at(-1)?.index?.slug === page.slug
  // The root crumb reads "Wiki" whatever its index page calls itself.
  const crumbs: Crumb[] = folders.map((f, i) =>
    f.index && !(isIndex && i === folders.length - 1)
      ? {
          label: f.slug ? f.title : "Wiki",
          to: f.slug ? `/wiki/${f.slug}` : "/wiki",
        }
      : f.slug
        ? f.title
        : "Wiki"
  )
  if (!isIndex) crumbs.push(page.title)

  return {
    tree: wikiTree,
    page,
    crumbs,
    source: sourceFor(page.file),
    content: htmlFor(page.file),
  }
}

export default function WikiPage({ loaderData }: Route.ComponentProps) {
  const { page, source, content } = loaderData

  return (
    <>
      <HeaderSlot>
        {/* `status: draft` in the frontmatter: the page is written but not yet
          agreed. A grey badge on the header row, beside the download menu. */}
        {page.status === "draft" && (
          <Badge variant="secondary" className="mr-2">
            Draft
          </Badge>
        )}
        <WikiDownloadMenu slug={page.slug} title={page.title} source={source} />
      </HeaderSlot>
      <WikiArticle title={page.title}>
        {renderHtml(content, wikiComponents)}
      </WikiArticle>
    </>
  )
}
