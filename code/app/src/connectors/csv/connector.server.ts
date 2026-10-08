// CSV files, through `csv-parse` and an in-memory SQLite (`better-sqlite3`):
// every .csv file in CSV_DIR (default data/csv, from app/) is a table named
// after the file (sales.csv is `sales`), loaded again when a file changes.
// The first line is the header; a column of numbers is stored as numbers.

import Database from "better-sqlite3"
import { parse } from "csv-parse/sync"
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
  const rows = parse(readFileSync(file), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    // A semicolon file (as Excel writes it in much of Europe) reads too.
    delimiter: [",", ";", "\t"],
  }) as Row[]
  return [{ name: path.basename(file, path.extname(file)), rows }]
}

const tables = () =>
  pooled(info.id, () =>
    folderTables({
      info,
      dirKey: "CSV_DIR",
      extensions: [".csv"],
      open: () => new Database(":memory:"),
      read,
    })
  )

const db = () => tables().db(requireEnv(info).CSV_DIR)

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
