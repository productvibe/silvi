// A kit table as data, for the two ways it leaves the page: the copy glyph
// (text and HTML on the clipboard) and the .xlsx glyph in the header. Both
// read one model built from the table as drawn (its columns in force, its
// groups, its rows), so the file, the paste and the screen cannot disagree.
// First for Board Updates (DESIGN.md → Tables, the column-group exception).

import { fmt, type Fmt } from "./format"

export type ExportColumn = {
  label: string
  format?: Fmt
  decimals?: number
}

export type ExportModel = {
  /** the sheet's name */
  title: string
  /** a first header row of groups over the columns after the lead ones */
  groups?: { label: string; span: number }[]
  /** the columns before the groups: frozen in the file */
  lead: number
  columns: ExportColumn[]
  rows: {
    /** raw values, in column order; a row's format may differ per cell */
    cells: unknown[]
    formats?: (Fmt | undefined)[]
    strong?: boolean
    estimate?: boolean
  }[]
}

const base = (f?: Fmt) => (f ?? "number").replace(/^\+/, "")
const isPercent = (f?: Fmt) => base(f) === "percent" || base(f) === "percent0"
const NUMERIC = ["number", "count", "percent", "percent0", "decimal", "millions", "in_millions", "multiple"]

function label(m: ExportModel, r: ExportModel["rows"][number], i: number, v: unknown) {
  const text = v == null ? "" : String(v)
  return i === 0 && r.estimate ? `${text} (estimate)` : text
}

/** The header rows, as text. */
function heads(m: ExportModel): string[][] {
  const second = m.columns.map((c) => c.label)
  if (!m.groups?.length) return [second]
  const first = [
    ...Array.from({ length: m.lead }, () => ""),
    ...m.groups.flatMap((g) => [g.label, ...Array.from({ length: g.span - 1 }, () => "")]),
  ]
  return [first, second]
}

const formatOf = (m: ExportModel, r: ExportModel["rows"][number], j: number) =>
  r.formats?.[j] ?? m.columns[j]?.format

/** Tab-separated for a spreadsheet, plus an HTML table so a paste into a
 *  document or a slide keeps the header rows. Plain numbers in the TSV (no
 *  thousands space) so a spreadsheet reads them as numbers; a percent with
 *  its sign. */
export async function copyTable(m: ExportModel): Promise<void> {
  const body = m.rows.map((r) =>
    r.cells.map((v, j) => {
      if (typeof v !== "number") return label(m, r, j, v)
      const f = formatOf(m, r, j)
      const d = m.columns[j]?.decimals ?? (base(f) === "percent" ? 1 : 0)
      if (isPercent(f)) return `${v.toFixed(base(f) === "percent0" ? 0 : d)}%`
      return String(v)
    })
  )
  const tsv = [...heads(m), ...body].map((l) => l.join("\t")).join("\n")

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const groupRow = m.groups?.length
    ? `<tr>${m.lead ? `<th colspan="${m.lead}"></th>` : ""}${m.groups
        .map((g) => `<th colspan="${g.span}">${esc(g.label)}</th>`)
        .join("")}</tr>`
    : ""
  const html = `<table><thead>${groupRow}<tr>${m.columns
    .map((c) => `<th>${esc(c.label)}</th>`)
    .join("")}</tr></thead><tbody>${m.rows
    .map(
      (r) =>
        `<tr>${r.cells
          .map((v, j) =>
            typeof v === "number"
              ? `<td>${esc(fmt(v, { format: formatOf(m, r, j), decimals: m.columns[j]?.decimals }))}</td>`
              : `<td>${esc(label(m, r, j, v))}</td>`
          )
          .join("")}</tr>`
    )
    .join("")}</tbody></table>`

  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([tsv], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ])
  } else {
    await navigator.clipboard.writeText(tsv)
  }
}

/** A kit format as an Excel number format, and the value Excel stores for
 *  it (a percent as a fraction, `in_millions` in millions). */
function excel(v: number, f: Fmt | undefined, decimals?: number): { value: number; numFmt: string } {
  const signed = (f ?? "").startsWith("+")
  const d = (n: number) => (n > 0 ? `.${"0".repeat(n)}` : "")
  const sign = (s: string) => (signed ? `+${s};-${s};${s}` : s)
  switch (base(f)) {
    case "percent":
      return { value: v / 100, numFmt: sign(`0${d(decimals ?? 1)}%`) }
    case "percent0":
      return { value: v / 100, numFmt: sign("0%") }
    case "decimal":
      return { value: v, numFmt: sign(`#,##0${d(decimals ?? 1)}`) }
    case "count":
      return { value: v, numFmt: sign(Math.abs(v) >= 100 ? "#,##0" : `#,##0${d(decimals ?? 1)}`) }
    case "millions":
      return { value: v, numFmt: sign(`#,##0${d(decimals ?? 1)},,"M"`) }
    case "in_millions":
      return { value: v / 1e6, numFmt: sign(`#,##0${d(decimals ?? 1)}`) }
    case "multiple":
      return { value: v, numFmt: sign(`0${d(decimals ?? 1)}"×"`) }
    default:
      return { value: v, numFmt: sign("#,##0") }
  }
}

/** The table as an .xlsx: its header rows (each group merged over its
 *  columns), numbers as numbers in their formats, totals bold, the lead
 *  columns and the header frozen. exceljs is loaded on click, so the page
 *  does not carry it. */
export async function downloadXlsx(m: ExportModel, filename: string): Promise<void> {
  const { default: ExcelJS } = await import("exceljs")
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(m.title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Table")

  const hs = heads(m)
  for (const h of hs) ws.addRow(h)
  if (m.groups?.length) {
    let c = m.lead + 1
    for (const g of m.groups) {
      if (g.span > 1) ws.mergeCells(1, c, 1, c + g.span - 1)
      c += g.span
    }
  }
  for (let n = 1; n <= hs.length; n++) {
    const row = ws.getRow(n)
    row.font = { bold: true }
    row.alignment = { horizontal: "right" }
    for (let j = 1; j <= m.lead; j++) row.getCell(j).alignment = { horizontal: "left" }
  }
  for (const r of m.rows) {
    const row = ws.addRow(r.cells.map((v, j) => (typeof v === "number" ? null : label(m, r, j, v))))
    r.cells.forEach((v, j) => {
      if (typeof v !== "number" || !Number.isFinite(v)) return
      const f = formatOf(m, r, j)
      if (!NUMERIC.includes(base(f))) {
        row.getCell(j + 1).value = fmt(v, { format: f })
        return
      }
      const x = excel(v, f, m.columns[j]?.decimals)
      const cell = row.getCell(j + 1)
      cell.value = x.value
      cell.numFmt = x.numFmt
    })
    if (r.strong) row.font = { bold: true }
  }
  m.columns.forEach((_, j) => {
    ws.getColumn(j + 1).width = j < Math.max(m.lead, 1) ? 22 : 12
  })
  ws.views = [{ state: "frozen", xSplit: Math.max(m.lead, 1), ySplit: hs.length }]

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  )
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
