// The person's app: its files, its `silvi.json`, and the changes the commands
// plan against it. Every command first plans a list of changes, then either
// prints it (--dry-run) or applies it, so a dry run and a real run can never
// disagree about what would happen.

import { createHash } from "node:crypto"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"

export const STATE_FILE = "silvi.json"

export function hashFile(file) {
  return hashText(readFileSync(file))
}

/** The same hash, of text the CLI writes rather than copies (the theme). */
export function hashText(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 16)
}

/** The app root above `start`: the folder that holds `silvi.json`. */
export function findApp(start) {
  let dir = path.resolve(start)
  for (;;) {
    if (existsSync(path.join(dir, STATE_FILE))) return dir
    const up = path.dirname(dir)
    if (up === dir)
      throw new Error(
        `no ${STATE_FILE} here or above: run this inside a Silvi app, or start one with "silvi init"`,
      )
    dir = up
  }
}

export function readState(root) {
  return JSON.parse(readFileSync(path.join(root, STATE_FILE), "utf8"))
}

export function writeState(root, state) {
  const sorted = Object.fromEntries(
    Object.entries(state.files).sort(([a], [b]) => a.localeCompare(b)),
  )
  const out = {
    ...state,
    files: sorted,
  }
  writeFileSync(
    path.join(root, STATE_FILE),
    JSON.stringify(out, null, 2) + "\n",
  )
}

/** Every file under a folder of the app, as app-root-relative paths. */
export function filesUnder(root, folder) {
  const abs = path.join(root, folder)
  if (!existsSync(abs)) return []
  return readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) =>
      path
        .relative(root, path.join(e.parentPath, e.name))
        .split(path.sep)
        .join("/"),
    )
}

// A change is one of:
//   { op: "copy", file, from, track }  copy a kit file in (track: record its hash)
//   { op: "seed", file, from }         copy only if the file is not there
//   { op: "write", file, text, track } write text the CLI made (the theme)
//   { op: "kit", file, from | text }   write the kit's version beside it as <file>.kit
//   { op: "delete", file }             delete a file
//   { op: "keep", file, why }          leave a file, and say why
//   { op: "package", name, version, dev }  add a dependency to app/package.json
//                                        (dev: to devDependencies)
//   { op: "unpackage", name }          take one out (init: a connector left out)

/** Apply planned changes. Returns whether package.json changed. */
export function apply(root, kitDir, changes, state) {
  let packages = false
  for (const c of changes) {
    const dest = c.file && path.join(root, c.file)
    if (c.op === "copy" || (c.op === "seed" && !existsSync(dest))) {
      mkdirSync(path.dirname(dest), { recursive: true })
      copyFileSync(path.join(kitDir, c.from ?? c.file), dest)
      if (c.track) state.files[c.file] = hashFile(dest)
    } else if (c.op === "write") {
      mkdirSync(path.dirname(dest), { recursive: true })
      writeFileSync(dest, c.text)
      if (c.track) state.files[c.file] = hashText(c.text)
    } else if (c.op === "kit") {
      if (c.text !== undefined) writeFileSync(`${dest}.kit`, c.text)
      else copyFileSync(path.join(kitDir, c.from ?? c.file), `${dest}.kit`)
      state.files[c.file] = c.hash
    } else if (c.op === "record") {
      state.files[c.file] = c.hash
    } else if (c.op === "delete") {
      rmSync(dest, { force: true })
      delete state.files[c.file]
      pruneEmpty(root, path.dirname(c.file))
    } else if (c.op === "forget") {
      delete state.files[c.file]
    } else if (c.op === "package" || c.op === "unpackage") {
      const pkgFile = path.join(root, "app", "package.json")
      const pkg = JSON.parse(readFileSync(pkgFile, "utf8"))
      const key = c.dev ? "devDependencies" : "dependencies"
      const deps = { ...pkg[key] }
      if (c.op === "package") deps[c.name] = c.version
      else delete deps[c.name]
      pkg[key] = sortKeys(deps)
      // An unpackage also takes the name out of devDependencies (@types/…).
      if (c.op === "unpackage" && pkg.devDependencies)
        delete pkg.devDependencies[c.name]
      writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n")
      packages = true
    }
  }
  return packages
}

function pruneEmpty(root, dir) {
  while (dir && dir !== "." && dir !== "app") {
    const abs = path.join(root, dir)
    if (!existsSync(abs) || readdirSync(abs).length) return
    rmSync(abs, { recursive: true })
    dir = path.dirname(dir)
  }
}

function sortKeys(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  )
}

/** Packages that app/package.json lacks (dev: for devDependencies). */
export function missingPackages(root, packages, { dev = false } = {}) {
  const pkg = JSON.parse(
    readFileSync(path.join(root, "app", "package.json"), "utf8"),
  )
  const have = { ...pkg.dependencies, ...pkg.devDependencies }
  return Object.entries(packages)
    .filter(([name]) => !(name in have))
    .map(([name, version]) => ({ op: "package", name, version, dev }))
}
