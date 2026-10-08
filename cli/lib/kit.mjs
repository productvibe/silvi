// The kit: the code/ folder the CLI copies from, in silvi-dev or in the public
// repo (productvibe/silvi). A local folder is read as it stands, uncommitted
// changes included; a git URL (or a local folder with a ref) is cloned at that
// ref into a temporary folder. A repo with the kit in code/ is read from there.
//
// What each file in the kit is follows from where it lives, not from a list:
//
//   connector app/src/connectors/<id>/, with connector.json
//             ({ id, label, group, packages, devPackages, data, env }):
//             copied with the connector, tracked
//   seed      a connector's `data` files (app/data/csv/sales.csv): copied
//             once with the connector, never tracked, like content
//   content   app/data/, app/wiki/, app/src/reports/: the person's, copied
//             once at init, never tracked
//   setup     app/package.json, app/package-lock.json: copied at init, then
//             the person's; `update` only adds missing dependencies
//   env       app/.env.example: written by the CLI from the connectors' env,
//             never copied from the kit
//   theme     app/src/theme.css, app/src/theme.json: written from the preset
//             by the CLI (preset.mjs), never copied from the kit
//   base      every other file the kit's git tracks, outside kit/; this
//             includes app/src/connectors/types.ts and index.server.ts

import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { THEME_FILES } from "./preset.mjs"

export const CONNECTORS_DIR = "app/src/connectors"
export const ENV_FILE = "app/.env.example"

const CONNECTOR_RE = /^app\/src\/connectors\/([^/]+)\//
const CONTENT_RE = /^app\/(data|wiki|src\/reports)\//
const SETUP = new Set(["app/package.json", "app/package-lock.json"])
const WRITTEN = new Set([...Object.values(THEME_FILES), ENV_FILE])

/** The order `list` and the messages use, group by group; a connector not
 *  named here comes after these, by id. */
const ORDER = [
  "excel",
  "csv",
  "json",
  "sqlite",
  "sqlserver",
  "postgres",
  "mysql",
  "bigquery",
  "redshift",
]

/** The groups a connector.json `group` names, in order, with headings. */
export const GROUPS = [
  { id: "files", label: "Data files" },
  { id: "local", label: "Local database" },
  { id: "hosted", label: "Hosted database" },
]

const isUrl = (source) => /^(github:|https?:|git@|ssh:|file:)/.test(source)

function git(dir, ...args) {
  return execFileSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

/** Fetch the kit and sort its files. `source` is a folder or a git URL. */
export function openKit(source, ref) {
  let dir = source
  if (isUrl(source) || ref) {
    const url = source.startsWith("github:")
      ? `https://github.com/${source.slice("github:".length)}.git`
      : source
    dir = mkdtempSync(path.join(tmpdir(), "silvi-kit-"))
    const clone = dir
    process.on("exit", () => rmSync(clone, { recursive: true, force: true }))
    const args = ["clone", "--quiet", "--depth", "1"]
    if (ref) args.push("--branch", ref)
    execFileSync(
      "git",
      [...args, isUrl(url) ? url : `file://${path.resolve(url)}`, dir],
      { stdio: ["ignore", "ignore", "pipe"] },
    )
  } else {
    dir = path.resolve(source)
  }
  if (
    !existsSync(path.join(dir, CONNECTORS_DIR)) &&
    existsSync(path.join(dir, "code", CONNECTORS_DIR))
  )
    dir = path.join(dir, "code")
  if (!existsSync(path.join(dir, CONNECTORS_DIR)))
    throw new Error(`${source} is not a Silvi kit (no ${CONNECTORS_DIR}/)`)

  const sha = git(dir, "rev-parse", "--short", "HEAD")
  const dirty =
    !ref && !isUrl(source) && git(dir, "status", "--porcelain", "--", ".") !== ""
  const version = ref ?? (dirty ? `${sha}+dirty` : sha)

  const files = git(
    dir,
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
  )
    .split("\n")
    .filter(
      (f) =>
        f &&
        !f.startsWith("kit/") &&
        !WRITTEN.has(f) &&
        existsSync(path.join(dir, f)),
    )

  const kit = { dir, source, version, base: [], content: [], connectors: {} }
  const folders = {}
  for (const file of files) {
    let m
    if ((m = file.match(CONNECTOR_RE))) {
      ;(folders[m[1]] ??= []).push(file)
    } else if (CONTENT_RE.test(file) || SETUP.has(file)) {
      kit.content.push(file)
    } else {
      kit.base.push(file)
    }
  }

  // A folder in connectors/ is a connector when it has a connector.json.
  for (const [id, list] of Object.entries(folders)) {
    const json = `${CONNECTORS_DIR}/${id}/connector.json`
    if (list.includes(json)) {
      kit.connectors[id] = {
        packages: {},
        devPackages: {},
        env: [],
        ...readJson(dir, json),
        id,
        files: list,
      }
    } else kit.base.push(...list)
  }

  // A connector's seed data is its own, not every app's content.
  for (const c of Object.values(kit.connectors)) {
    const data = (c.data ?? []).map((f) => `app/${f}`)
    c.seed = kit.content.filter((f) => data.includes(f))
    kit.content = kit.content.filter((f) => !data.includes(f))
  }
  kit.connectors = Object.fromEntries(
    sortIds(Object.keys(kit.connectors)).map((id) => [id, kit.connectors[id]]),
  )
  return kit
}

/** The connectors grouped, for messages: "Data files: excel, csv; …". */
export function groupedIds(connectors) {
  const list = Object.values(connectors)
  const groups = [...GROUPS, { id: undefined, label: "Other" }]
  return groups
    .map((g) => {
      const ids = list
        .filter((c) =>
          g.id ? c.group === g.id : !GROUPS.some((x) => x.id === c.group),
        )
        .map((c) => c.id)
      return ids.length ? `${g.label.toLowerCase()}: ${ids.join(", ")}` : null
    })
    .filter(Boolean)
    .join("; ")
}

/** Whether a base file of the kit imports this package (exceljs: the
 *  table's Excel download), so taking it out with a connector would break
 *  the app. */
export function baseImports(kit, name) {
  kit.sources ??= kit.base
    .filter((f) => /^app\/src\/.*\.(ts|tsx|mts|js)$/.test(f))
    .map((f) => readFileSync(path.join(kit.dir, f), "utf8"))
  const re = new RegExp(
    `(from\\s*|import\\(\\s*|require\\(\\s*)["']${name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}(/[^"']*)?["']`,
  )
  return kit.sources.some((text) => re.test(text))
}

export function sortIds(ids) {
  const rank = (id) => (ORDER.includes(id) ? ORDER.indexOf(id) : ORDER.length)
  return [...ids].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export function readJson(dir, file) {
  return JSON.parse(readFileSync(path.join(dir, file), "utf8"))
}

/** Content and setup files are the person's: never tracked. */
export const isContent = (file) => CONTENT_RE.test(file) || SETUP.has(file)

export const connectorDir = (id) => `${CONNECTORS_DIR}/${id}`

// ── .env.example ────────────────────────────────────────────────────────────

const ENV_HEADER = `# The settings this app reads. Copy this file to .env and fill it in.
# The silvi CLI writes it from each connector's connector.json:
# \`silvi add\` and \`silvi remove\` add and take out a connector's lines.

# The connector a report reads when its meta names none.
`

/** A connector's lines: its label as a comment, then NAME=example  # note. */
export function envSection(connector) {
  const lines = [`# ${connector.label}`]
  for (const v of connector.env ?? [])
    lines.push(`${v.name}=${v.example ?? ""}${v.note ? `  # ${v.note}` : ""}`)
  return lines.join("\n") + "\n"
}

/** The whole file, for these connectors; SILVI_CONNECTOR is the first. */
export function envFile(connectors) {
  return (
    ENV_HEADER +
    `SILVI_CONNECTOR=${connectors[0]?.id ?? ""}\n` +
    connectors.map((c) => "\n" + envSection(c)).join("")
  )
}

/** `text` with these connectors' sections added at the end, less any
 *  whose variables it already has. */
export function envAppend(text, connectors) {
  const have = new Set(
    text.split("\n").map((l) => l.match(/^([A-Z0-9_]+)=/)?.[1]),
  )
  const fresh = connectors.filter(
    (c) => !(c.env ?? []).some((v) => have.has(v.name)),
  )
  if (!fresh.length) return text
  const base = text.endsWith("\n") || !text ? text : text + "\n"
  return base + fresh.map((c) => "\n" + envSection(c)).join("")
}

/** `text` less a connector's label line and variables. A default that
 *  named it moves to `next`, the first connector left. */
export function envRemove(text, connector, next) {
  const names = new Set((connector.env ?? []).map((v) => v.name))
  const out = []
  for (const line of text.split("\n")) {
    if (line === `# ${connector.label}`) continue
    const name = line.match(/^([A-Z0-9_]+)=/)?.[1]
    if (name && names.has(name)) continue
    if (line.trim() === `SILVI_CONNECTOR=${connector.id}`) {
      out.push(`SILVI_CONNECTOR=${next ?? ""}`)
      continue
    }
    // One blank line between sections, never two.
    if (line === "" && out.at(-1) === "") continue
    out.push(line)
  }
  while (out.length > 1 && out.at(-1) === "" && out.at(-2) === "") out.pop()
  return out.join("\n")
}
