// A report's SQL lives in `.sql` files beside its report.tsx, read as text by
// the server, which runs it, and by the "(i)" dialogs, which show it — so what
// is displayed is what ran. Client-safe: no database code here.
//
// A file is a header of `--` lines, then the query:
//
//   -- Sales per week × region                         ← the title
//   -- Anything else in the header is notes for whoever edits the file.
//   select …
//   where sold_on between $from and $to
//
// The variables are compiled by compileSql, below.

export type SqlFile = {
  /** the header's first line */
  title: string
  /** the query, header removed, substitutions NOT applied */
  body: string
}

export function parseSql(raw: string): SqlFile {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  let i = 0
  const header: string[] = []
  while (i < lines.length && /^\s*--/.test(lines[i])) {
    header.push(lines[i].replace(/^\s*--\s?/, ""))
    i++
  }
  return {
    title: header[0]?.trim() ?? "Query",
    body: lines.slice(i).join("\n").trim(),
  }
}

/** Schema-qualified tables a query reads (`from` / `join`), in order of first
 *  appearance — used to list a visual's sources without restating them. */
export function tablesIn(sql: string): string[] {
  const out: string[] = []
  for (const m of sql.matchAll(
    /\b(?:from|join)\s+([a-z_][\w]*\.[a-z_][\w]*)/gi
  )) {
    const t = m[1].toLowerCase()
    if (!out.includes(t)) out.push(t)
  }
  return out
}

// ── Named variables → positional parameters ────────────────────────────────

export type SqlRun = {
  /** values of the named variables ($from, $to and the inputs the page
   *  declares) */
  vars: Record<string, unknown>
  /** `-- if <flag>` lines kept when their flag is set */
  flags?: Record<string, boolean>
  /** `{{name}}` filled from a closed list */
  subs?: Record<string, string>
}

/** The executable text of a query and its arguments: the `--` header
 *  dropped, `-- if` lines kept or dropped, `{{name}}` filled, and every
 *  `$name` bound as a positional parameter in order of first use. Nothing
 *  from the request reaches the text; the values are parameters. */
export function compileSql(
  raw: string,
  { vars, flags = {}, subs = {} }: SqlRun
): { text: string; args: unknown[] } {
  const IF = /\s*--\s*if\s+(\w+)\s*$/
  const body = parseSql(raw)
    .body.split("\n")
    .flatMap((l) => {
      const m = IF.exec(l)
      if (m) return flags[m[1]] ? [l.replace(IF, "")] : []
      return [l]
    })
    .join("\n")
    .replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      const v = subs[name]
      if (v == null) throw new Error(`SQL {{${name}}} has no value`)
      return v
    })
  const order: string[] = []
  const text = body.replace(/\$([A-Za-z_]\w*)\b/g, (_, name: string) => {
    if (!(name in vars) || vars[name] === undefined)
      throw new Error(`SQL variable $${name} has no value`)
    let i = order.indexOf(name)
    if (i < 0) i = order.push(name) - 1
    return `$${i + 1}`
  })
  return { text, args: order.map((n) => vars[n]) }
}
