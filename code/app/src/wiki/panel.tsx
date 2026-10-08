import { useEffect, useState } from "react"
import { ChevronRight, FileText } from "lucide-react"
import { NavLink, useLocation } from "react-router"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { cn } from "~/lib/utils"
import type { WikiFolder, WikiNode, WikiPage } from "./tree"

/**
 * The wiki's page tree, drawn as Notion's sidebar tree (measured on
 * app.notion.com, 2026-09-29) and nested under the sidebar's Wiki row rather
 * than in a second panel: 30 px rows at 14/21 regular in the sidebar grey, a
 * 12 px step in per level, every row led by the same page glyph. On a folder
 * the glyph turns into the fold chevron under the pointer. The selected row takes the
 * sidebar's accent fill and the page's own text colour. Folders start shut;
 * landing anywhere inside one — by its row, a crumb or ⌘K — unfolds it.
 */

const ROW =
  "group/row flex h-[1.875rem] w-full min-w-0 items-center gap-2.5 rounded-md pr-2 text-left text-sm leading-[1.3125rem] font-normal text-sidebar-foreground outline-hidden transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
const ACTIVE = "bg-sidebar-accent text-sidebar-accent-foreground"

const href = (slug: string) => (slug ? `/wiki/${slug}` : "/wiki")
/** Notion's indent: 8 px, then 12 px per level. */
const indent = (depth: number) => ({ paddingLeft: 8 + depth * 12 })

/** Every row's glyph is Notion's page glyph — a page and a folder alike, as
 *  in Notion, where a folder is a page with subpages. One quiet shape down
 *  the column instead of a picture per section (the frontmatter `icon:` is
 *  no longer drawn here). */
function RowIcon({ className }: { className?: string }) {
  return (
    <FileText
      className={cn(
        "size-5 shrink-0 stroke-[1.65] text-icon",
        className
      )}
    />
  )
}

/** The tree under the sidebar's Wiki row. The root index is that row itself,
 *  so the tree starts at the root's children, one level in. */
export function WikiTree({ tree }: { tree: WikiFolder }) {
  const { pathname } = useLocation()
  return (
    <ul className="flex flex-col gap-px group-data-[collapsible=icon]:hidden">
      {tree.children.map((node) => (
        <Node key={node.slug} node={node} depth={1} pathname={pathname} />
      ))}
    </ul>
  )
}

function Node({
  node,
  depth,
  pathname,
}: {
  node: WikiNode
  depth: number
  pathname: string
}) {
  // A folder holding only its index is a page to the reader: no chevron with
  // nothing under it.
  if (node.kind === "folder" && node.children.length === 0 && node.index) {
    return (
      <PageRow
        page={node.index}
        depth={depth}
        pathname={pathname}
      />
    )
  }
  if (node.kind === "page")
    return <PageRow page={node} depth={depth} pathname={pathname} />
  return <FolderRow folder={node} depth={depth} pathname={pathname} />
}

function PageRow({
  page,
  depth,
  pathname,
}: {
  page: WikiPage
  depth: number
  pathname: string
}) {
  return (
    <li>
      <NavLink
        to={href(page.slug)}
        end
        style={indent(depth)}
        className={cn(ROW, pathname === href(page.slug) && ACTIVE)}
      >
        <RowIcon />
        <span className="min-w-0 flex-1 truncate">{page.title}</span>
      </NavLink>
    </li>
  )
}

function FolderRow({
  folder,
  depth,
  pathname,
}: {
  folder: WikiFolder
  depth: number
  pathname: string
}) {
  const inside =
    pathname === href(folder.slug) ||
    pathname.startsWith(`${href(folder.slug)}/`)
  const [open, setOpen] = useState(inside)
  // Landing anywhere inside the folder unfolds it.
  useEffect(() => {
    if (inside) setOpen(true)
  }, [inside, pathname])

  // Notion's toggle: the row's icon, swapped for a chevron under the pointer.
  const toggle = (
    <CollapsibleTrigger
      aria-label={`${open ? "Fold" : "Unfold"} ${folder.title}`}
      onClick={(e) => e.stopPropagation()}
      className="relative flex size-5 shrink-0 items-center justify-center rounded-sm outline-hidden hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <RowIcon
        className="group-hover/row:opacity-0"
      />
      <ChevronRight
        className={cn(
          "absolute size-4 stroke-[1.5] text-icon opacity-0 transition-transform duration-150 group-hover/row:opacity-100",
          open && "rotate-90"
        )}
      />
    </CollapsibleTrigger>
  )
  const label = <span className="min-w-0 flex-1 truncate">{folder.title}</span>

  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col">
        {folder.index ? (
          <div
            style={indent(depth)}
            className={cn(
              ROW,
              pathname === href(folder.slug) && ACTIVE
            )}
          >
            {toggle}
            <NavLink
              to={href(folder.slug)}
              end
              onClick={() => setOpen(true)}
              className="flex h-full min-w-0 flex-1 items-center outline-hidden"
            >
              {label}
            </NavLink>
          </div>
        ) : (
          <div style={indent(depth)} className={ROW}>
            {toggle}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex h-full min-w-0 flex-1 items-center text-left outline-hidden"
            >
              {label}
            </button>
          </div>
        )}
        <CollapsibleContent>
          <ul className="mt-px flex flex-col gap-px">
            {folder.children.map((child) => (
              <Node
                key={child.slug}
                node={child}
                depth={depth + 1}
                pathname={pathname}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}
