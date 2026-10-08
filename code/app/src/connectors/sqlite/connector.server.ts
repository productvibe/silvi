// SQLite, through `better-sqlite3`: the database file at SQLITE_PATH
// (default data/app.sqlite, from app/), opened read-only once per process.
// The kit binds `$1..$n`; they are rewritten to SQLite's `?` here.

import Database from "better-sqlite3"
import { existsSync } from "node:fs"
import path from "node:path"

import { sqliteColumns, sqliteQuery } from "../sqlite-tables.server"
import {
  ConnectorError,
  forgetPool,
  pooled,
  requireEnv,
  type Connector,
  type ConnectorInfo,
} from "../types"
import json from "./connector.json"

const info = json as ConnectorInfo

function db(): Database.Database {
  return pooled(info.id, () => {
    const file = path.resolve(requireEnv(info).SQLITE_PATH)
    if (!existsSync(file))
      throw new ConnectorError(
        `SQLite: there is no database file at ${file}. Put it there, or set SQLITE_PATH in app/.env.`
      )
    return new Database(file, { readonly: true, fileMustExist: true })
  })
}

export const connector: Connector = {
  id: info.id,
  label: info.label,
  async query(sql, params) {
    return sqliteQuery(db(), sql, params)
  },
  async columns(sql, params) {
    return sqliteColumns(db(), sql, params)
  },
  async close() {
    const d = globalThis.__silviPools?.get(info.id) as
      | Database.Database
      | undefined
    forgetPool(info.id)
    d?.close()
  },
}
