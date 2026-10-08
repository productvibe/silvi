// The wiki's build step (vite.config.ts): each `wiki/**/*.md` becomes a
// module of `{ frontmatter, html, source, plainText }`, so the wiki ships no
// Markdown engine to the browser. Pages are plain Markdown (GitHub's, with
// tables), plus one note form:
//
//   > [!NOTE]
//   > A set-off note, drawn as a callout.
//
// `wiki/reference/metrics.md` gets every metric (app/src/metrics/metrics.ts)
// and dictionary term written out under its own text. Vite restarts the dev
// server when either file changes, since this file imports them.
//
// No live data: the wiki must work without a database connection.
//
// Relative imports only: this runs at Vite config time.

import { relative } from "node:path"

import yaml from "js-yaml"
import { Marked, type Token, type Tokens } from "marked"
import type { Plugin } from "vite"

import { TERMS, TERM_USAGE, type TermEntry } from "../metrics/dictionary"
import { METRICS } from "../metrics/metrics"
import type { Metric } from "../metrics/schema"

export type WikiDoc = {
  frontmatter: Record<string, string | number>
  /** the page as HTML, drawn with the wiki's components (render.tsx) */
  html: string
  /** the Markdown for the downloads */
  source: string
  /** one string per block, for search */
  plainText: string[]
}

const NOTE = /^\[!NOTE\]\s*/

const marked = new Marked({
  gfm: true,
  renderer: {
    // `> [!NOTE]` is a callout: an <aside>, the marker dropped
    blockquote({ tokens }) {
      const first = tokens[0]
      if (first?.type !== "paragraph" || !NOTE.test(first.text)) return false
      const body = this.parser
        .parse(tokens)
        .replace(/^<p>\[!NOTE\]\s*/, "<p>")
        .replace(/^<p><\/p>\n?/, "")
      return `<aside>\n${body}</aside>\n`
    },
  },
})

/** The text of each block (a paragraph, heading, code block, list item or
 *  table row), for search. */
function blocks(tokens: Token[], out: string[]) {
  for (const t of tokens) {
    const add = (s: string) => {
      const v = s.replace(/\s+/g, " ").trim()
      if (v) out.push(v)
    }
    if (t.type === "paragraph" || t.type === "heading" || t.type === "code")
      add(t.text.replace(NOTE, ""))
    else if (t.type === "table") {
      const tb = t as Tokens.Table
      for (const row of [tb.header, ...tb.rows])
        add(row.map((c) => c.text).join(" "))
    } else if (t.type === "list")
      for (const item of (t as Tokens.List).items) blocks(item.tokens, out)
    else if ("tokens" in t && t.tokens) blocks(t.tokens, out)
  }
}

/** One page: its frontmatter, HTML, download source and search text. */
export function parseWiki(raw: string, file: string): WikiDoc {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n*/.exec(raw)
  let frontmatter: WikiDoc["frontmatter"] = {}
  try {
    frontmatter = (yaml.load(m?.[1] ?? "") ?? {}) as WikiDoc["frontmatter"]
  } catch (e) {
    throw new Error(`${file}: frontmatter: ${(e as Error).message.split("\n")[0]}`)
  }
  let body = raw.slice(m?.[0].length ?? 0)
  if (file === METRICS_PAGE) body = `${body.trimEnd()}\n\n${definitions()}\n`
  const plainText: string[] = []
  blocks(marked.lexer(body), plainText)
  return {
    frontmatter,
    html: marked.parse(body, { async: false }),
    source: body
      .replace(/^>\s*\[!NOTE\]\s*\n/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    plainText,
  }
}

export function wikiPlugin(appRoot: string): Plugin {
  const wikiDir = `${appRoot}/wiki/`
  return {
    name: "wiki",
    enforce: "pre",
    transform(source, id) {
      if (id.includes("?") || !id.startsWith(wikiDir) || !id.endsWith(".md"))
        return null
      try {
        const doc = parseWiki(source, relative(appRoot, id))
        return { code: `export default ${JSON.stringify(doc)}`, map: null }
      } catch (e) {
        this.error((e as Error).message)
      }
    },
  }
}

// ── The Metrics page ───────────────────────────────────────────────────────

const METRICS_PAGE = "wiki/reference/metrics.md"

/** Text safe inside a Markdown paragraph or table cell. */
const md = (s: string) => s.replace(/\\/g, "\\\\").replace(/([*|<{])/g, "\\$1")

const FORMAT: Record<Metric["format"], string> = {
  number: "a number",
  percent: "a percentage",
  percent0: "a whole percentage",
  decimal: "a decimal",
  millions: "millions",
}

function formula(m: Metric): string {
  const c = (k?: string) => `\`${k}\``
  switch (m.type) {
    case "ratio":
      return `Σ ${c(m.numerator)} ÷ Σ ${c(m.denominator)}, a ratio of sums`
    case "mean":
      return `Σ ${c(m.numerator)} ÷ Σ ${c(m.denominator)}, one pooled mean`
    case "change":
      return `(Σ ${c(m.numerator)} − Σ ${c(m.denominator)}) ÷ Σ ${c(m.denominator)}`
    case "sum":
      return `Σ ${c(m.column)}`
    case "count":
      return `the count of ${c(m.column)}`
  }
}

function metricFacts(m: Metric): string[] {
  const shown = [
    FORMAT[m.format],
    m.decimals != null
      ? `${m.decimals} decimal${m.decimals === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ")
  return [
    `- **Formula:** ${formula(m)}${m.compute ? ` (computed by \`${m.compute}\`)` : ""}`,
    `- **Shown as:** ${shown}; ${m.better} is better`,
    `- **Metric:** \`${m.name}\`, in \`app/src/metrics/metrics.ts\``,
  ]
}

function termSections(id: string, t: TermEntry): string[] {
  const out: string[] = []
  const used = TERM_USAGE.filter((u) => (u.terms as string[]).includes(id))
  const facts = [
    t.owner || t.updated
      ? `- **Owner:** ${[t.owner, t.updated && `reviewed ${t.updated}`].filter(Boolean).join(", ")}`
      : null,
    used.length
      ? `- **Used by:** ${used.map((u) => `[${md(u.report)}](${u.path})`).join(", ")}`
      : null,
  ].filter((x): x is string => !!x)
  if (facts.length) out.push(facts.join("\n"))
  if (t.rules?.length)
    out.push(
      "### Rules, in order",
      t.rules.map((r, i) => `${i + 1}. ${md(r)}`).join("\n")
    )
  if (t.inputs?.length)
    out.push(
      "### What it is built from",
      [
        "| Input | Source | How |",
        "| --- | --- | --- |",
        ...t.inputs.map(
          (i) =>
            `| ${md(i.label)} | ${i.kind === "raw" ? "Given" : "Worked out"} | ${md(i.detail)} |`
        ),
      ].join("\n")
    )
  if (t.caveats?.length)
    out.push(
      "### Where it misleads",
      t.caveats.map((c) => `- ${md(c)}`).join("\n")
    )
  if (t.open?.length)
    out.push(
      "### Open: decision owed",
      t.open.map((o) => `- ${md(o)}`).join("\n")
    )
  return out
}

/** One entry as Markdown: a `##` heading, its one line, then its facts and
 *  sections. A term that carries a metric takes the metric's name and line. */
function entry(metric: Metric | undefined, id?: string, term?: TermEntry): string {
  const title = metric ? metric.label : term!.name!
  const line = metric ? metric.definition : term!.oneLine!
  const parts = [`## ${md(title)}`, md(line)]
  const facts = metric ? metricFacts(metric) : []
  const sections = term && id ? termSections(id, term) : []
  // a metric's facts and a term's owner / used-by lines are one list
  if (facts.length && sections[0]?.startsWith("- "))
    parts.push([...facts, sections.shift()].join("\n"))
  else if (facts.length) parts.push(facts.join("\n"))
  parts.push(...sections)
  return parts.join("\n\n")
}

/** Every metric and dictionary term, written out. */
function definitions(): string {
  const metrics = Object.values(METRICS as Record<string, Metric>)
  const terms = Object.entries(TERMS as Record<string, TermEntry>)
  const viaTerm = new Set(terms.flatMap(([, t]) => (t.metric ? [t.metric] : [])))
  const out = [
    ...metrics.filter((m) => !viaTerm.has(m.name)).map((m) => entry(m)),
    ...terms.map(([id, t]) =>
      entry(t.metric ? metrics.find((m) => m.name === t.metric) : undefined, id, t)
    ),
  ]
  return out.length ? out.join("\n\n") : "_No metrics yet._"
}
