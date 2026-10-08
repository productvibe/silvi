// Excel files, through `exceljs` and an in-memory SQLite (`better-sqlite3`):
// every sheet of every .xlsx file in EXCEL_DIR (default data/excel, from
// app/) is a table named `<file>_<sheet>` (the sheet Sales of report.xlsx is
// `report_sales`), loaded again when a file changes. A sheet's first row is
// its header; a formula reads as its last computed value.

import Database from "better-sqlite3"
import ExcelJS from "exceljs"
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

/** A cell as a plain value: a formula as its result, rich text and links as
 *  their text, an error as NULL. */
function plain(v: ExcelJS.CellValue): unknown {
  if (v == null || v instanceof Date) return v ?? null
  if (typeof v !== "object") return v
  if ("result" in v) return plain(v.result as ExcelJS.CellValue)
  if ("richText" in v) return v.richText.map((t) => t.text).join("")
  if ("text" in v) return v.text
  if ("error" in v) return null
  return String(v)
}

async function read(file: string): Promise<Table[]> {
  const book = new ExcelJS.Workbook()
  await book.xlsx.readFile(file)
  const base = path.basename(file, path.extname(file))
  return book.worksheets.map((sheet) => {
    const header: string[] = []
    sheet.getRow(1).eachCell((cell, col) => {
      header[col] = String(plain(cell.value) ?? `column_${col}`)
    })
    const rows: Row[] = []
    sheet.eachRow((row, n) => {
      if (n === 1) return
      const r: Row = {}
      row.eachCell((cell, col) => {
        if (header[col]) r[header[col]] = plain(cell.value)
      })
      if (Object.keys(r).length) rows.push(r)
    })
    // Every column, even one empty on every row.
    if (rows.length)
      for (const h of header) if (h && !(h in rows[0])) rows[0][h] = null
    return { name: `${base}_${sheet.name}`, rows }
  })
}

const tables = () =>
  pooled(info.id, () =>
    folderTables({
      info,
      dirKey: "EXCEL_DIR",
      extensions: [".xlsx"],
      open: () => new Database(":memory:"),
      read,
    })
  )

const db = () => tables().db(requireEnv(info).EXCEL_DIR)

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
