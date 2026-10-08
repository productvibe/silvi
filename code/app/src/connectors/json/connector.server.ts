// JSON files, through an in-memory SQLite (`better-sqlite3`): every .json
// file in JSON_DIR (default data/json, from app/) is a table named after the
// file (sales.json is `sales`), loaded again when a file changes. A file is
// an array of objects, or `{ "rows": [...] }`; the columns are every key any
// object has.

import Database from "better-sqlite3"
import { readFileSync } from "node:fs"
import path from "node:path"

import {
  folderTables,
  sqliteColumns,
  sqliteQuery,
  type Table,
} from "../sqlite-tables.server"
import {
  forgetPool,
  pooled,
  requireEnv,
  type Connector,
  type ConnectorInfo,
  type Row,
} from "../types"
import json from "./connector.json"

const info = json as ConnectorInfo

async function read(file: string): Promise<Table[]> {
  const data: unknown = JSON.parse(readFileSync(file, "utf8"))
  const rows = Array.isArray(data)
    ? data
    : (data as { rows?: unknown } | null)?.rows
  if (!Array.isArray(rows))
    throw new Error('expected an array of objects, or { "rows": [...] }')
  return [
    {
      name: path.basename(file, path.extname(file)),
      rows: rows.filter(
        (r): r is Row => !!r && typeof r === "object" && !Array.isArray(r)
      ),
    },
  ]
}

const tables = () =>
  pooled(info.id, () =>
    folderTables({
      info,
      dirKey: "JSON_DIR",
      extensions: [".json"],
      open: () => new Database(":memory:"),
      read,
    })
  )

const db = () => tables().db(requireEnv(info).JSON_DIR)

export const connector: Connector = {
  id: info.id,
  label: info.label,
  async query(sql, params) {
    return sqliteQuery(await db(), sql, params)
  },
  async columns(sql, params) {
    return sqliteColumns(await db(), sql, params)
  },
  async close() {
    tables().close()
    forgetPool(info.id)
  },
}
