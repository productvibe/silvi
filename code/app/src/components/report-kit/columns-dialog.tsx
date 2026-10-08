// The one column picker every report uses (DESIGN.md → Tables: "Where the
// columns outnumber a dropdown, the picker is ONE dialog, and it sets the
// order too"). The kit table draws it with `picker`; reports/_shared keeps
// a copy until its two custom callers move to the kit.

import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Label } from "~/components/ui/label"
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table"
import { cn } from "~/lib/utils"

/** One pickable column: the same key the table and the chart use for it. */
export type ColumnOption = {
  key: string
  label: string
  /** What it measures, in a few words — the full definition is on the column
   *  header's own tooltip, so this line only has to tell them apart. */
  short: string
  /** False for a column the table cannot order by — one whose cells arrive
   *  after first paint, say. */
  sortable?: boolean
}

/** The table's row order when a column sets it; null is the table's own
 *  (newest period first). */
export type ColumnSort = { key: string; dir: "asc" | "desc" }

/** `?sort=` → a sort, e.g. `net` (descending, a number's natural first
 *  question: which period was biggest) or `net:asc`. A key the table does not
 *  show sorts nothing, so unticking the sorted column drops the sort with it. */
export function pickSort(
  param: string | null,
  shown: readonly string[]
): ColumnSort | null {
  if (!param) return null
  const [key, dir] = param.split(":")
  if (!shown.includes(key)) return null
  return { key, dir: dir === "asc" ? "asc" : "desc" }
}

export const sortParam = (s: ColumnSort | null): string | null =>
  s == null ? null : s.dir === "desc" ? s.key : `${s.key}:asc`

/** The rows in the sort's order. Stable, so ties keep the table's own order,
 *  and a blank sorts last whichever way the column runs. */
export function sortRows<T>(
  rows: readonly T[],
  sort: ColumnSort | null,
  valueOf: (row: T, key: string) => number | null | undefined
): T[] {
  if (sort == null) return [...rows]
  const sign = sort.dir === "asc" ? 1 : -1
  return rows
    .map((row, i) => ({ row, i, v: valueOf(row, sort.key) }))
    .sort((a, b) => {
      const an = a.v == null || Number.isNaN(a.v)
      const bn = b.v == null || Number.isNaN(b.v)
      if (an || bn) return an === bn ? a.i - b.i : an ? 1 : -1
      return (a.v! - b.v!) * sign || a.i - b.i
    })
    .map((x) => x.row)
}

/** The sorted column's mark in the table's own header, so the order in force
 *  is visible without opening the dialog. */
export function SortMark({
  sort,
  column,
}: {
  sort: ColumnSort | null
  column: string
}) {
  if (sort?.key !== column) return null
  const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <Icon
      className="mr-1 inline size-3.5 align-[-0.125em] text-muted-foreground"
      aria-label={sort.dir === "asc" ? "Sorted ascending" : "Sorted descending"}
    />
  )
}

/** The table's columns from `?cols=`, IN THE URL'S ORDER: the order is the
 *  reader's, set by dragging in the dialog. An unknown or repeated key is
 *  dropped rather than shown as a blank column; no param (or nothing left)
 *  is the default set. */
export function pickColumns(
  param: string | null,
  keys: readonly string[],
  defaults: string[]
): string[] {
  if (param == null) return defaults
  const picked = [...new Set(param.split(","))].filter((k) => keys.includes(k))
  return picked.length ? picked : defaults
}

/** Which columns a report's table shows, and in what order — the one column
 *  picker every report uses. The choice lives in the URL (`?cols=`, the
 *  ordered keys), so a picked set is shareable like every other control.
 *
 *  The list is the column order: picked columns first as they stand, the rest
 *  after in the report's own order. A row is dragged by its grip (or moved
 *  with Alt+↑/↓ from the grip), and ticking or unticking one leaves it where it
 *  is. Every change applies at once; `onChange(null)` is the default. The last
 *  ticked column cannot be unticked (product/DESIGN.md → Tables).
 *
 *  The last column sorts the table by one column: its button steps through
 *  descending, ascending and off. Only a ticked column can sort. */
export function ColumnsDialog({
  open,
  onOpenChange,
  description,
  options,
  selected,
  defaults,
  onChange,
  sort,
  onSortChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  description: string
  options: ColumnOption[]
  selected: string[]
  defaults: string[]
  onChange: (keys: string[] | null) => void
  sort: ColumnSort | null
  onSortChange: (sort: ColumnSort | null) => void
}) {
  const arrange = (picked: string[]) => [
    ...picked,
    ...options.map((o) => o.key).filter((k) => !picked.includes(k)),
  ]
  // The whole list's order, unticked rows included, held while the dialog is
  // open so a row keeps its place when it is unticked. Reseeded on every open.
  const [order, setOrder] = useState(() => arrange(selected))
  const [dragging, setDragging] = useState<string | null>(null)
  useEffect(() => {
    if (open) setOrder(arrange(selected))
    // Only on open: while it is open, `order` is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const emit = (nextOrder: string[], picked: Set<string>) => {
    const keys = nextOrder.filter((k) => picked.has(k))
    // A grip clicked without moving changes nothing, so writes no URL.
    if (keys.join(",") === selected.join(",")) return
    onChange(keys.join(",") === defaults.join(",") ? null : keys)
  }
  const move = (key: string, to: number) => {
    const next = order.filter((k) => k !== key)
    next.splice(Math.max(0, Math.min(to, next.length)), 0, key)
    setOrder(next)
    return next
  }

  const byKey = new Map(options.map((o) => [o.key, o]))
  const picked = new Set(selected)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(36rem,92vw)] max-w-[min(36rem,92vw)] p-6 sm:max-w-[min(36rem,92vw)]">
        <DialogHeader>
          <DialogTitle>Table columns</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="no-scrollbar max-h-[60vh] overflow-y-auto">
          {/* A list to pick from, not data: rows ruled, no column lines. */}
          <Table>
            <TableBody>
              {order.map((key, i) => {
                const o = byKey.get(key)
                if (!o) return null
                const checked = picked.has(key)
                const dir = sort?.key === key ? sort.dir : null
                const canSort = checked && o.sortable !== false
                const SortIcon =
                  dir === "desc" ? ArrowDown : dir === "asc" ? ArrowUp : ArrowUpDown
                return (
                  <TableRow
                    key={key}
                    data-column={key}
                    className={cn(
                      dragging === key && "bg-muted hover:bg-muted"
                    )}
                  >
                    <TableCell className="border-r-0 w-6 px-0 align-middle">
                      <button
                        type="button"
                        aria-label={`Move ${o.label}`}
                        title="Drag to reorder"
                        // Pointer events rather than HTML drag and drop: they
                        // work on touch, and a table row as a drag image is
                        // unreliable across browsers. The list reorders under
                        // the pointer, so where the row lands is what is drawn.
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId)
                          setDragging(key)
                        }}
                        onPointerMove={(e) => {
                          if (dragging !== key) return
                          const over = document
                            .elementFromPoint(e.clientX, e.clientY)
                            ?.closest<HTMLElement>("[data-column]")?.dataset.column
                          if (over && over !== key) move(key, order.indexOf(over))
                        }}
                        onPointerUp={() => {
                          if (dragging !== key) return
                          setDragging(null)
                          emit(order, picked)
                        }}
                        onPointerCancel={() => setDragging(null)}
                        onKeyDown={(e) => {
                          if (!e.altKey) return
                          const to =
                            e.key === "ArrowUp"
                              ? i - 1
                              : e.key === "ArrowDown"
                                ? i + 1
                                : null
                          if (to == null || to < 0 || to >= order.length) return
                          e.preventDefault()
                          emit(move(key, to), picked)
                        }}
                        className="flex cursor-grab touch-none items-center rounded-sm text-muted-foreground/60 hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
                      >
                        <GripVertical className="size-4" />
                      </button>
                    </TableCell>
                    <TableCell className="border-r-0 w-8 align-middle">
                      <Checkbox
                        id={`column-${key}`}
                        checked={checked}
                        disabled={checked && picked.size === 1}
                        onCheckedChange={(on) => {
                          const next = new Set(picked)
                          if (on) next.add(key)
                          else next.delete(key)
                          emit(order, next)
                        }}
                      />
                    </TableCell>
                    <TableCell className="border-r-0 font-medium">
                      {/* The name is the click target, so the row toggles
                          without having to hit the box itself. */}
                      <Label
                        htmlFor={`column-${key}`}
                        className="-m-2 block cursor-pointer p-2 font-medium"
                      >
                        {o.label}
                      </Label>
                    </TableCell>
                    <TableCell className="border-r-0 whitespace-normal text-muted-foreground">
                      {o.short}
                    </TableCell>
                    <TableCell className="w-10 border-r-0 pr-0 text-right align-middle">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canSort}
                        aria-pressed={dir != null}
                        aria-label={`Sort by ${o.label}`}
                        title={
                          dir === "desc"
                            ? "Sorted high to low"
                            : dir === "asc"
                              ? "Sorted low to high"
                              : "Sort by this column"
                        }
                        onClick={() =>
                          onSortChange(
                            dir == null
                              ? { key, dir: "desc" }
                              : dir === "desc"
                                ? { key, dir: "asc" }
                                : null
                          )
                        }
                        className={cn(
                          dir
                            ? "text-foreground"
                            : "text-muted-foreground/50 hover:text-muted-foreground",
                          !canSort && "invisible"
                        )}
                      >
                        <SortIcon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOrder(arrange(defaults))
              onChange(null)
              onSortChange(null)
            }}
          >
            Reset to default
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
