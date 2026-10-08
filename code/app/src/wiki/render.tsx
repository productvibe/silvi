// Draws a wiki page's HTML (wiki/plugin.ts) with a component map: each
// element by its tag name (`h2`, `p`, `table`, `aside`, …), so the wiki's
// components (components.tsx) style every page and in-app links navigate
// client-side. The Markdown ran at build time; this is all the browser gets.

import { createElement, type ComponentType, type ReactNode } from "react"

type El = { tag: string; attrs: Record<string, string>; children: (El | string)[] }

const VOID = new Set(["br", "hr", "img", "input", "wbr"])
// Whitespace between these elements' children is layout, not text (React
// warns on text inside a table row).
const BLOCK = new Set(["", "table", "thead", "tbody", "tfoot", "tr", "ul", "ol", "aside", "blockquote"])
const ATTR: Record<string, string> = { class: "className", for: "htmlFor", colspan: "colSpan", rowspan: "rowSpan" }

const TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|[^<]+|</g
const ATTRS = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

const decode = (s: string) =>
  s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|#39|apos|nbsp);/gi, (_, e: string) => {
    if (e[0] === "#")
      return String.fromCodePoint(
        e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))
      )
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[
      e.toLowerCase()
    ]!
  })

function parse(html: string): El {
  const root: El = { tag: "", attrs: {}, children: [] }
  const stack = [root]
  for (const m of html.matchAll(TOKEN)) {
    const top = stack[stack.length - 1]
    if (m[0].startsWith("<!--")) continue
    if (m[2] == null) {
      top.children.push(decode(m[0]))
      continue
    }
    const tag = m[2].toLowerCase()
    if (m[1]) {
      const i = stack.map((e) => e.tag).lastIndexOf(tag)
      if (i > 0) stack.length = i
      continue
    }
    const attrs: Record<string, string> = {}
    for (const a of (m[3] ?? "").matchAll(ATTRS))
      attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? "")
    const el: El = { tag, attrs, children: [] }
    top.children.push(el)
    if (!VOID.has(tag) && !m[0].endsWith("/>")) stack.push(el)
  }
  return root
}

export function renderHtml(
  html: string,
  components: Record<string, ComponentType<any>>
): ReactNode {
  const draw = (n: El | string, key: number, parent: string): ReactNode => {
    if (typeof n === "string") return BLOCK.has(parent) && !n.trim() ? null : n
    const props: Record<string, unknown> = { key }
    for (const [k, v] of Object.entries(n.attrs))
      if (k !== "style") props[ATTR[k] ?? k] = v
    const kids = n.children.map((c, i) => draw(c, i, n.tag))
    return createElement(components[n.tag] ?? n.tag, props, ...(kids.length ? kids : []))
  }
  return parse(html).children.map((c, i) => draw(c, i, ""))
}
