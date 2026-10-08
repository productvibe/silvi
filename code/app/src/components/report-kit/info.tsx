// A kit report's "(i)" content: its `page.info`, read three ways.
//
//   • The header dialog renders it whole: `<Info>` goes on the Info tab,
//     `<Technical>` on the Technical tab, each `<Panel>` on a tab of its own,
//     anything outside them on Info.
//   • A component's own "(i)" (`info={{ what, rules, sql }}` on the component) picks
//     `<Rule id>`s out of it by id, and lists the source tables its SQL
//     reads from the `<Rules as="table">` group — so a rule is written
//     once, and the page and the visual cannot disagree.
//   • `<Sql query="name" />` shows the report's query by that name, the SQL
//     the server runs.
//   • `<Value of="fxRates.DK" format="decimal" />` prints one figure from
//     the report's data, awaited, for a dialog that states what the page used.
//
// The content is walked as an element tree (calling `info()` returns it)
// rather than rendered with hidden parts: what is picked out is exactly the
// element the dialog would draw.
//
//   page: {
//     info: () => (
//       <>
//         <Info>
//           <H2>The measures</H2>
//           <Rules>
//             <Rule id="sample" title="Sample data:">four regions …</Rule>
//           </Rules>
//         </Info>
//         <Technical>
//           <H2>The SQL</H2>
//           <Sql query="regions" />
//         </Technical>
//       </>
//     ),
//   }

import {
  Children,
  Fragment,
  Suspense,
  isValidElement,
  useEffect,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { Info as InfoIcon } from "lucide-react"
import { Await } from "react-router"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Skeleton } from "~/components/ui/skeleton"
import { cn } from "~/lib/utils"
import { getMetric } from "~/metrics"

import { useKitReport } from "./context"
import { DASH, fmt, type FmtSpec } from "./format"
import {
  DefList,
  DefTable,
  InfoBullets,
  InfoDialog,
  InfoSection,
  InfoText,
  Lead,
  Sql as SqlBlock,
} from "./info-dialog"
import { parseSql, tablesIn, type SqlFile } from "./sql"

// a report's dialog writes these too
export { DefList, DefTable, Lead, RefList } from "./info-dialog"

// ── The components a dialog is written with ─────────────────────────────

/** Marks the Info tab's content. */
export function Info({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

/** Marks the Technical tab's content. */
export function Technical({ children }: { children?: ReactNode }) {
  return <>{children}</>
}

/** One rule: an id the page's components refer to, a title (the bold lead-in), an
 *  optional one-line `lead`, and the detail as its body. Drawn by its `Rules`. */
export function Rule(_: {
  id: string
  title: string
  lead?: ReactNode
  children?: ReactNode
}): ReactNode {
  return null
}

type RuleData = {
  id: string
  title: string
  lead?: ReactNode
  body: ReactNode
  group: RulesAs
}

type RulesAs = "list" | "defs" | "table"

/** A group of rules: bullets (default), a two-tier definition list (`defs`),
 *  or a term / definition table (`table`, e.g. the source tables). */
export function Rules({
  as = "list",
  term = "Table",
  definition = "What it contributes",
  children,
}: {
  as?: RulesAs
  term?: string
  definition?: string
  children?: ReactNode
}) {
  const rules = rulesIn(children, as)
  if (as === "defs")
    return (
      <DefList
        rows={rules.map((r) => ({
          name: r.title,
          lead: r.lead ?? "",
          note: r.body,
        }))}
      />
    )
  if (as === "table")
    return (
      <DefTable
        term={term}
        definition={definition}
        rows={rules.map((r) => ({ name: r.title, def: r.body }))}
      />
    )
  return <InfoBullets items={rules.map(bullet)} />
}

/** A rule as one bullet: the bold title, the lead, the detail. */
function bullet(r: RuleData): ReactNode {
  return (
    <>
      {/* A defs rule's title has no punctuation of its own; as a bullet it
          reads "Title. Lead." */}
      <Lead>
        {r.title}
        {r.lead && !/[.:;!?]$/.test(r.title) ? "." : ""}
      </Lead>
      {r.lead && <> {r.lead}</>}
      {r.body != null && <> {r.body}</>}
    </>
  )
}

/** Shows one of the report's `.sql` files by name. */
export function Sql({ query, title }: { query: string; title?: string }) {
  const files = useSqlFiles(useKitReport(), [query])
  if (!files) return <p className="text-xs text-muted-foreground">…</p>
  const f = files[0]
  return <SqlBlock title={title ?? f.title} sql={f.body} />
}

/** One figure from the report's own data, printed in a kit format — for a
 *  dialog that states a value the page used (the FX rates a model converted
 *  at). `of` is a dot path into what the spec's reconstruct returns
 *  (`of="fxRates.DK"`). The header dialog sits outside the page's Suspense
 *  boundary, so this awaits the streamed data itself, showing a skeleton
 *  until it lands and a dash if the query failed. */
export function Value({ of, ...format }: { of: string } & FmtSpec) {
  const { data } = useKitReport()
  const pending = <Skeleton className="inline-block h-3.5 w-10 align-middle" />
  return (
    <Suspense fallback={pending}>
      <Await resolve={data} errorElement={DASH}>
        {(d) => fmt(valueAt(d, of), format)}
      </Await>
    </Suspense>
  )
}

function valueAt(data: unknown, path: string): unknown {
  let v: unknown = data
  for (const k of path.split(".")) {
    if (v == null || typeof v !== "object") return undefined
    v = (v as Record<string, unknown>)[k]
  }
  return v
}

/** A further tab of the header "(i)" (`<Panel label="…">…</Panel>`):
 *  written like the Info tab, spaced in sections by its `<H2>` headings.
 *  KitInfoDialog lifts it out of the Info tab into a tab of its own. */
export function Panel({ children }: { label: string; children?: ReactNode }) {
  return <>{sections(elements(children))}</>
}

/** A named metric's one-line definition (app/src/metrics/metrics.ts), so a
 *  dialog quotes the formula the page uses. */
export function Definition({ name }: { name: string }) {
  return <>{getMetric(name).definition}</>
}

// ── Text on the dialog's scale ─────────────────────────────────────────────

/** A paragraph of the dialog. */
export function P(props: ComponentProps<"p">) {
  return <p className="max-w-[70ch] text-sm text-muted-foreground" {...props} />
}

/** A section heading of the dialog: the sections are spaced by it. */
export function H2(props: ComponentProps<"h3">) {
  return <h3 className="text-sm font-semibold" {...props} />
}

// ── Walking the dialog tree ────────────────────────────────────────────────

type El = ReactElement<{ children?: ReactNode } & Record<string, unknown>>

function elements(node: ReactNode): El[] {
  return Children.toArray(node).filter(isValidElement) as El[]
}

function infoTree(report: ReturnType<typeof useKitReport>): ReactNode {
  return report.info ? report.info() : null
}

function topLevel(tree: ReactNode): El[] {
  const els = elements(tree)
  return els.length === 1 && els[0].type === Fragment
    ? elements(els[0].props.children)
    : els
}

function rulesIn(children: ReactNode, group: RulesAs): RuleData[] {
  return elements(children)
    .filter((el) => el.type === Rule)
    .map((el) => {
      const p = el.props as unknown as {
        id: string
        title: string
        lead?: ReactNode
        children?: ReactNode
      }
      // A body written over several lines is one paragraph: unwrap it, so the
      // rule reads as one run of text after its title wherever it is drawn.
      const kids = elements(p.children)
      const body =
        kids.length === 1 && kids[0].type === P
          ? kids[0].props.children
          : p.children
      return { id: p.id, title: p.title, lead: p.lead, body, group }
    })
}

/** Every `<Rule>` in the document, wherever it sits. */
function allRules(tree: ReactNode): RuleData[] {
  const out: RuleData[] = []
  const walk = (node: ReactNode) => {
    for (const el of elements(node)) {
      if (el.type === Rules) {
        const as = (el.props.as as RulesAs | undefined) ?? "list"
        out.push(...rulesIn(el.props.children, as))
      } else walk(el.props.children)
    }
  }
  walk(tree)
  return out
}

/** Consecutive nodes from one `##` heading to the next, as sections, so the
 *  dialog spaces them like InfoSection. */
function sections(nodes: El[]): ReactNode {
  const groups: El[][] = []
  for (const n of nodes) {
    if (n.type === H2 || groups.length === 0) groups.push([n])
    else groups[groups.length - 1].push(n)
  }
  return groups.map((g, i) => (
    <section key={i} className="flex min-w-0 flex-col gap-2">
      {g}
    </section>
  ))
}

/** The header "(i)": the report's name, description, as-of and its dialog,
 *  with each `<Panel>` as a tab after Info and Technical. */
export function KitInfoDialog({
  asOfIn,
}: {
  asOfIn?: "header" | "info"
} = {}) {
  const report = useKitReport()
  const info: El[] = []
  const technical: El[] = []
  const panels: El[] = []
  for (const el of topLevel(infoTree(report))) {
    if (el.type === Info) info.push(...elements(el.props.children))
    else if (el.type === Technical)
      technical.push(...elements(el.props.children))
    else if (el.type === Panel) panels.push(el)
    else info.push(el)
  }
  return (
    <InfoDialog
      title={report.title}
      description={report.description}
      info={info.length ? sections(info) : undefined}
      technical={technical.length ? sections(technical) : undefined}
      extra={panels.map((p) => ({
        value: String(p.props.label).toLowerCase().replace(/\W+/g, "-"),
        label: String(p.props.label),
        content: p,
      }))}
      asOfIn={asOfIn}
    />
  )
}

// ── SQL files, loaded when a dialog opens ──────────────────────────────────

const SQL_FILES = import.meta.glob<string>("../../reports/*/*.sql", {
  query: "?raw",
  import: "default",
})

function sqlLoader(report: string, name: string) {
  return SQL_FILES[`../../reports/${report}/${name}.sql`]
}

/** The named files, parsed; null while they load. A name that matches no file
 *  shows as such rather than throwing — the lint check is what catches it. */
function useSqlFiles(
  { id: report, sql: inline }: ReturnType<typeof useKitReport>,
  names: string[]
): SqlFile[] | null {
  const key = names.join("|")
  const [files, setFiles] = useState<SqlFile[] | null>(null)
  useEffect(() => {
    let live = true
    Promise.all(
      names.map(async (n) => {
        // a query by its name in the report, else a .sql file of its folder
        const own = inline?.[n]
        if (own != null) return parseSql(own)
        const load = sqlLoader(report, n)
        return load
          ? parseSql(await load())
          : { title: n, body: `-- no query or ${n}.sql in this report` }
      })
    ).then((f) => live && setFiles(f))
    return () => {
      live = false
    }
    // `key` stands for `names`, which is a fresh array on every render;
    // `inline` is fixed per report
  }, [report, key])
  return files
}

// ── A component's own "(i)" ────────────────────────────────────────────────────

export type ComponentInfoSpec = {
  /** one plain-language line: what the visual shows */
  what: string
  /** ids of the dialog's rules, in the order to show them */
  rules?: string[]
  /** names of the `.sql` files behind it */
  sql?: string[]
  /** named metrics the visual draws (set by the kit from `metric`) */
  metrics?: string[]
}

export function ComponentInfo({
  title,
  spec,
}: {
  title: string
  spec: ComponentInfoSpec
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
        <InfoIcon className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="w-[min(52rem,92vw)] max-w-[min(52rem,92vw)] p-6 sm:max-w-[min(52rem,92vw)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="max-w-[70ch]">
            {spec.what}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the SQL loads on demand. `min-w-0`:
            DialogContent is a grid, and a wide SQL listing would otherwise size
            this item past the panel. */}
        <ComponentInfoBody spec={spec} />
      </DialogContent>
    </Dialog>
  )
}

function ComponentInfoBody({ spec }: { spec: ComponentInfoSpec }) {
  const report = useKitReport()
  const files = useSqlFiles(report, spec.sql ?? [])
  const rules = allRules(infoTree(report))
  const picked = (spec.rules ?? []).flatMap((id) => {
    const r = rules.find((x) => x.id === id && x.group !== "table")
    return r ? [r] : []
  })
  const tableNames = files ? files.flatMap((f) => tablesIn(f.body)) : []
  const tables = rules.filter(
    (r) => r.group === "table" && tableNames.includes(r.title.toLowerCase())
  )

  const metrics = (spec.metrics ?? []).map(getMetric)
  return (
    <div
      className={cn(
        "no-scrollbar flex max-h-[66vh] min-w-0 flex-col gap-7 overflow-y-auto"
      )}
    >
      {metrics.length > 0 && (
        <InfoSection title="The measure">
          <InfoBullets
            items={metrics.map((m) => (
              <>
                <Lead>{m.label}.</Lead> {m.definition}
              </>
            ))}
          />
        </InfoSection>
      )}
      {picked.length > 0 && (
        <InfoSection title="The rules">
          <InfoBullets items={picked.map(bullet)} />
        </InfoSection>
      )}
      {tables.length > 0 && (
        <InfoSection title="Where the data comes from">
          <DefTable
            term="Table"
            definition="What it contributes"
            rows={tables.map((t) => ({ name: t.title, def: t.body }))}
          />
        </InfoSection>
      )}
      {(spec.sql?.length ?? 0) > 0 && (
        <InfoSection title="The SQL behind it">
          {/* A report's own queries name their variables. */}
          {files?.some((f) => /\$(from|to)\b/.test(f.body)) && (
            <InfoText>
              What runs against the database. <code>$from</code> and{" "}
              <code>$to</code> are the range.
            </InfoText>
          )}
          <div className="flex min-w-0 flex-col gap-4">
            {files
              ? files.map((f, i) => (
                  <SqlBlock key={i} title={f.title} sql={f.body} />
                ))
              : null}
          </div>
        </InfoSection>
      )}
    </div>
  )
}
