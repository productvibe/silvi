// The pieces a kit table draws beyond its cells (DESIGN.md → Tables): a
// label's definition on hover, the estimate clock, the copy glyph, the .xlsx
// glyph in the header, and the column picker with its URL state.

import { useState, type ReactNode } from "react"
import { useSearchParams } from "react-router"
import { Check, ChevronDown, Clock, Columns3, Copy, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "~/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip"
import { cn } from "~/lib/utils"

import { ColumnsDialog, pickColumns, pickSort, sortParam, type ColumnOption, type ColumnSort } from "./columns-dialog"
import { HeaderSlot } from "~/components/page/header-slot"

/** A label with its definition on hover — the affordance the model tables
 *  used (a muted fill under the pointer, no icon). */
export function Term({ children, note }: { children: ReactNode; note?: string | null }) {
  if (!note) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="-mx-1 cursor-help rounded-sm px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground" />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-[24rem]">{note}</TooltipContent>
    </Tooltip>
  )
}

/** A running period's mark: a muted clock after the cell, what the figure
 *  is an estimate of on hover. A real break opportunity before it, so a
 *  narrow cell drops it to a line of its own (DESIGN.md → Tables). */
export function EstimateMark({ note }: { note?: string }) {
  return (
    <>
      {" "}
      <Tooltip>
        <TooltipTrigger render={<span className="ml-0.5 inline-flex cursor-help align-middle text-muted-foreground" />}>
          <Clock className="size-3.5" aria-label="Estimate" />
        </TooltipTrigger>
        {note && <TooltipContent className="max-w-[24rem]">{note}</TooltipContent>}
      </Tooltip>
    </>
  )
}

/** Copies the table. In a table's empty top-left corner it is invisible
 *  until that corner is hovered or focused (`corner`), else a bare glyph on
 *  the title row; a tick for a moment after. */
export function CopyButton({ onCopy, corner }: { onCopy: () => Promise<void>; corner?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      aria-label="Copy table to clipboard"
      title="Copy table to clipboard"
      onClick={async () => {
        try {
          await onCopy()
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          toast.error("Could not copy the table.")
        }
      }}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100",
        corner && !done && "opacity-0 group-hover/corner:opacity-100"
      )}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
    </button>
  )
}

/** The table's .xlsx, a bare glyph portalled into the header left of the
 *  "(i)" (DESIGN.md → Page header: the one page-wide action) — `-order-1`
 *  because the "(i)" is mounted first. */
export function DownloadButton({ onDownload }: { onDownload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <HeaderSlot>
      <button
        type="button"
        aria-label="Download Excel"
        title="Download Excel"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onDownload()
          } catch {
            toast.error("Could not build the Excel file.")
          } finally {
            setBusy(false)
          }
        }}
        className="-order-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      </button>
    </HeaderSlot>
  )
}

/** The picked columns and the sort in force, from the URL (`?cols=`,
 *  `?sort=`, or `?<prefix>_cols=` …), and the writers. */
export function usePicker(prefix: string | null, keys: string[], defaults: string[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const colsParam = prefix ? `${prefix}_cols` : "cols"
  const sortKey = prefix ? `${prefix}_sort` : "sort"
  const selected = pickColumns(searchParams.get(colsParam), keys, defaults)
  const sort = pickSort(searchParams.get(sortKey), selected)
  const write = (k: string, v: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v == null) next.delete(k)
        else next.set(k, v)
        return next
      },
      { replace: true, preventScrollReset: true }
    )
  return {
    selected,
    sort,
    setColumns: (cols: string[] | null) => write(colsParam, cols ? cols.join(",") : null),
    setSort: (s: ColumnSort | null) => write(sortKey, sortParam(s)),
  }
}

/** The outline `sm` "Columns" button with the count, and its dialog. */
export function ColumnsButton({
  options,
  selected,
  defaults,
  onChange,
  sort,
  onSortChange,
  sortable,
}: {
  options: ColumnOption[]
  selected: string[]
  defaults: string[]
  onChange: (keys: string[] | null) => void
  sort: ColumnSort | null
  onSortChange: (s: ColumnSort | null) => void
  sortable: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="font-normal">
        <Columns3 className="size-4" />
        Columns
        <span className="text-muted-foreground tabular-nums">{selected.length}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </Button>
      <ColumnsDialog
        open={open}
        onOpenChange={setOpen}
        description={sortable ? "Pick, order and sort the table's columns." : "Pick and order the table's columns."}
        options={sortable ? options : options.map((o) => ({ ...o, sortable: false }))}
        selected={selected}
        defaults={defaults}
        onChange={onChange}
        sort={sort}
        onSortChange={onSortChange}
      />
    </>
  )
}
