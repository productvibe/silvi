"use client"

import * as React from "react"

import { cn } from "~/lib/utils"

// Notion's database table (measured on app.notion.com, 2026-09-29): a 36 px
// header of 14 px REGULAR muted labels, 14 / 21 regular cells padded 7.5 × 8,
// the first column (the row's name) at medium weight, and one light grid
// line (`--grid`) under every row and between every column — none on the
// outer edges. No row hover: Notion's rows do not light up.
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <TableScroll>
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </TableScroll>
  )
}

/**
 * A table's horizontal scroll, as Notion draws it: no native bar under the
 * table, but a thin one of its own pinned to the BOTTOM OF THE WINDOW
 * (`position: fixed`, lined up with the table's own left and right edges)
 * for as long as any of the table is on screen — never at the table's foot,
 * so a short table and a tall one put it in the same place. Shown while the
 * pointer is over the table or the bar, or while it scrolls; faded out
 * otherwise; not drawn when the table fits. The thumb drags; the track jumps.
 */
function TableScroll({ children }: { children: React.ReactNode }) {
  const box = React.useRef<HTMLDivElement>(null)
  const ref = React.useRef<HTMLDivElement>(null)
  const [bar, setBar] = React.useState({ ratio: 1, left: 0 })
  const [edge, setEdge] = React.useState<{ left: number; width: number }>()
  const [inView, setInView] = React.useState(false)
  const [hover, setHover] = React.useState(false)
  const [active, setActive] = React.useState(false)
  const idle = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  // Leaving the table starts a short grace period rather than hiding the bar
  // at once: the way to the bar at the foot of the window is off the table.
  const leave = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const enter = () => {
    clearTimeout(leave.current)
    setHover(true)
  }
  const exit = () => {
    clearTimeout(leave.current)
    leave.current = setTimeout(() => setHover(false), 800)
  }

  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el || el.scrollWidth === 0) return
    setBar({
      ratio: el.clientWidth / el.scrollWidth,
      left: el.scrollLeft / el.scrollWidth,
    })
    const r = el.getBoundingClientRect()
    setEdge((e) =>
      e && e.left === r.left && e.width === r.width
        ? e
        : { left: r.left, width: r.width }
    )
  }, [])

  React.useEffect(() => {
    const el = ref.current
    const outer = box.current
    if (!el || !outer) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting))
    io.observe(outer)
    // The page column scrolls and the sidebar resizes: both move the table's
    // left edge without resizing it.
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
      clearTimeout(idle.current)
      clearTimeout(leave.current)
    }
  }, [measure])

  // Show the bar while scrolling, then let it fade.
  const onScroll = () => {
    measure()
    setActive(true)
    clearTimeout(idle.current)
    idle.current = setTimeout(() => setActive(false), 900)
  }

  const scrollTo = (fraction: number) => {
    const el = ref.current
    if (el) el.scrollLeft = fraction * el.scrollWidth
  }

  const drag = React.useRef<{ x: number; left: number } | null>(null)
  const overflows = bar.ratio < 0.999
  const shown = hover || active || drag.current != null

  return (
    <div
      ref={box}
      data-slot="table-container"
      className="relative w-full"
      onPointerEnter={enter}
      onPointerLeave={exit}
    >
      <div
        ref={ref}
        onScroll={onScroll}
        className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {overflows && inView && edge && (
        <div
          aria-hidden
          onPointerEnter={enter}
          onPointerLeave={exit}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return
            const r = e.currentTarget.getBoundingClientRect()
            scrollTo((e.clientX - r.left) / r.width - bar.ratio / 2)
          }}
          style={{ left: edge.left, width: edge.width }}
          className={cn(
            "fixed bottom-1 z-30 h-3 transition-opacity duration-300",
            shown ? "opacity-100" : "opacity-0"
          )}
        >
          <div
            onPointerDown={(e) => {
              e.preventDefault()
              e.currentTarget.setPointerCapture(e.pointerId)
              drag.current = { x: e.clientX, left: bar.left }
            }}
            onPointerMove={(e) => {
              const track = e.currentTarget.parentElement
              if (!drag.current || !track) return
              const dx = (e.clientX - drag.current.x) / track.clientWidth
              scrollTo(drag.current.left + dx)
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId)
              drag.current = null
            }}
            style={{ width: `${bar.ratio * 100}%`, left: `${bar.left * 100}%` }}
            className="absolute top-1 h-1.5 cursor-default rounded-full bg-foreground/20 transition-colors hover:bg-foreground/35"
          />
        </div>
      )}
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "[&_tr:last-child]:border-0 [&_tr>td:first-child]:font-medium",
        className
      )}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-grid has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 border-r border-grid px-2 text-left align-middle text-sm leading-[1.2] font-normal whitespace-nowrap text-muted-foreground last:border-r-0 [&:has([role=checkbox])]:border-r-0 [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "border-r border-grid px-2 py-[0.46875rem] align-middle leading-[1.3125rem] whitespace-nowrap last:border-r-0 [&:has([role=checkbox])]:border-r-0 [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
