// The wiki's shape, derived from the files on disk — pure functions, no Markdown
// and no server code, so the shell can import the types and the route's loader
// can build the tree. `pages.ts` is the only module that touches the modules
// themselves.
//
// The model: `wiki/` is the root. A FOLDER is a section and a FILE is a page.
// A folder's own `index.md` is its landing page and carries the folder's
// title and order in its frontmatter; a folder without one is titled from its
// name and sorts after the ordered items. The URL is the path without `.md`,
// with `index` dropped: `wiki/about/connect-claude.md` → `/wiki/about/connect-claude`,
// `wiki/about/index.md` → `/wiki/about`.

/** What a page's `---` block may carry. Everything is optional: a file with
 *  no frontmatter is still a page, titled from its filename. */
export type WikiFrontmatter = {
  title?: string
  description?: string
  /** sort key inside its folder; unset sorts after every set one, A–Z */
  order?: number
  /** the lucide icon on the row (a folder's index page, or a root page) — see panel.tsx */
  icon?: string
  /** `draft` puts a grey Draft badge in the header — the page is not yet agreed */
  status?: string
}

export type WikiPage = {
  kind: "page"
  /** URL slug under /wiki, "" for the root index */
  slug: string
  title: string
  description?: string
  order?: number
  icon?: string
  /** "draft" when the page is not yet agreed; the header shows a badge */
  status?: "draft"
  /** the file's key inside the glob, for the component lookup */
  file: string
}

export type WikiFolder = {
  kind: "folder"
  slug: string
  title: string
  order?: number
  icon?: string
  /** the folder's index page, when it has one */
  index?: WikiPage
  children: WikiNode[]
}

export type WikiNode = WikiPage | WikiFolder

/** A file key as `import.meta.glob` returns it, relative to the glob root. */
export function slugOfFile(file: string): { dir: string; name: string } {
  const rel = file.replace(/^.*?\/wiki\//, "").replace(/\.md$/, "")
  const parts = rel.split("/")
  const name = parts.pop()!
  return { dir: parts.join("/"), name }
}

/** "charge-priority" → "Charge priority". */
export function titleFromName(name: string): string {
  const words = name.replace(/[-_]+/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function byOrder(a: WikiNode, b: WikiNode): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY
  const bo = b.order ?? Number.POSITIVE_INFINITY
  if (ao !== bo) return ao - bo
  return a.title.localeCompare(b.title, "en")
}

/** Build the tree from every file's key and frontmatter. */
export function buildTree(
  files: { file: string; frontmatter?: WikiFrontmatter }[]
): WikiFolder {
  const root: WikiFolder = {
    kind: "folder",
    slug: "",
    title: "Wiki",
    children: [],
  }
  const folders = new Map<string, WikiFolder>([["", root]])

  const folderFor = (dir: string): WikiFolder => {
    const have = folders.get(dir)
    if (have) return have
    const parts = dir.split("/")
    const name = parts.pop()!
    const parent = folderFor(parts.join("/"))
    const folder: WikiFolder = {
      kind: "folder",
      slug: dir,
      title: titleFromName(name),
      children: [],
    }
    folders.set(dir, folder)
    parent.children.push(folder)
    return folder
  }

  for (const { file, frontmatter } of files) {
    const { dir, name } = slugOfFile(file)
    const folder = folderFor(dir)
    const isIndex = name === "index"
    const page: WikiPage = {
      kind: "page",
      slug: isIndex ? dir : dir ? `${dir}/${name}` : name,
      title:
        frontmatter?.title ?? (isIndex ? folder.title : titleFromName(name)),
      description: frontmatter?.description,
      order: frontmatter?.order,
      icon: frontmatter?.icon,
      ...(frontmatter?.status === "draft" ? { status: "draft" as const } : {}),
      file,
    }
    if (isIndex) {
      folder.index = page
      if (frontmatter?.title) folder.title = frontmatter.title
      if (frontmatter?.order !== undefined) folder.order = frontmatter.order
      if (frontmatter?.icon) folder.icon = frontmatter.icon
      // The root's index is titled "Wiki" in the crumb regardless of its own
      // heading: the crumb names the place, the page names itself.
      // The root index keeps its own title ("Brief") as a row; the crumb
      // still names the place — see route.tsx.
    } else {
      folder.children.push(page)
    }
  }

  const sort = (folder: WikiFolder) => {
    folder.children.sort(byOrder)
    for (const child of folder.children)
      if (child.kind === "folder") sort(child)
  }
  sort(root)
  return root
}

/** Every page in reading order (folders' index pages first), for search. */
export function flattenPages(folder: WikiFolder): WikiPage[] {
  const out: WikiPage[] = []
  if (folder.index) out.push(folder.index)
  for (const child of folder.children) {
    if (child.kind === "page") out.push(child)
    else out.push(...flattenPages(child))
  }
  return out
}

/** The page at a slug, or undefined. A folder slug resolves to its index. */
export function findPage(root: WikiFolder, slug: string): WikiPage | undefined {
  return flattenPages(root).find((p) => p.slug === slug)
}

/** The folders from the root down to the one holding `slug`, root first. */
export function ancestors(root: WikiFolder, slug: string): WikiFolder[] {
  const parts = slug ? slug.split("/") : []
  const out: WikiFolder[] = [root]
  let cur = root
  for (const part of parts) {
    const next = cur.children.find(
      (c): c is WikiFolder =>
        c.kind === "folder" &&
        c.slug === (cur.slug ? `${cur.slug}/${part}` : part)
    )
    if (!next) break
    out.push(next)
    cur = next
  }
  return out
}
