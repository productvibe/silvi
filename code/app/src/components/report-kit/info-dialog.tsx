import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { useMatches } from "react-router"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { cn } from "~/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"

// The shared "(i)" dialog — opened from the global header (reports pass it to
// ReportShell's `info` prop, which portals the trigger up there). It carries the
// report's own title and description, which no longer appear on the page: the
// breadcrumb names the report, and this dialog is where you go to find out what
// it means.
//
// Two tabs, because two audiences read this:
//   • Info      — what the report answers, what each number means, how to read
//                 it and where it misleads. Written for someone who knows the
//                 business, not the schema.
//   • Technical — where the data comes from and the exact SQL that runs.
//
// A page whose subject isn't a query can pass `tabs` instead and name its own.
// A documented process has no SQL and no "how to read this number", so
// Info/Technical would be two labels invented to fit a shape that isn't there —
// e.g. How it works / Known issues / References. Don't reach for this to rename Info and Technical on a report:
// the default pair is what makes reports feel like one another.
//
// It also carries the data's AS-OF stamp, under the description, so it is
// visible whichever tab is open. That stamp used to live in the header row — as
// a refresh-button tooltip until 2026-08-26, then briefly as a bare timestamp
// beside the breadcrumbs. Neither belonged there: a date floating in the chrome
// with nothing to anchor it reads as the page's own clock rather than as a fact
// about the numbers. Here it sits with the report's name and definitions, which
// is the same question ("what am I looking at?").
//
// Width is capped at 48rem with generous padding: wide enough for a two-column
// table whose definition column still holds a readable line length, narrow
// enough that nothing runs long. SQL scrolls horizontally inside its own box
// rather than widening the dialog. The body scrolls without scrollbar chrome
// (`no-scrollbar`).

/** One tab: its url-ish key, its label, and its body. */
export type InfoTab = { value: string; label: string; content: ReactNode }

export function InfoDialog({
  title,
  description,
  info,
  technical,
  extra = [],
  tabs,
  asOfIn = "header",
}: {
  /** The report's name — the same string the page passes to ReportShell. */
  title: string
  /** The report's one-line description, also from the page. */
  description: ReactNode
  /** Business-facing content: what it measures and how to read it. */
  info?: ReactNode
  /** Engineer-facing content: source tables and SQL. */
  technical?: ReactNode
  /** Further tabs after Info and Technical, for a page that carries a third
   *  kind of reading — e.g. a workflow's "Process" walkthrough, which belongs
   *  with the documentation rather than on the working page. */
  extra?: InfoTab[]
  /** Replaces Info/Technical/extra entirely with tabs this page names itself.
   *  For a subject that isn't a query — a documented process — where the
   *  default pair would be two empty labels. Reports should not use this. */
  tabs?: InfoTab[]
  /** Where the "Data as of" line goes: under the description (the default),
   *  or at the foot of the Info tab — for a report whose owner wanted the
   *  header to hold the name and one line only (Board Updates, 2026-09-24). */
  asOfIn?: "header" | "info"
}) {
  const asOf = useAsOf()
  // Either the default Info/Technical pair (plus `extra`), or a fully
  // self-named set. Normalising here keeps one rendering path below, so the
  // scroll container, `min-w-0` fixes and tab styling can't drift apart.
  const panels: InfoTab[] = (
    tabs ?? [
      {
        value: "info",
        label: "Info",
        content:
          asOfIn === "info" && info != null ? (
            <>
              {info}
              <AsOf ms={asOf} />
            </>
          ) : (
            info
          ),
      },
      { value: "technical", label: "Technical", content: technical },
      ...extra,
    ]
  ).filter((t) => t.content != null)

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            data-export-exclude
            aria-label={`About ${title}`}
            title={`About ${title}`}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          />
        }
      >
        <Info className="size-4" />
      </DialogTrigger>
      <DialogContent className="w-[min(48rem,92vw)] max-w-[min(48rem,92vw)] p-6 sm:max-w-[min(48rem,92vw)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="max-w-[70ch]">
            {description}
          </DialogDescription>
          {asOfIn === "header" && <AsOf ms={asOf} />}
        </DialogHeader>

        {/* `min-w-0` on the tab root as well as on each body below: DialogContent
            is a grid, and a grid item's automatic minimum size is its
            min-content width. A wide child — the source-table grid, whose cells
            hold schema-qualified identifiers — would otherwise size this item
            past the dialog's own max-width and paint outside the panel. */}
        {panels.length > 0 && (
          <Tabs defaultValue={panels[0]?.value} className="min-w-0">
            {/* Underline tabs — the monorepo default (see product/DESIGN.md).
              `border-b` draws the hairline baseline under the whole tab row; the
              list is w-fit, so it stops at the last tab rather than running the
              full width of the dialog. */}
            <TabsList variant="line" className="border-b">
              {panels.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {panels.map((t) => (
              <TabsContent key={t.value} value={t.value} className="pt-5">
                {/* `min-w-0`: without it this flex column keeps its automatic
                  minimum content width, so a wide child (a table holding
                  schema-qualified identifiers) pushes the body out past the
                  dialog panel instead of wrapping or scrolling inside it. */}
                <div className="no-scrollbar flex max-h-[66vh] min-w-0 flex-col gap-7 overflow-y-auto">
                  {t.content}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Read the active (leaf) route's freshness timestamp, exposed by report loaders
 *  as `asOf` (live and snapshot reports) or `generatedAt` (precomputed ones). Taken
 *  from route data rather than a prop: every report already returns it from its
 *  loader, and threading it through `info` would mean touching every report to
 *  say something none of them decides. */
function useAsOf(): number | undefined {
  const matches = useMatches()
  const data = matches[matches.length - 1]?.data as
    | { asOf?: unknown; generatedAt?: unknown }
    | undefined
  if (typeof data?.asOf === "number") return data.asOf
  if (typeof data?.generatedAt === "number") return data.generatedAt
  return undefined
}

/** When the numbers were built. Renders nothing when the route exposes no
 *  timestamp — a live report reads through the TTL cache and has no build time,
 *  and an invented "now" would be the one thing this line must not say. */
function AsOf({ ms }: { ms: number | undefined }) {
  if (ms == null) return null
  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      Data as of{" "}
      {new Date(ms).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </p>
  )
}

export function InfoSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

/** Body prose inside a section — held to a readable measure. */
export function InfoText({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[70ch] text-sm text-muted-foreground">{children}</p>
  )
}

/** A term/definition table: the term in the left column, what it means on the
 *  right. Used for measures, measurement choices and source tables — anything
 *  that was previously a wall of stacked paragraphs. */
export function DefTable({
  term,
  definition,
  rows,
}: {
  /** Left column heading, e.g. "Measure" or "Table". */
  term: string
  /** Right column heading, e.g. "Definition" or "Role in the report". */
  definition: string
  rows: { name: string; def: ReactNode }[]
}) {
  return (
    // `table-fixed` + `break-words`: the term column holds schema-qualified
    // table names, which have no break opportunity of their own. Left to size
    // itself the table takes its intrinsic minimum from the longest identifier
    // and overflows the dialog; fixed layout makes 15rem binding and the words
    // break inside it. Same reasoning as DefList's `dt` below.
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[15rem]">{term}</TableHead>
          <TableHead>{definition}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name} className="hover:bg-transparent">
            <TableCell className="align-top font-medium break-words whitespace-normal text-foreground">
              {r.name}
            </TableCell>
            <TableCell className="align-top break-words whitespace-normal text-muted-foreground">
              {r.def}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** A two-tier definition list: name, then the one-line plain-English rule, then
 *  (demoted) the nuance. Prefer this over DefTable for anything a reader has to
 *  understand rather than look up — reading only the `lead` lines has to be
 *  enough to get the report, with `note` there when they want the caveat. */
export function DefList({
  rows,
}: {
  rows: { name: string; lead: ReactNode; note?: ReactNode }[]
}) {
  return (
    <dl className="flex flex-col">
      {rows.map((r, i) => (
        <div
          key={r.name}
          className={`grid grid-cols-[11rem_1fr] gap-x-6 gap-y-1 py-3 text-sm ${
            i > 0 ? "border-t" : ""
          }`}
        >
          {/* `break-words`: the left column holds schema-qualified table names,
              which have no break opportunity of their own and would otherwise
              run straight under the definition column. */}
          <dt className="font-medium break-words text-foreground">{r.name}</dt>
          <dd className="flex min-w-0 flex-col gap-1 break-words">
            <span className="text-foreground">{r.lead}</span>
            {r.note && <span className="text-muted-foreground">{r.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** An external link inside a dialog — SharePoint, Jira, Teams. Same treatment
 *  as a link in prose (`proseTypography`), so a link reads the same wherever it
 *  appears. Always `rel="noreferrer"`: these point at tenant URLs. */
export function InfoLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium [overflow-wrap:anywhere] text-foreground underline decoration-foreground/40 underline-offset-2"
    >
      {children}
    </a>
  )
}

/** A source list: the document, a link to it, and what it is good for. Use for
 *  a page whose facts came from artefacts outside this app — the point is that a
 *  reader can go open the thing and check.
 *
 *  `where` is the human location (the channel and folder path), not a repeat of
 *  the URL: someone who has to ask a colleague for access needs the words, and
 *  the URL is already on the title. */
export function RefList({
  rows,
}: {
  rows: {
    name: string
    href?: string
    where: string
    note?: ReactNode
  }[]
}) {
  return (
    <dl className="flex flex-col">
      {rows.map((r, i) => (
        <div
          key={r.name}
          className={cn(
            "flex flex-col gap-1 py-3 text-sm",
            i > 0 && "border-t"
          )}
        >
          <dt className="font-medium break-words text-foreground">
            {r.href ? <InfoLink href={r.href}>{r.name}</InfoLink> : r.name}
          </dt>
          <dd className="flex min-w-0 flex-col gap-1">
            <span className="text-xs [overflow-wrap:anywhere] text-muted-foreground">
              {r.where}
            </span>
            {r.note && (
              <span className="max-w-[70ch] text-muted-foreground">
                {r.note}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A bulleted (or numbered) list of points. Use this over DefList when the items
 *  are READ, not looked up — caveats, sequences, a short set of conditions.
 *  DefList's left column only earns its keep when the reader arrives knowing
 *  which row they want (a metric glossary); if you find yourself inventing a
 *  label to fill that column, the content wanted bullets. Number them only when
 *  the count or the order is part of the point. Lead each item with a bold
 *  clause that stands on its own. */
export function InfoBullets({
  items,
  ordered,
}: {
  items: ReactNode[]
  ordered?: boolean
}) {
  const items_ = items.map((item, i) => (
    <li key={i} className="pl-1.5">
      {item}
    </li>
  ))
  const className = cn(
    "flex max-w-[70ch] list-outside flex-col gap-2.5 pl-5 text-sm text-muted-foreground",
    ordered ? "list-decimal" : "list-disc"
  )
  return ordered ? (
    <ol className={className}>{items_}</ol>
  ) : (
    <ul className={className}>{items_}</ul>
  )
}

/** The bold opening clause of an InfoBullets item — the part that has to stand
 *  on its own if the reader skims only the lead-ins. */
export function Lead({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">{children}</span>
}

/** One labelled SQL listing. Long lines scroll inside it. */
export function Sql({ title, sql }: { title: string; sql: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
        <code>{sql}</code>
      </pre>
    </div>
  )
}
