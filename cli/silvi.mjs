#!/usr/bin/env node
// silvi: start a Silvi reports app, and add, remove and update the
// connectors its reports read from.
//
// A connector is a folder, app/src/connectors/<id>/, that the app finds by
// convention; its connector.json names its npm packages and its env. The CLI
// copies the folder, adds the packages and writes the env into
// app/.env.example.
//
// No command asks a question: each runs to the end or refuses with a reason,
// because Claude runs it as often as the person does.

import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"

import {
  apply,
  filesUnder,
  findApp,
  hashFile,
  hashText,
  missingPackages,
  readState,
  STATE_FILE,
  writeState,
} from "./lib/app.mjs"
import {
  baseImports,
  connectorDir,
  CONNECTORS_DIR,
  ENV_FILE,
  envAppend,
  envFile,
  envRemove,
  GROUPS,
  groupedIds,
  isContent,
  openKit,
  readJson,
  sortIds,
} from "./lib/kit.mjs"
import {
  DEFAULT_PRESET,
  decodePreset,
  encodePreset,
  PRESET_FIELDS,
  THEME_FILES,
  themeCss,
  themeJson,
  themePackages,
} from "./lib/preset.mjs"

const HERE = path.dirname(fileURLToPath(import.meta.url))
// The kit beside the CLI in silvi-dev; run from GitHub (npx), the public repo.
const LOCAL_KIT = path.resolve(HERE, "..", "code")
const DEFAULT_KIT =
  process.env.SILVI_KIT ??
  (existsSync(path.join(LOCAL_KIT, CONNECTORS_DIR))
    ? LOCAL_KIT
    : "github:productvibe/silvi")

const HELP = `silvi: start a reports app and pick the databases it reads

  silvi init <folder> --connectors <id,id> [--preset <code>]
                                           start a new app with these
                                           connectors, in the preset's theme
  silvi list                               the connectors, ✓ when installed
  silvi add <connector>...                 add connectors
  silvi remove <connector>                 take a connector out
  silvi update [--to <tag>]                take a newer kit, keep your edits
  silvi apply --preset <code>              redraw the app in a preset's theme

  Connectors:
    Data files       excel, csv, json
    Local database   sqlite
    Hosted database  sqlserver, postgres, mysql, bigquery, redshift

  --kit <folder|git url>   where the kit comes from (default: ${DEFAULT_KIT})
  --to <tag>               take the kit at this tag
  --dry-run                show what would change, change nothing
  --json                   print the result as JSON
  --no-install             skip npm install
`

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    kit: { type: "string" },
    to: { type: "string" },
    connectors: { type: "string" },
    preset: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    "no-install": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
})

const [command, ...args] = positionals
const dryRun = opts["dry-run"]
const result = { command, dryRun, notes: [], changes: [] }

const say = (line) => result.notes.push(line)

// ── commands ────────────────────────────────────────────────────────────────

function init([folder]) {
  if (!folder)
    throw new Error("name the folder: silvi init <folder> --connectors <ids>")
  const root = path.resolve(folder)
  if (existsSync(root) && readdirSync(root).length)
    throw new Error(`${folder} is not empty`)

  const source = kitSource()
  const kit = openKit(source, opts.to)
  const known = groupedIds(kit.connectors)
  // The order asked for decides SILVI_CONNECTOR; the files do not care.
  const asked = [
    ...new Set((opts.connectors ?? "").split(",").map((s) => s.trim())),
  ].filter(Boolean)
  if (!asked.length)
    throw new Error(
      `pick the databases your reports read: --connectors <ids>, from ${known} (for example --connectors csv)`,
    )
  checkIds(kit, asked)
  const ids = sortIds(asked)
  const code = presetCode(opts.preset ?? encodePreset(DEFAULT_PRESET))

  const changes = [
    ...kit.base.map((file) => ({ op: "copy", file, track: true })),
    // The person's from the start: data, wiki pages and the package files.
    ...kit.content.map((file) => ({ op: "seed", file })),
    ...ids.flatMap((id) => connectorChanges(kit, id)),
    ...ids.flatMap((id) => seedChanges(kit, id)),
    {
      op: "write",
      file: ENV_FILE,
      text: envFile(asked.map((id) => kit.connectors[id])),
    },
    ...themeChanges(root, { files: {} }, code),
  ]

  // The package files are the kit's, less what only the connectors left
  // out use (pg stays while redshift or postgres is in; one a base file
  // imports, exceljs, always stays), plus what a chosen connector or the
  // theme needs that the kit's package.json lacks.
  const kitPkg = readJson(kit.dir, "app/package.json")
  const kitDeps = { ...kitPkg.dependencies, ...kitPkg.devDependencies }
  const needed = connectorPackages(kit, ids)
  const neededDev = connectorDevPackages(kit, ids)
  for (const [id, c] of Object.entries(kit.connectors)) {
    if (ids.includes(id)) continue
    for (const pkg of Object.keys(c.packages)) {
      if (pkg in needed || baseImports(kit, pkg)) continue
      // A package's types go with it (@types/pg with pg).
      for (const name of [pkg, typesOf(pkg)])
        if (name in kitDeps && !(name in neededDev))
          changes.push({ op: "unpackage", name })
    }
    for (const name of Object.keys(c.devPackages))
      if (name in kitDeps && !(name in neededDev))
        changes.push({ op: "unpackage", name })
  }
  const extra = { ...needed, ...themePackages(decodePreset(code)) }
  for (const [name, version] of Object.entries(extra))
    if (!(name in kitDeps)) changes.push({ op: "package", name, version })
  for (const [name, version] of Object.entries(neededDev))
    if (!(name in kitDeps))
      changes.push({ op: "package", name, version, dev: true })
  // An unpackage of the same name twice is harmless; keep each once.
  dedupePackages(changes)

  const state = {
    kit: source,
    ref: opts.to ?? null,
    version: kit.version,
    preset: code,
    connectors: ids,
    files: {},
  }
  commit(root, kit, changes, state, { install: true })
  say(`Started a Silvi app in ${folder}, reading ${labels(kit, asked)}.`)
  const keys = connectorEnv(asked.map((id) => kit.connectors[id]))
  say(
    keys
      ? `Next: cd ${folder}/app, copy .env.example to .env and fill in ${keys}, then npm run dev`
      : `Next: cd ${folder}/app and npm run dev (no .env needed)`,
  )
}

function list() {
  const root = tryFindApp()
  const state = root && readState(root)
  const kit = openKit(kitSource(state), state?.ref ?? undefined)
  const rows = Object.values(kit.connectors).map((c) => ({
    id: c.id,
    label: c.label,
    group: c.group ?? null,
    packages: Object.keys(c.packages),
    env: c.env.map((v) => v.name),
    installed: !!root && installed(root, c.id),
  }))
  result.connectors = rows
  const groups = [...GROUPS, { id: undefined, label: "Other" }]
  for (const g of groups) {
    const these = rows.filter((r) =>
      g.id ? r.group === g.id : !GROUPS.some((x) => x.id === r.group),
    )
    if (!these.length) continue
    if (result.notes.length) say("")
    say(g.label)
    for (const r of these)
      say(`  ${r.installed ? "✓" : " "} ${r.id.padEnd(11)} ${r.label}`)
  }
}

function add(named) {
  if (!named.length)
    throw new Error("name the connector: silvi add <connector>...")
  const root = findApp(".")
  const state = readState(root)
  const kit = openKit(kitSource(state), state.ref ?? undefined)
  checkIds(kit, named)
  // One the app already has is skipped, not refused, so one line from the
  // configurator's Existing app tab runs on any app.
  const skipped = named.filter((id) => installed(root, id))
  const ids = sortIds([...new Set(named.filter((id) => !skipped.includes(id)))])
  if (skipped.length) say(`Already in this app: ${skipped.join(", ")}.`)
  if (!ids.length) return

  const envAbs = path.join(root, ENV_FILE)
  const chosen = ids.map((id) => kit.connectors[id])
  const env = existsSync(envAbs)
    ? envAppend(readFileSync(envAbs, "utf8"), chosen)
    : envFile(
        sortIds([...state.connectors, ...ids])
          .filter((id) => kit.connectors[id])
          .map((id) => kit.connectors[id]),
      )
  const changes = [
    ...ids.flatMap((id) => connectorChanges(kit, id)),
    ...ids.flatMap((id) => seedChanges(kit, id)),
    ...missingPackages(root, connectorPackages(kit, ids)),
    ...missingPackages(root, connectorDevPackages(kit, ids), { dev: true }),
    { op: "write", file: ENV_FILE, text: env },
  ]
  state.connectors = sortIds([...new Set([...state.connectors, ...ids])])
  commit(root, kit, changes, state, {
    install: changes.some((c) => c.op === "package"),
  })
  const keys = connectorEnv(chosen)
  say(
    `Added ${labels(kit, ids)}.${keys ? ` Fill in ${keys} in .env.` : " No .env keys needed."}`,
  )
}

function remove([id]) {
  if (!id) throw new Error("name the connector: silvi remove <connector>")
  const root = findApp(".")
  const state = readState(root)
  const dir = connectorDir(id)
  if (!installed(root, id)) throw new Error(`"${id}" is not in this app`)
  const json = path.join(root, dir, "connector.json")
  const connector = existsSync(json)
    ? {
        packages: {},
        devPackages: {},
        env: [],
        ...readJson(root, `${dir}/connector.json`),
        id,
      }
    : { id, label: id, packages: {}, devPackages: {}, env: [] }

  // The kit's folder goes; one the person changed stays, whole, with the
  // changed files listed.
  const files = filesUnder(root, dir)
  const changed = files.filter(
    (f) =>
      !(f in state.files) || hashFile(path.join(root, f)) !== state.files[f],
  )
  const changes = []
  if (changed.length) {
    for (const f of changed)
      changes.push({
        op: "keep",
        file: f,
        why: "you changed it, so its folder stays",
      })
    commit(root, null, changes, state, { install: false })
    say(
      `Kept ${connector.label}: you changed its files. Delete ${dir}/ yourself to take it out.`,
    )
    return
  }

  changes.push(...files.map((file) => ({ op: "delete", file })))
  const rest = state.connectors.filter((c) => c !== id)
  const envAbs = path.join(root, ENV_FILE)
  if (existsSync(envAbs))
    changes.push({
      op: "write",
      file: ENV_FILE,
      text: envRemove(readFileSync(envAbs, "utf8"), connector, rest[0]),
    })
  state.connectors = rest
  commit(root, null, changes, state, { install: false })

  const packages = Object.keys(connector.packages)
  say(
    `Removed ${connector.label}.${packages.length ? ` Its packages (${packages.join(", ")}) stay in app/package.json.` : ""}`,
  )
  const reports = reportsNaming(root, id)
  result.reports = reports
  if (reports.length)
    say(
      `These reports name connector: ${id} and will show an error until you change them:\n${reports.map((r) => `  ${r}`).join("\n")}`,
    )
}

function update() {
  const root = findApp(".")
  const state = readState(root)
  const ref = opts.to ?? state.ref ?? undefined
  const kit = openKit(kitSource(state), ref)

  const ids = state.connectors.filter((id) => kit.connectors[id])
  const dropped = state.connectors.filter((id) => !kit.connectors[id])
  for (const id of dropped)
    say(`The kit no longer has the connector "${id}"; your files stay.`)

  const expected = [
    ...kit.base,
    ...ids.flatMap((id) => kit.connectors[id].files),
  ]
  const changes = []
  for (const file of expected) {
    const change = updateFile(root, kit, state, file)
    if (change) changes.push(change)
  }
  // The theme is the CLI's, not the kit's: redraw it from the app's preset,
  // an older letter's code rewritten in today's.
  state.preset = presetCode(state.preset ?? encodePreset(DEFAULT_PRESET))
  changes.push(...themeChanges(root, state, state.preset))
  const theme = Object.values(THEME_FILES)
  for (const file of Object.keys(state.files).filter(
    (f) => !expected.includes(f) && !theme.includes(f),
  )) {
    // A file of a connector the kit dropped is the person's now.
    if (dropped.some((id) => file.startsWith(`${connectorDir(id)}/`))) continue
    const abs = path.join(root, file)
    // Tracked once, content now (a report): the person's, so stop tracking.
    if (!existsSync(abs) || isContent(file))
      changes.push({ op: "forget", file })
    else if (hashFile(abs) === state.files[file])
      changes.push({ op: "delete", file })
    else
      changes.push({
        op: "keep",
        file,
        why: "the kit dropped it, but you changed it",
      })
  }

  // The kit's dependencies, less those only a connector this app lacks uses.
  const kitPkg = readJson(kit.dir, "app/package.json")
  const mine = connectorPackages(kit, ids)
  const packages = { ...kitPkg.dependencies, ...mine }
  for (const [id, c] of Object.entries(kit.connectors))
    if (!ids.includes(id))
      for (const name of Object.keys(c.packages))
        if (!(name in mine) && !baseImports(kit, name)) delete packages[name]
  Object.assign(packages, themePackages(decodePreset(state.preset)))
  changes.push(...missingPackages(root, packages))
  changes.push(
    ...missingPackages(root, connectorDevPackages(kit, ids), { dev: true }),
  )

  state.version = kit.version
  state.ref = ref ?? null
  commit(root, kit, changes, state, {
    install: changes.some((c) => c.op === "package"),
  })

  const conflicts = changes.filter((c) => c.op === "kit")
  const replaced = changes.filter((c) => c.op === "copy").length
  say(
    `Updated to ${kit.version}: ${replaced} file${replaced === 1 ? "" : "s"} replaced or added.`,
  )
  if (conflicts.length)
    say(
      `You and the kit both changed ${conflicts.length} file${conflicts.length === 1 ? "" : "s"}; the kit's version is beside each as <file>.kit. Merge them, then delete the .kit files.`,
    )
}

function applyPreset() {
  if (!opts.preset)
    throw new Error("name the preset: silvi apply --preset <code>")
  const root = findApp(".")
  const state = readState(root)
  const code = presetCode(opts.preset)
  const preset = decodePreset(code)
  const changes = [
    ...themeChanges(root, state, code, { always: true }),
    ...missingPackages(root, themePackages(preset)),
  ]
  state.preset = code
  commit(root, null, changes, state, {
    install: changes.some((c) => c.op === "package"),
  })
  const picks = PRESET_FIELDS.map(
    (f) =>
      `${f.label.toLowerCase()} ${f.options.find((o) => o.id === preset[f.key]).label}`,
  ).join(", ")
  say(`Applied preset ${code}: ${picks}.`)
  if (changes.some((c) => c.op === "kit"))
    say(
      "You changed the theme, so yours stays; the preset's version is beside it as <file>.kit. Merge it, then delete the .kit file.",
    )
}

// ── planning ────────────────────────────────────────────────────────────────

/** One kit file against the app: what update does with it. */
function updateFile(root, kit, state, file) {
  const abs = path.join(root, file)
  const kitHash = hashFile(path.join(kit.dir, file))
  const recorded = state.files[file]
  if (!existsSync(abs)) {
    // Deleted by the person: leave it deleted.
    if (recorded) return { op: "keep", file, why: "you deleted it" }
    return { op: "copy", file, track: true }
  }
  const mine = hashFile(abs)
  if (mine === kitHash)
    return recorded === kitHash ? null : { op: "record", file, hash: kitHash }
  if (mine === recorded) return { op: "copy", file, track: true }
  if (recorded === kitHash) return null // only the person changed it
  return { op: "kit", file, hash: kitHash }
}

/** A preset code, checked, in its canonical spelling. */
function presetCode(code) {
  const preset = decodePreset(code)
  if (!preset) throw new Error(`"${code}" is not a preset code`)
  return encodePreset(preset)
}

/** theme.css and theme.json for a preset, against the app's copies. As
 *  update treats a kit file: the person's edit is kept, and the CLI's text
 *  goes beside it as <file>.kit. `always` (apply): write the .kit whenever
 *  the person's file differs, even if the theme they changed was this one. */
function themeChanges(root, state, code, { always = false } = {}) {
  const preset = decodePreset(code)
  const texts = { css: themeCss(preset), json: themeJson(preset) }
  const changes = []
  for (const [kind, file] of Object.entries(THEME_FILES)) {
    const text = texts[kind]
    const hash = hashText(text)
    const abs = path.join(root, file)
    const recorded = state.files[file]
    if (!existsSync(abs)) {
      changes.push({ op: "write", file, text, track: true })
      continue
    }
    const mine = hashFile(abs)
    if (mine === hash) {
      if (recorded !== hash) changes.push({ op: "record", file, hash })
    } else if (mine === recorded) {
      changes.push({ op: "write", file, text, track: true })
    } else if (always || recorded !== hash) {
      changes.push({ op: "kit", file, text, hash })
    }
  }
  return changes
}

function checkIds(kit, ids) {
  const unknown = ids.filter((id) => !kit.connectors[id])
  if (unknown.length)
    throw new Error(
      `the kit has no connector ${unknown.map((u) => `"${u}"`).join(", ")} (it has ${groupedIds(kit.connectors)})`,
    )
}

function connectorChanges(kit, id) {
  return kit.connectors[id].files.map((file) => ({
    op: "copy",
    file,
    track: true,
  }))
}

/** A connector's seed data: copied only where the app has no such file,
 *  and never tracked, so the person's data is never overwritten. */
function seedChanges(kit, id) {
  return (kit.connectors[id].seed ?? []).map((file) => ({ op: "seed", file }))
}

/** The npm packages these connectors use, as package.json lists them. */
function connectorPackages(kit, ids) {
  return Object.assign({}, ...ids.map((id) => kit.connectors[id].packages))
}

/** Their type packages, for devDependencies. */
function connectorDevPackages(kit, ids) {
  return Object.assign(
    {},
    ...ids.map((id) => kit.connectors[id].devPackages ?? {}),
  )
}

/** The DefinitelyTyped name of a package: @types/pg, @types/scope__name. */
const typesOf = (pkg) => `@types/${pkg.replace(/^@(.*)\//, "$1__")}`

function dedupePackages(changes) {
  const seen = new Set()
  for (let i = changes.length - 1; i >= 0; i--) {
    const c = changes[i]
    if (c.op !== "unpackage") continue
    if (seen.has(c.name)) changes.splice(i, 1)
    seen.add(c.name)
  }
}

/** A connector is in the app when its folder has a connector.json. */
function installed(root, id) {
  return existsSync(path.join(root, connectorDir(id), "connector.json"))
}

/** The report files whose `meta` names this connector. */
function reportsNaming(root, id) {
  return filesUnder(root, "app/src/reports")
    .filter((f) => /(^|\/)report\.tsx$/.test(f))
    .filter((f) => {
      const text = readFileSync(path.join(root, f), "utf8")
      const meta = text.match(/\bmeta\s*:\s*\{([\s\S]*?)\}/)
      const named = meta?.[1].match(/\bconnector\s*:\s*["']([\w-]+)["']/)
      return named?.[1] === id
    })
}

// ── running ─────────────────────────────────────────────────────────────────

function commit(root, kit, changes, state, { install }) {
  result.changes = changes
    .filter((c) => !(c.op === "seed" && existsSync(path.join(root, c.file))))
    .map(({ text: _text, ...c }) => c)
  if (dryRun) return
  apply(root, kit?.dir, changes, state)
  writeState(root, state)
  if (install && !opts["no-install"]) {
    execFileSync("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: path.join(root, "app"),
      stdio: opts.json ? ["ignore", 2, 2] : "inherit",
      // On Windows npm is npm.cmd, which Node only runs through a shell.
      shell: process.platform === "win32",
    })
  }
}

function kitSource(state) {
  if (opts.kit) return isLocal(opts.kit) ? path.resolve(opts.kit) : opts.kit
  return state?.kit ?? DEFAULT_KIT
}

const isLocal = (s) => !/^(github:|https?:|git@|ssh:|file:)/.test(s)

function tryFindApp() {
  try {
    return findApp(".")
  } catch {
    return null
  }
}

function labels(kit, ids) {
  const names = ids.map((id) => kit.connectors[id].label)
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
    : names[0]
}

/** The keys these connectors need set: those without a default. */
function connectorEnv(connectors) {
  return connectors
    .flatMap((c) => c.env.filter((v) => v.default === undefined))
    .map((v) => v.name)
    .join(", ")
}

const MARK = {
  unpackage: "-",
  copy: "+",
  seed: "+",
  write: "+",
  kit: "!",
  record: "=",
  delete: "-",
  forget: "-",
  keep: "·",
  package: "+",
}

function print() {
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }
  if (dryRun) {
    for (const c of result.changes) {
      if (c.op === "record" || c.op === "forget") continue
      const what =
        c.op === "package"
          ? `package ${c.name}@${c.version}`
          : c.op === "unpackage"
            ? `package ${c.name}`
            : c.op === "kit"
              ? `${c.file}.kit`
              : c.file
      console.log(`${MARK[c.op]} ${what}${c.why ? `  (${c.why})` : ""}`)
    }
    console.log(`\nDry run: nothing changed. ${STATE_FILE} is untouched.`)
    return
  }
  // A real run names only the files that need the person: kept or to merge.
  for (const c of result.changes) {
    if (c.op !== "kit" && c.op !== "keep") continue
    const what = c.op === "kit" ? `${c.file}.kit` : c.file
    console.log(`${MARK[c.op]} ${what}${c.why ? `  (${c.why})` : ""}`)
  }
  for (const line of result.notes) console.log(line)
}

// ── main ────────────────────────────────────────────────────────────────────

try {
  if (opts.help || !command) {
    process.stdout.write(HELP)
    process.exit(command || opts.help ? 0 : 1)
  }
  const run = { init, list, add, remove, update, apply: applyPreset }[command]
  if (!run) throw new Error(`unknown command "${command}"\n\n${HELP}`)
  run(args)
  print()
} catch (err) {
  if (opts.json)
    console.log(JSON.stringify({ ...result, error: err.message }, null, 2))
  else console.error(`silvi ${command ?? ""}: ${err.message}`)
  process.exit(1)
}
