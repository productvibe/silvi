import PDFDocument from "pdfkit"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { remark } from "remark"
import remarkGfm from "remark-gfm"

import { APP_NAME, APP_URL } from "~/lib/app"

import { htmlFor, sourceFor } from "./pages.server"
import { renderHtml } from "./render"
import type { WikiPage } from "./tree"

// Server-side renderers for the wiki downloads. Word gets HTML (it reads a
// `.doc` that is HTML with formatting intact — no docx library for a wiki
// page); PDF is laid out with pdfkit's built-in Helvetica from the markdown
// AST, so it needs no font files and no browser on the server.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// Plain HTML for Word: no classes (Word ignores them), a few inline styles.
type Props = any
const docComponents: Record<
  string,
  (p: Props) => ReturnType<typeof createElement>
> = {
  a: ({ href, children }: Props) =>
    createElement(
      "a",
      {
        href: href?.startsWith("/") ? `${APP_URL}${href}` : href,
      },
      children
    ),
  img: ({ src, alt }: Props) =>
    createElement("img", {
      src: src?.startsWith("/") ? `${APP_URL}${src}` : src,
      alt,
      style: { maxWidth: "100%" },
    }),
  table: ({ children }: Props) =>
    createElement(
      "table",
      { border: 1, cellPadding: 6, style: { borderCollapse: "collapse" } },
      children
    ),
  code: ({ children }: Props) =>
    createElement(
      "code",
      { style: { fontFamily: "Consolas, Menlo, monospace" } },
      children
    ),
}

// A callout in plain HTML.
const PLAIN: Record<string, (p: Props) => ReturnType<typeof createElement>> = {
  aside: ({ children }: Props) => createElement("blockquote", null, children),
}

export function renderDoc(page: WikiPage): string {
  const body = renderToStaticMarkup(
    createElement(
      "div",
      null,
      renderHtml(htmlFor(page.file), { ...PLAIN, ...docComponents })
    )
  ).replace(/^<div>|<\/div>$/g, "")
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${esc(page.title)}</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4}h1{font-size:20pt}h2{font-size:14pt;margin-top:18pt}h3{font-size:12pt}p.desc{color:#666}</style>
</head><body>
<h1>${esc(page.title)}</h1>
${page.description ? `<p class="desc">${esc(page.description)}</p>` : ""}
${body}
</body></html>`
}

// ---- PDF -------------------------------------------------------------------

type Node = {
  type: string
  value?: string
  depth?: number
  ordered?: boolean
  children?: Node[]
}

// Inline text with the source's soft line breaks collapsed — markdown wraps
// at 80 columns, the PDF wraps at the page.
const text = (n: Node): string =>
  (n.type === "text" || n.type === "inlineCode"
    ? (n.value ?? "")
    : (n.children ?? []).map(text).join("")
  ).replace(/\s*\n\s*/g, " ")

export async function renderPdf(page: WikiPage): Promise<Buffer> {
  const tree = remark().use(remarkGfm).parse(sourceFor(page.file)) as Node
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 64, bottom: 64, left: 64, right: 64 },
    info: { Title: page.title, Author: APP_NAME },
  })
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  )

  const body = () => doc.font("Helvetica").fontSize(10.5).fillColor("#111")
  const muted = () => doc.font("Helvetica").fontSize(10.5).fillColor("#666")

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#111").text(page.title)
  if (page.description) {
    doc.moveDown(0.3)
    muted().text(page.description)
  }
  doc.moveDown(1)

  const block = (n: Node, indent = 0) => {
    switch (n.type) {
      case "heading": {
        doc.moveDown(n.depth === 2 ? 0.8 : 0.5)
        doc
          .font("Helvetica-Bold")
          .fontSize(n.depth === 2 ? 13 : 11)
          .fillColor("#111")
          .text(text(n))
        doc.moveDown(0.3)
        return
      }
      case "paragraph":
        body().text(text(n), { indent, lineGap: 2 })
        doc.moveDown(0.5)
        return
      case "list": {
        n.children?.forEach((item, i) => {
          const marker = n.ordered ? `${i + 1}.` : "•"
          const x = doc.page.margins.left + indent
          const y = doc.y
          body().text(marker, x, y, { width: 14 })
          doc.y = y
          const paras = (item.children ?? []).filter(
            (c) => c.type === "paragraph"
          )
          body().text(paras.map(text).join("\n"), x + 14, y, {
            width: doc.page.width - doc.page.margins.right - x - 14,
            lineGap: 2,
          })
          doc.moveDown(0.2)
          for (const sub of item.children ?? [])
            if (sub.type === "list") block(sub, indent + 14)
        })
        doc.x = doc.page.margins.left
        doc.moveDown(0.4)
        return
      }
      case "code":
        doc
          .font("Courier")
          .fontSize(9)
          .fillColor("#111")
          .text(n.value ?? "", {
            indent,
          })
        doc.moveDown(0.6)
        return
      case "blockquote":
        muted().text(text(n), { indent: indent + 12 })
        doc.moveDown(0.5)
        return
      case "table": {
        const rows = (n.children ?? []).map((r) => (r.children ?? []).map(text))
        const cols = rows[0]?.length ?? 0
        if (!cols) return
        const width =
          doc.page.width - doc.page.margins.left - doc.page.margins.right
        const colW = width / cols
        const bottom = doc.page.height - doc.page.margins.bottom
        rows.forEach((cells, ri) => {
          doc.font(ri === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(9.5)
          // Measure the row first, so a row that does not fit moves to the
          // next page whole — pdfkit's own page break inside a cell would
          // reset `y` and strand every later cell on its own page.
          const h =
            Math.max(
              ...cells.map((c) => doc.heightOfString(c, { width: colW - 8 }))
            ) + 6
          if (doc.y + h > bottom) doc.addPage()
          const y = doc.y
          cells.forEach((cell, ci) => {
            const x = doc.page.margins.left + ci * colW
            doc.fillColor("#111").text(cell, x, y + 3, { width: colW - 8 })
          })
          doc.y = y + h
          doc
            .moveTo(doc.page.margins.left, doc.y)
            .lineTo(doc.page.width - doc.page.margins.right, doc.y)
            .strokeColor("#ddd")
            .lineWidth(0.5)
            .stroke()
          doc.y += 2
        })
        doc.x = doc.page.margins.left
        doc.moveDown(0.6)
        return
      }
      case "thematicBreak":
        doc.moveDown(0.5)
        return
      default:
        for (const c of n.children ?? []) block(c, indent)
    }
  }
  for (const c of tree.children ?? []) block(c)
  doc.end()
  return done
}
