// `npm run results -- <folder>`: every report's query results, as the page
// fetches them (each query once over the wide window, on the report's own
// connector), written to `<folder>/<report>/<query>.json`. The
// configurator's preview (silvi/create) reads these files instead of running
// SQL, so it needs no database. Run it after a report's SQL or data changes.
//
// A report runs through Vite, as the dev server runs it (its `.sql?raw`
// imports and `~/` paths), without serving anything.

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"

import { createServer } from "vite"

const out = process.argv[2]
if (!out) {
  console.error("usage: npm run results -- <folder>")
  process.exit(1)
}
const target = path.resolve(process.env.INIT_CWD ?? process.cwd(), out)
const app = path.resolve(import.meta.dirname, "..")

const vite = await createServer({
  root: app,
  configFile: path.join(app, "vite.config.ts"),
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error",
})

try {
  const kit = await vite.ssrLoadModule("/src/components/report-kit/load.server.ts")
  const { wideWindow } = await vite.ssrLoadModule("/src/lib/report.ts")
  const ids = readdirSync(path.join(app, "src/reports"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
  rmSync(target, { recursive: true, force: true })
  const window = wideWindow()
  for (const id of ids) {
    const { default: def } = await vite.ssrLoadModule(`/src/reports/${id}/report.tsx`)
    const spec = kit.reportSpec(id, def)
    // the params a query reads take their defaults, as a first visit does
    const { params } = kit.filtersFor(spec, new URLSearchParams())
    const rows = await spec.fetch({ ...window, params: params ?? {} })
    mkdirSync(path.join(target, id), { recursive: true })
    for (const [name, list] of Object.entries(rows as Record<string, unknown[]>)) {
      writeFileSync(path.join(target, id, `${name}.json`), `${JSON.stringify(list, null, 1)}\n`)
      console.log(`${id}/${name}.json: ${list.length} rows`)
    }
  }
} finally {
  await vite.close()
}
