import type { ReactNode } from "react"
import { WidgetTitle } from "~/components/report-kit/widget"
import { Info } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  DefTable,
  InfoBullets,
  InfoSection,
  InfoText,
  Sql,
} from "./info-dialog"

// The per-VISUAL "(i)". The report-level dialog (InfoDialog, portalled into the
// page header) says what the whole page is for; this one sits on a single chart
// or table and answers three questions about that visual alone:
//
//   What it is   — one plain-language line. Reading only this has to be enough.
//   The rules    — how it is measured, and where it misleads. Bulleted, because
//                  these are independent gotchas rather than prose.
//   The SQL      — the exact query that produced it, plus the tables it reads.
//
// The SQL comes from a client-safe `*.sql.ts` module that the server also
// executes, so what is displayed is provably what ran rather than a prose
// paraphrase that drifts.
//
// It is shared because DESIGN.md forbids one-off versions
// of shared things, and because "what / rules / SQL" is the shape every visual
// wants — a chart whose caveats live only in a commit message is a chart nobody
// can check.
//
// Trigger sizing: `size-5` with a `size-3.5` glyph, matching the muted, quiet
// affordance used in card headers. It carries `data-export-exclude` so it is
// stripped from exported images.

export type VisualSql = {
  /** Label above the component, e.g. "Disbursed volume per month × advisor". */
  title?: string
  sql: string
}

export function VisualInfo({
  title,
  what,
  rules = [],
  sql = [],
  tables = [],
  extra,
}: {
  /** The visual's own name, as shown in its header. */
  title: string
  /** One plain-language line: what this visual shows. */
  what: string
  /** How it is measured and where it misleads — one independent point each. */
  rules?: ReactNode[]
  /** The query or queries behind it. */
  sql?: VisualSql[]
  /** Source tables and what each contributes. */
  tables?: { name: string; def: ReactNode }[]
  /** Anything that does not fit the three sections — e.g. a recovered formula. */
  extra?: ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            data-export-exclude
            aria-label={`About ${title}`}
            title={`About ${title}`}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          />
        }
      >
        <Info className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="w-[min(52rem,92vw)] max-w-[min(52rem,92vw)] p-6 sm:max-w-[min(52rem,92vw)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="max-w-[70ch]">{what}</DialogDescription>
        </DialogHeader>

        {/* `min-w-0`: DialogContent is a grid, so a wide child (the SQL listing, or
            the table grid holding schema-qualified names) would otherwise size
            this item past the dialog's max-width and paint outside the panel. */}
        <div className="no-scrollbar flex max-h-[66vh] min-w-0 flex-col gap-7 overflow-y-auto">
          {rules.length > 0 && (
            <InfoSection title="The rules">
              <InfoBullets items={rules} />
            </InfoSection>
          )}

          {extra}

          {tables.length > 0 && (
            <InfoSection title="Where the data comes from">
              <DefTable
                term="Table"
                definition="What it contributes"
                rows={tables.map((t) => ({ name: t.name, def: t.def }))}
              />
            </InfoSection>
          )}

          {sql.length > 0 && (
            <InfoSection title="The SQL behind it">
              <InfoText>
                Exactly what runs against the database. <code>$from</code> and{" "}
                <code>$to</code> are the range.
              </InfoText>
              <div className="flex min-w-0 flex-col gap-4">
                {sql.map((s, i) => (
                  <Sql key={i} title={s.title ?? "Query"} sql={s.sql.trim()} />
                ))}
              </div>
            </InfoSection>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Header for a section that is not a ChartCard — a bare table on the page —
 *  so a table can carry the same title/description/(i) as a chart. ChartCard
 *  already has an `action` slot; this gives tables the matching one instead of
 *  each page hand-rolling an `<h2>` with a button floated beside it. */
/** A table's or a bare component's title: the same row a widget carries above
 *  its card (widget.tsx). */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return <WidgetTitle title={title} description={description} action={action} />
}
