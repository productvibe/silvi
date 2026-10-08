import type { WikiDoc } from "./plugin"
import { buildTree, type WikiFrontmatter } from "./tree"

// Every wiki page, parsed at build time: `wiki/` is the app-root folder beside
// `src/`, and a page is added by dropping a `.md` file into it — no
// registration anywhere. The wiki's Vite plugin (wiki/plugin.ts) turns each
// file into its HTML, frontmatter, download source and search text, so the
// browser receives only the HTML of the page it opens, from the route's
// loader. Server-only.

type WikiModule = Omit<WikiDoc, "frontmatter"> & {
  frontmatter: WikiFrontmatter
}

const modules = import.meta.glob<WikiModule>("/wiki/**/*.md", {
  eager: true,
  import: "default",
})

export const wikiTree = buildTree(
  Object.entries(modules).map(([file, mod]) => ({
    file,
    frontmatter: mod.frontmatter,
  }))
)

/** The page's HTML (render.tsx draws it). */
export function htmlFor(file: string): string {
  return modules[file]?.html ?? ""
}

/** The page's Markdown, for the downloads. */
export function sourceFor(file: string): string {
  return modules[file]?.source ?? ""
}

/** Every page's text blocks, keyed by file — for a search index. */
export function plainTextByFile(): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(modules).map(([file, mod]) => [file, mod.plainText ?? []])
  )
}
