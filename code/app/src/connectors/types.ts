// The connector interface: how the report-kit reads a database. A connector
// is a folder of this one (`<id>/connector.json` + `<id>/connector.server.ts`),
// found by the registry (index.server.ts), so adding or removing one is
// copying or deleting its folder.
//
// Every connector hands back rows in one shape, whatever its database, so a
// report reads the same on all of them:
//   - a number (any integer, decimal or float type) is a JS number;
//   - a date is its "YYYY-MM-DD" text, a timestamp "YYYY-MM-DD HH:MM:SS";
//   - a boolean is a boolean, text is text, NULL is null.

export type Row = Record<string, unknown>

/** A result column, for a check of a query's columns: its name and its kind. */
export type Column = {
  name: string
  type: "number" | "text" | "date" | "timestamp" | "boolean"
}

export interface Connector {
  id: string
  label: string
  /** SQL with positional $1..$n, as the kit binds $from/$to/params. */
  query(sql: string, params: unknown[]): Promise<Row[]>
  /** The columns `sql` returns, without its rows (or with as few as the
   *  database allows). For a check of a query's columns, never for a page. */
  columns(sql: string, params: unknown[]): Promise<Column[]>
  /** Close the pool, so a short-lived process (the check) can exit. */
  close(): Promise<void>
}

/** What `connector.json` says: the CLI reads it to install a connector. */
export type ConnectorInfo = {
  id: string
  label: string
  /** where the configurator and `silvi list` show it: data files, a local
   *  database file, or a hosted database */
  group: "files" | "local" | "hosted"
  /** npm packages this connector uses, as `package.json` lists them */
  packages: Record<string, string>
  /** their type packages (`@types/…`), for `devDependencies` */
  devPackages?: Record<string, string>
  /** seed files under `app/` the CLI copies once with the connector and
   *  never tracks, like reports (a sample `data/csv/sales.csv`) */
  data?: string[]
  /** its `.env` keys; one with a `default` may be left unset */
  env: { name: string; example: string; note: string; default?: string }[]
}

/** A connector that cannot run: shown on the report's page as it is. */
export class ConnectorError extends Error {
  name = "ConnectorError"
}

/** The values of a connector's env keys, their defaults filled in. Throws a
 *  ConnectorError naming every key that is unset, so the app starts without
 *  them and a report says what to put in `.env`. */
export function requireEnv(info: ConnectorInfo): Record<string, string> {
  const out: Record<string, string> = {}
  const missing: string[] = []
  for (const e of info.env) {
    const v = process.env[e.name] || e.default
    if (v !== undefined) out[e.name] = v
    else missing.push(e.name)
  }
  if (missing.length)
    throw new ConnectorError(
      `${info.label} is not set up: set ${missing.join(", ")} in app/.env (see app/.env.example).`
    )
  return out
}

/** `$1..$n` rewritten by `to`, outside quoted strings and identifiers. */
export function rewritePlaceholders(
  sql: string,
  to: (n: number) => string
): string {
  return sql.replace(
    /'(?:[^']|'')*'|"(?:[^"]|"")*"|\$(\d+)\b/g,
    (m, n: string | undefined) => (n ? to(Number(n)) : m)
  )
}

/** `$1..$n` rewritten to `?`, one per use, with the values in that order:
 *  for a driver whose placeholders are anonymous (SQLite, MySQL). */
export function positional(
  sql: string,
  params: unknown[]
): { sql: string; values: unknown[] } {
  const order: number[] = []
  const text = rewritePlaceholders(sql, (n) => {
    order.push(n)
    return "?"
  })
  return { sql: text, values: order.map((n) => params[n - 1]) }
}

/** A Date as the "YYYY-MM-DD" (or "YYYY-MM-DD HH:MM:SS") text, in UTC: what
 *  the database stored, not shifted to the server's time zone. */
export function dateText(d: Date, time: boolean): string {
  const iso = d.toISOString()
  return time ? `${iso.slice(0, 10)} ${iso.slice(11, 19)}` : iso.slice(0, 10)
}

declare global {
  var __silviPools: Map<string, unknown> | undefined
}

/** One pool per connector per process: made on first use and kept across
 *  dev reloads. A `make` that throws (an unset env) keeps nothing, so the
 *  next query tries again once `.env` is filled in. */
export function pooled<T>(id: string, make: () => T): T {
  const pools = (globalThis.__silviPools ??= new Map())
  if (!pools.has(id)) pools.set(id, make())
  return pools.get(id) as T
}

/** Forget a connector's pool (after `close`, or a failed connect). */
export function forgetPool(id: string): void {
  globalThis.__silviPools?.delete(id)
}
