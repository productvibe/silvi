// Client-only: serialize a rendered report subtree into a single, dependency-free
// HTML file. We inline every same-origin stylesheet (the app's own compiled CSS,
// plus the per-chart <style> blocks recharts injects) and clone the live DOM —
// whose charts are already concrete SVG at their measured size — so the saved
// file renders exactly what's on screen with no scripts, network or build step.
//
// Elements marked [data-export-exclude] (e.g. the toolbar buttons, info dialogs)
// are dropped from the clone since they're interactive and meaningless offline.

function collectCss(): string {
  let css = ""
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      // Cross-origin stylesheet — its rules aren't readable; skip it.
      continue
    }
    if (!rules) continue
    for (const rule of Array.from(rules)) css += rule.cssText + "\n"
  }
  return css
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Build the standalone HTML string for `root` (does not trigger a download). */
export function buildReportHtml(root: HTMLElement, title: string): string {
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll("[data-export-exclude]").forEach((n) => n.remove())
  // The live container dims itself while navigating; never bake that in.
  clone.style.opacity = "1"

  const css = collectCss()
  const htmlClass = document.documentElement.className
  const body = document.body
  const bg = getComputedStyle(body).backgroundColor || "#ffffff"
  const color = getComputedStyle(body).color || "#000000"

  return `<!doctype html>
<html class="${escapeHtml(htmlClass)}" lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${css}</style>
<style>
  html, body { margin: 0; }
  body { background: ${bg}; color: ${color}; }
  /* Static export — no JS, so make sure nothing is hidden behind interactions. */
  [data-export-exclude] { display: none !important; }
</style>
</head>
<body>${clone.outerHTML}</body>
</html>`
}

/** Serialize `root` and trigger a browser download of the resulting .html file. */
export function downloadReportHtml(
  root: HTMLElement,
  filename: string,
  title: string
): void {
  const html = buildReportHtml(root, title)
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".html") ? filename : `${filename}.html`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
