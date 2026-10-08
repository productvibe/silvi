import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ChevronRight, Palette, Settings } from "lucide-react"
import {
  NavLink,
  Outlet,
  useLocation,
  useMatches,
  useRouteLoaderData,
} from "react-router"

import { AppMark } from "~/components/brand/app-mark"
import { ContentHeader, type Crumb } from "~/components/page/content-header"
import { HeaderSlotProvider } from "~/components/page/header-slot"
import { SearchCommand } from "~/components/search/search-command"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarResizeHandle,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import { WikiTree } from "~/wiki/panel"
import type { loader as wikiLoader } from "~/wiki/route"
import { APP_NAME } from "~/lib/app"
import { moduleIcon } from "~/lib/module-icons"
import { navItemForPath, navItems } from "~/lib/nav"
import { cn } from "~/lib/utils"
import { blocks, moduleById, modules } from "~/modules/modules"

// Notion's default sidebar width, and how far its edge may be dragged. The
// width a reader drags to is kept in their browser (a convenience, so a
// blocked or empty store just means the default).
const SIDEBAR_WIDTH = { default: 240, min: 200, max: 480 }
const SIDEBAR_WIDTH_KEY = "sidebar-width"

// The footer: Settings.
const footerItems = [{ title: "Settings", path: "/settings", icon: Settings }]

// Settings is a section, not a page: inside it the sidebar swaps its whole
// column for these, with a Back row out. The alternative — hanging them off the
// footer row as a submenu, or off a second panel — was rejected: settings are
// not chapters of the page you were reading, and a second column drawn beside
// a form that is 400 px wide is mostly empty. Appearance comes first, then one
// section per module, from the registry.
const settingsItems = [
  { title: "Appearance", path: "/settings/appearance", icon: Palette },
  ...modules.map((module) => ({
    title: module.title,
    path: `/settings/${module.id}`,
    icon: moduleIcon(module.icon),
  })),
]

/** A section's detail page names itself in the
 *  crumbs through its route `handle`, since the shell cannot know a record's
 *  name: `export const handle = { crumb: (data) => "…" }`. */
type CrumbHandle = { crumb: (data: unknown) => string }

const sections = [
  { title: "Settings", prefix: "/settings", items: settingsItems },
]

// The app frame: the sidebar and the content column, with ONE header row over
// the content. No refresh control and no timestamp in that header.
export default function Shell() {
  const location = useLocation()
  const section = sections.find(
    (s) =>
      location.pathname === s.prefix ||
      location.pathname.startsWith(`${s.prefix}/`)
  )
  // Back leaves the section for wherever the reader came FROM, not for a fixed
  // home: a section is reached mid-task, and dropping someone on the home
  // page loses the page they were reading. A fresh load straight into
  // a section has no such page, so it falls back to "/".
  const lastNonSection = useRef("/")
  if (!section) lastNonSection.current = location.pathname + location.search
  const sectionItem = section?.items.find(
    (i) =>
      location.pathname === i.path || location.pathname.startsWith(`${i.path}/`)
  )
  const matches = useMatches()
  const detail = [...matches]
    .reverse()
    .find(
      (m) => typeof (m.handle as CrumbHandle | undefined)?.crumb === "function"
    )
  const detailCrumb = detail
    ? (detail.handle as CrumbHandle).crumb(detail.loaderData)
    : null
  // The module the page is in, for its crumb. The wiki draws its own.
  const activeItem = navItemForPath(location.pathname)
  const activeBlock = activeItem && moduleById(activeItem.id)?.block
  const ownHeader = !!activeBlock && !!blocks[activeBlock]?.ownHeader
  // The wiki's pages are files, and its tree is built by
  // its own route's loader. The shell reads that loader's data by route id for
  // the crumbs and the tree panel, so it never imports the compiled pages.
  const wiki = useRouteLoaderData<typeof wikiLoader>("wiki/route")
  const isWiki =
    location.pathname === "/wiki" || location.pathname.startsWith("/wiki/")
  // The Wiki row folds its tree like any Notion page with subpages. Entering
  // the wiki from elsewhere unfolds it; moving between wiki pages keeps the
  // reader's choice.
  const [wikiOpen, setWikiOpen] = useState(true)
  useEffect(() => {
    if (isWiki) setWikiOpen(true)
  }, [isWiki])

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH.default)
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
      if (saved >= SIDEBAR_WIDTH.min && saved <= SIDEBAR_WIDTH.max)
        setSidebarWidth(saved)
    } catch {}
  }, [])
  const commitSidebarWidth = (w: number) => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
    } catch {}
  }

  // HeaderSlotProvider lets the routed page portal its controls into
  // ContentHeader.
  return (
    <HeaderSlotProvider>
      <SidebarProvider
        defaultOpen
        // Notion's sidebar: 240 px by default, drag its edge to widen it.
        // Closed, it folds to a column of icons (never away entirely), and
        // the toggle to open it again leads the breadcrumb bar.
        style={
          { "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties
        }
      >
        <Sidebar collapsible="icon">
          {/* 6 px on top, not 8: the 32 px first row then centres on 22 px,
                the middle of ContentHeader's 44 px bar; 10 px below keeps
                the rows under it where they were. */}
          <SidebarHeader className="pt-1.5 pb-2.5">
            <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
              {section ? (
                /* In the section the mark and app name give way to the
                     section's own name and the way out — one row instead of a
                     header saying where the app is plus a Back row saying where
                     you are not. It sits in the header slot, so it lines the
                     sidebar up with ContentHeader's 44 px bar. */
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip={section.title}
                      render={<NavLink to={lastNonSection.current} />}
                    >
                      <ArrowLeft />
                      <span>{section.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* The mark on the menu's icon column and the name on its
                        label column: a 28 px box ending on the glyph (the
                        rows' 8 px inset + 20 px icon), then the rows' 10 px
                        gap. Collapsed, a 32 px box centred like the icons.
                        32 px tall, centred on ContentHeader's 44 px bar. */}
                  <div className="flex h-8 w-7 shrink-0 items-center justify-end group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center">
                    <AppMark className="size-5" />
                  </div>
                  {/* App name beside the mark, medium like every row
                        (DESIGN.md → Sidebar). Hidden when collapsed to icons,
                        where only the mark fits. */}
                  <span className="truncate text-sm leading-4 font-medium group-data-[collapsible=icon]:hidden">
                    {APP_NAME}
                  </span>
                </div>
              )}
              <SidebarTrigger
                title="Close sidebar"
                className="group-data-[collapsible=icon]:hidden"
              />
            </div>
            {/* Search sits under the workspace row, as Notion's "Search or
                  ask" box does. Not inside a section: Settings is a menu of
                  its own, and ⌘K (registered by SearchCommand) does nothing
                  there. */}
            {!section && <SearchCommand />}
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                {section ? (
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={item.path === sectionItem?.path}
                          render={<NavLink to={item.path} />}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                ) : (
                  <SidebarMenu>
                    {navItems.map((item) =>
                      item.id === "wiki" ? (
                        <SidebarMenuItem key={item.id}>
                          {/* Notion's fold: the row's icon turns into a
                                chevron under the pointer. A sibling of the
                                link, laid over its icon, since a button cannot
                                sit inside one. Only in the wiki, where the
                                tree is loaded. */}
                          {isWiki && wiki && (
                            <button
                              type="button"
                              aria-label={
                                wikiOpen ? "Fold Wiki" : "Unfold Wiki"
                              }
                              aria-expanded={wikiOpen}
                              onClick={() => setWikiOpen((o) => !o)}
                              className="absolute top-[0.3125rem] left-2 z-10 flex size-5 items-center justify-center rounded-sm text-muted-foreground opacity-0 outline-hidden group-hover/menu-item:opacity-100 group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                            >
                              <ChevronRight
                                className={cn(
                                  "size-4 stroke-[1.75] transition-transform duration-150",
                                  wikiOpen && "rotate-90"
                                )}
                              />
                            </button>
                          )}
                          <SidebarMenuButton
                            tooltip={item.title}
                            // Only the page in view is filled, as in Notion's
                            // tree: on a subpage its own row carries the fill.
                            isActive={location.pathname === item.path}
                            className={cn(
                              isWiki &&
                                wiki &&
                                "group-data-[collapsible=icon]:bg-sidebar-accent group-hover/menu-item:[&>svg]:opacity-0 group-data-[collapsible=icon]:[&>svg]:opacity-100!"
                            )}
                            render={<NavLink to={item.path} />}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                          {/* The wiki's pages hang under its row, as a
                                Notion page's subpages do. */}
                          {isWiki && wiki && wikiOpen && (
                            <WikiTree tree={wiki.tree} />
                          )}
                        </SidebarMenuItem>
                      ) : (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={activeItem?.id === item.id}
                            render={<NavLink to={item.path} />}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    )}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            {/* Inside the section the row would navigate to where you already
                  are, and the Back row above is the exit — so it goes. Removed
                  rather than `hidden`: the menu carries `flex`, which wins over
                  the attribute's `display: none`. */}
            {!section && (
              <SidebarMenu>
                {footerItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={location.pathname.startsWith(item.path)}
                      render={<NavLink to={item.path} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarFooter>
          <SidebarResizeHandle
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            onWidthCommit={commitSidebarWidth}
            min={SIDEBAR_WIDTH.min}
            max={SIDEBAR_WIDTH.max}
            defaultWidth={SIDEBAR_WIDTH.default}
          />
        </Sidebar>

        {/* The header spans panel + content rather than sitting inside the
              content column: it puts both panes' top edge on one line (a panel
              starting above the header read as a second app), and gives the
              breadcrumb the full width it needs for a long page name. */}
        <div className="flex h-svh min-w-0 flex-1 flex-col">
          {section && (
            /* "Settings / Appearance", "Settings / Tasks". */
            <ContentHeader
              crumbs={[
                section.title,
                // On a detail page the item links back up to its list.
                ...(sectionItem
                  ? [
                      detailCrumb
                        ? { label: sectionItem.title, to: sectionItem.path }
                        : sectionItem.title,
                    ]
                  : []),
                ...(detailCrumb ? [detailCrumb] : []),
              ]}
            />
          )}
          {isWiki && wiki && <ContentHeader crumbs={wiki.crumbs} />}
          {/* An item-list module draws its own header over its list column,
              so its reading pane can run the full height of the window. */}
          {!section && !isWiki && activeItem && !ownHeader && (
            <ContentHeader
              crumbs={
                // On a module's detail page the module links back to its list.
                detailCrumb
                  ? [
                      { label: activeItem.title, to: activeItem.path },
                      detailCrumb,
                    ]
                  : [activeItem.title]
              }
            />
          )}

          <div className="flex min-h-0 flex-1">
            <main className="relative no-scrollbar min-w-0 flex-1 overflow-y-auto overscroll-none">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </HeaderSlotProvider>
  )
}
