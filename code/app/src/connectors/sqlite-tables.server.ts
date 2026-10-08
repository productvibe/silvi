// SQLite underneath: what the `sqlite` connector and the data-file connectors
// (`csv`, `excel`, `json`) share. The data-file connectors load the files in
// their folder into an in-memory SQLite database (better-sqlite3), one table
// per file, so a report queries them in SQL like any database.
//
// This file imports no database package: each connector opens its own
// better-sqlite3 database and hands it here, so an app without those
// connectors (and without better-sqlite3) still typechecks.

import { readdirSync, statSync } from "node:fs"
import path from "node:path"

import {
  ConnectorError,
  dateText,
  positional,
  type Column,
  type ConnectorInfo,
  type Row,
} from "./types"

/** The part of a better-sqlite3 Database this file uses. */
export interface SqliteDb {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[]
    run(...params: unknown[]): unknown
    columns(): { name: string; type: string | null }[]
  }
  exec(sql: string): unknown
  close(): unknown
}

/** A table to load: its name and its rows (one object per row). */
export type Table = { name: string; rows: Row[] }

/** A value SQLite can bind: booleans as 1/0, a Date as its text, an object
 *  or array as its JSON. */
function bindable(v: unknown): unknown {
  if (v === undefined) return null
  if (typeof v === "boolean") return v ? 1 : 0
  if (v instanceof Date) return dateText(v, !isMidnight(v))
  if (typeof v === "bigint") return Number(v)
  if (v !== null && typeof v === "object") return JSON.stringify(v)
  return v
}

const isMidnight = (d: Date) =>
  d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0

/** Run `sql` (positional `$1..$n`) on a SQLite database. */
export function sqliteQuery(
  db: SqliteDb,
  sql: string,
  params: unknown[]
): Row[] {
  const p = positional(sql, params)
  return db.prepare(p.sql).all(...p.values.map(bindable)) as Row[]
}

const DATE_TEXT = /^\d{4}-\d{2}-\d{2}$/
const TIMESTAMP_TEXT = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/

/** The columns `sql` returns on a SQLite database. SQLite types values, not
 *  columns, so a column's kind is read from its first value, else from its
 *  declared type. */
export function sqliteColumns(
  db: SqliteDb,
  sql: string,
  params: unknown[]
): Column[] {
  const p = positional(`select * from (\n${sql}\n) as limit_1 limit 1`, params)
  const stmt = db.prepare(p.sql)
  const first = (stmt.all(...p.values.map(bindable))[0] ?? {}) as Row
  return stmt.columns().map((c) => {
    const v = first[c.name]
    const declared = (c.type ?? "").toUpperCase()
    let type: Column["type"] = "text"
    if (typeof v === "number") type = "number"
    else if (typeof v === "string" && DATE_TEXT.test(v)) type = "date"
    else if (typeof v === "string" && TIMESTAMP_TEXT.test(v)) type = "timestamp"
    else if (v == null && /INT|REAL|FLOA|DOUB|NUM|DEC/.test(declared))
      type = "number"
    return { name: c.name, type }
  })
}

// ── loading files ───────────────────────────────────────────────────────────

/** A name as a table or column name: lowercase letters, digits and `_`. */
export function slug(name: string): string {
  const s = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return !s ? "t" : /^\d/.test(s) ? `t_${s}` : s
}

const NUMBER_TEXT = /^-?(0|[1-9]\d*)(\.\d+)?([eE][-+]?\d+)?$/

/** Load tables into `db`: every column the union of its rows' keys
 *  (slugged), a column whose values are all numbers (or number text, as a
 *  CSV gives them) stored as numbers, an empty text as NULL. */
export function loadTables(db: SqliteDb, tables: Table[]): string[] {
  const taken = new Set<string>()
  const unique = (name: string) => {
    let n = name
    for (let i = 2; taken.has(n); i++) n = `${name}_${i}`
    taken.add(n)
    return n
  }
  const names: string[] = []
  for (const t of tables) {
    const name = unique(slug(t.name))
    names.push(name)
    const keys: string[] = []
    const seen = new Set<string>()
    for (const r of t.rows)
      for (const k of Object.keys(r))
        if (!seen.has(k)) (seen.add(k), keys.push(k))
    if (!keys.length) continue
    const colNames = new Set<string>()
    const cols = keys.map((k) => {
      let c = slug(k)
      for (let i = 2; colNames.has(c); i++) c = `${slug(k)}_${i}`
      colNames.add(c)
      return c
    })
    const values = t.rows.map((r) =>
      keys.map((k) => {
        const v = bindable(r[k])
        return v === "" ? null : v
      })
    )
    const numeric = keys.map(
      (_, i) =>
        values.every(
          (row) =>
            row[i] == null ||
            typeof row[i] === "number" ||
            (typeof row[i] === "string" && NUMBER_TEXT.test(row[i] as string))
        ) && values.some((row) => row[i] != null)
    )
    for (const row of values)
      numeric.forEach((isNum, i) => {
        if (isNum && typeof row[i] === "string") row[i] = Number(row[i])
      })
    db.exec(
      `create table "${name}" (${cols
        .map((c, i) => `"${c}" ${numeric[i] ? "numeric" : "text"}`)
        .join(", ")})`
    )
    const insert = db.prepare(
      `insert into "${name}" values (${cols.map(() => "?").join(", ")})`
    )
    db.exec("begin")
    for (const row of values) insert.run(...row)
    db.exec("commit")
  }
  return names
}

/** A folder of data files, loaded into one in-memory database and loaded
 *  again when a file is added, removed or changed (its mtime). */
export function folderTables(opts: {
  info: ConnectorInfo
  /** the env key that names the folder, relative to `app/` */
  dirKey: string
  /** the file extensions to read, lowercase with the dot */
  extensions: string[]
  open: () => SqliteDb
  read: (file: string) => Promise<Table[]>
}) {
  let db: SqliteDb | null = null
  let stamp = ""
  let loading: Promise<SqliteDb> | null = null

  function filesIn(dir: string): string[] {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      throw new ConnectorError(
        `${opts.info.label}: the folder ${dir} does not exist. Make it and put your ${opts.extensions.join(" or ")} files in it, or set ${opts.dirKey} in app/.env.`
      )
    }
    return entries
      .filter(
        (f) =>
          !f.startsWith(".") &&
          !f.startsWith("~$") &&
          opts.extensions.includes(path.extname(f).toLowerCase())
      )
      .sort()
      .map((f) => path.join(dir, f))
  }

  async function load(dir: string): Promise<SqliteDb> {
    const files = filesIn(dir)
    const now = files
      .map((f) => {
        const s = statSync(f)
        return `${f}:${s.mtimeMs}:${s.size}`
      })
      .join("|")
    if (db && now === stamp) return db
    const fresh = opts.open()
    try {
      const tables: Table[] = []
      for (const f of files) {
        try {
          tables.push(...(await opts.read(f)))
        } catch (e) {
          throw new ConnectorError(
            `${opts.info.label}: could not read ${path.basename(f)}: ${(e as Error).message}`
          )
        }
      }
      loadTables(fresh, tables)
    } catch (e) {
      fresh.close()
      throw e
    }
    db?.close()
    db = fresh
    stamp = now
    return db
  }

  return {
    /** The database, loaded again first if a file changed. */
    db(dir: string): Promise<SqliteDb> {
      // One load at a time: queries that arrive together share it.
      loading ??= load(path.resolve(dir)).finally(() => (loading = null))
      return loading
    },
    close() {
      db?.close()
      db = null
      stamp = ""
    },
  }
}
