import type { ReactNode } from "react"

import { cn } from "~/lib/utils"

/**
 * A report visual as a Notion dashboard widget (notion.com/help/dashboards,
 * 2026-09-29): the title sits OUTSIDE, above the visual, in 14 px medium
 * muted text with the visual's "(i)" at its right. A table sits in a white
 * card with a 1 px hairline edge and 12 px corners, no shadow; a chart sits
 * open under its title (`frame={false}`). A KPI tile is a card with no
 * title outside: a metric's label belongs with its figure, inside.
 *
 * Every widget carries its own breathing room: 8 px above and below
 * (`py-2`), so two stacked visuals sit ~40 px apart in any page's `gap-6`
 * — kit or custom — and a chart gets 4 px of air between its title row and
 * its top tick. Room lives here, once, not in each page's gaps.
 */
export function Widget({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  frame = true,
}: {
  title?: string
  description?: ReactNode
  /** The visual's own controls, right of the title (its "(i)"). */
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Padding and layout inside the card (default `p-4`). */
  bodyClassName?: string
  /** Draw the card (default). A chart passes `false`: it sits open on the
   *  page under its title, with no edge and no padding of its own. */
  frame?: boolean
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 py-2", className)}>
      {(title || action) && (
        <WidgetTitle title={title} description={description} action={action} />
      )}
      <div
        data-slot="widget"
        className={cn(
          "min-w-0 text-sm text-card-foreground",
          frame && "rounded-xl border bg-card",
          bodyClassName ?? (frame ? "p-4" : "pt-1")
        )}
      >
        {children}
      </div>
    </section>
  )
}

/** A widget's title row, on its own for a component that draws its own body. */
export function WidgetTitle({
  title,
  description,
  action,
}: {
  title?: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-2 px-0.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && (
          <h3 className="text-sm leading-5 font-medium text-muted-foreground">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs leading-4 text-faint">{description}</p>
        )}
      </div>
      {action && <div className="-my-1 flex shrink-0 items-center">{action}</div>}
    </div>
  )
}
