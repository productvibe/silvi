// A drill: what a table row's (or a tile's) click opens. `{% drill key="market"
// %}…components…{% /drill %}` inside a table, grouped table or kpis draws its
// components in a dialog on the page's own data, every entry that has the
// `match` column (default: the `key` column) cut to the clicked row's value
// — so the dialog's charts and tables are the same report seen for one row
// (DESIGN.md → Components: a period's breakdown is a dialog off its row; the
// trigger is a button filling the first cell plus the row's own click).

import { useState, type ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"

import { KitDataContext, useKitData, type Row } from "./context"
import { fmt } from "./format"
import { Layout } from "./layout"

export type DrillSpec = {
  /** the clicked row's column whose value cuts the data */
  key?: string
  /** the column the other entries are cut on (default: `key`) */
  match?: string
  /** the clicked row's column printed as the title (default: `key`) */
  label?: string
  /** a tile's `drill: "<name>"` opens the drill of that name */
  name?: string
  /** the dialog's title when no row names it (default: the tile's label) */
  title?: string
  description?: string
  components: ReactNode
}

/** The page's data with every entry holding `column` cut to `value`. */
export function cutData(
  data: Record<string, unknown>,
  column: string,
  value: unknown
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (
      Array.isArray(v) &&
      v.some((r) => r && typeof r === "object" && column in (r as Row))
    )
      out[k] = v.filter((r) => String((r as Row)[column]) === String(value))
    else out[k] = v
  }
  return out
}

type Open = { drill: DrillSpec; row?: Row; title?: string }

/** A table's or tiles' drills: `open(row)` opens the first keyed drill for
 *  a row, `openNamed(name)` a tile's; `dialog` is drawn once beside them. */
export function useDrills(drills: DrillSpec[] | undefined) {
  const [open, setOpen] = useState<Open | null>(null)
  const keyed = drills?.find((d) => d.key)
  const kit = useKitData()
  const dialog = open ? (
    <DrillDialog
      open={open}
      onClose={() => setOpen(null)}
      data={
        open.row && open.drill.key
          ? cutData(
              kit.data,
              open.drill.match ?? open.drill.key,
              open.row[open.drill.key]
            )
          : kit.data
      }
    />
  ) : null
  return {
    /** whether a row click opens anything */
    rows: !!keyed,
    open: (row: Row) => keyed && setOpen({ drill: keyed, row }),
    openNamed: (name: string, row?: Row, title?: string) => {
      const d = drills?.find((x) => x.name === name)
      if (d) setOpen({ drill: d, row, title })
    },
    has: (name?: string) => !!name && !!drills?.some((d) => d.name === name),
    dialog,
  }
}

function DrillDialog({
  open,
  onClose,
  data,
}: {
  open: Open
  onClose: () => void
  data: Record<string, unknown>
}) {
  const kit = useKitData()
  const { drill, row } = open
  const labelCol = drill.label ?? drill.key
  const title =
    row && labelCol
      ? fmt(row[labelCol], { format: "month" })
      : (drill.title ?? open.title ?? drill.name ?? "")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] w-[min(64rem,92vw)] max-w-[min(64rem,92vw)] overflow-y-auto p-6 sm:max-w-[min(64rem,92vw)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {drill.description && (
            <DialogDescription>{drill.description}</DialogDescription>
          )}
        </DialogHeader>
        <KitDataContext.Provider value={{ ...kit, data }}>
          <Layout components={drill.components} />
        </KitDataContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

/** The first cell's trigger: a real button filling the cell, so the
 *  keyboard reaches it; the row's own click opens the same dialog. */
export function DrillCell({
  children,
  onOpen,
}: {
  children: ReactNode
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className="-mx-2 -my-[7.5px] block w-[calc(100%+1rem)] px-2 py-[7.5px] text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
    </button>
  )
}
