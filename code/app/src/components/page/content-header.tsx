import { Link } from "react-router"

import { cn } from "~/lib/utils"

import { HeaderSlotTarget } from "~/components/page/header-slot"
import { SidebarTrigger, useSidebar } from "~/components/ui/sidebar"

/** A breadcrumb: a plain label, or a `{label, to}` that renders as a Link (used
 *  to step back up — e.g. from a document detail to the Documents list). */
export type Crumb = string | { label: string; to: string }

/** Header row at the top of every page: breadcrumbs on the left, and on the
 *  right whatever the page portals in, plus any page-specific `actions`. No
 *  refresh control and no timestamp, by design. */
export function ContentHeader({
  crumbs,
  actions,
  ruled = false,
  slot = true,
}: {
  crumbs: Crumb[]
  /** A hairline under the bar, on every report page: a report draws a left
   *  column (its chapter panel, or a deck's slide list), and that column's
   *  divider has to meet a rule rather than end in mid-air under the crumbs.
   *  A document page (the wiki, the catalog, settings) runs up under the bar
   *  unbroken. */
  ruled?: boolean
  /** Page-specific controls rendered at the right of the row. */
  actions?: React.ReactNode
  /** Hold the mount point pages portal their controls into. Off on the one
   *  header of a page that draws two (the inbox: its list column's and its
   *  reading pane's), so the controls land in one place. */
  slot?: boolean
}) {
  // With the sidebar closed (or on a phone, where it is a sheet), its toggle
  // leads the crumbs, as Notion's does.
  const { state, isMobile } = useSidebar()
  // A header with no crumbs is a pane's own bar beside another header that
  // already leads with the toggle.
  const sidebarClosed =
    crumbs.length > 0 && (isMobile || state === "collapsed")
  return (
    // h-11, fixed: Notion's top bar (44 px, measured 2026-09-29), so the row
    // is the same height on every page whether or not it carries an action.
    <div
      data-slot="content-header"
      className={cn(
        "z-10 flex h-11 shrink-0 items-center justify-between gap-3 bg-background px-3",
        ruled && "border-b"
      )}
    >
      <nav className="flex min-w-0 items-center text-sm leading-[1.2] text-foreground">
        {sidebarClosed && (
          <SidebarTrigger title="Open sidebar" className="mr-1 shrink-0" />
        )}
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1
          const label = typeof c === "string" ? c : c.label
          const to = typeof c === "string" ? undefined : c.to
          // Notion's crumb: 14 px, one colour for all of them, a 6 px pad
          // and a hover fill on the ones that link.
          const crumb = "rounded-md px-1.5 py-0.5"
          return (
            <span key={i} className="flex min-w-0 items-center">
              {i > 0 && (
                <span className="mx-0.5 text-[0.8125rem] text-border">/</span>
              )}
              {to ? (
                <Link
                  to={to}
                  className={cn(crumb, "max-w-40 truncate hover:bg-muted")}
                  title={label}
                >
                  {label}
                </Link>
              ) : (
                <span
                  className={cn(
                    crumb,
                    // A report name can be long ("PowerBI 1P - 201 Mortgage
                    // Loan - SIUG"); clip it rather than push the chapter off
                    // the row. The last crumb is never truncated.
                    !isLast && "max-w-40 truncate"
                  )}
                  title={isLast ? undefined : label}
                >
                  {label}
                </span>
              )}
            </span>
          )
        })}
      </nav>
      <div className="flex items-center gap-0.5">
        {actions}
        {/* Reports portal their "(i)" how-it-is-built trigger in here. */}
        {slot && <HeaderSlotTarget className="flex items-center" />}
      </div>
    </div>
  )
}
