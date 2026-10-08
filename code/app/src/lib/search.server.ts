import { plainTextByFile, wikiTree } from "~/wiki/pages.server"
import { flattenPages, slugOfFile } from "~/wiki/tree"

import type { ContentResult, SearchSnippet } from "./search"

// Free-text search index over the wiki's pages. Built once at module load,
// server-side only; the palette queries the /search resource route.

type IndexedRecord = {
  text: string
  lower: string
  path: string
  page: string
  context: string
}

const MAX_RESULTS = 30
const MAX_PER_PAGE = 4

// The wiki's pages as text, one record per block, so a rule written in the
// documentation is found by the words in it. The text comes out of the
// wiki's build step (wiki/plugin.ts), not from re-reading the files.
function wikiRecords(): IndexedRecord[] {
  const pages = flattenPages(wikiTree)
  const records: IndexedRecord[] = []
  for (const [file, blocks] of Object.entries(plainTextByFile())) {
    const { dir, name } = slugOfFile(file)
    const slug = name === "index" ? dir : dir ? `${dir}/${name}` : name
    const page = pages.find((p) => p.slug === slug)
    if (!page) continue
    for (const text of blocks) {
      records.push({
        text,
        lower: text.toLowerCase(),
        path: slug ? `/wiki/${slug}` : "/wiki",
        page: page.title,
        context: "Wiki",
      })
    }
  }
  return records
}

function buildIndex(): IndexedRecord[] {
  return wikiRecords()
}

const index = buildIndex()

function makeSnippet(text: string, at: number, len: number): SearchSnippet {
  const start = Math.max(0, at - 48)
  const end = Math.min(text.length, at + len + 96)
  return {
    before: (start > 0 ? "…" : "") + text.slice(start, at),
    match: text.slice(at, at + len),
    after: text.slice(at + len, end) + (end < text.length ? "…" : ""),
  }
}

export function searchContent(query: string): ContentResult[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  // every whitespace-separated token must appear; the snippet and ranking
  // anchor on the full phrase when present, else on the first token
  const tokens = q.split(/\s+/).filter(Boolean)

  const hits: (ContentResult & { score: number })[] = []
  for (const record of index) {
    if (!tokens.every((t) => record.lower.includes(t))) continue
    const [anchor, phraseBonus] =
      record.lower.indexOf(q) !== -1 ? [q, 0] : [tokens[0], 1000]
    const at = record.lower.indexOf(anchor)
    hits.push({
      path: record.path,
      page: record.page,
      context: record.context,
      snippet: makeSnippet(record.text, at, anchor.length),
      // phrase matches first, then earlier and in shorter records
      score: phraseBonus + at + record.text.length * 0.01,
    })
  }
  hits.sort((a, b) => a.score - b.score)

  const perPage = new Map<string, number>()
  const results: ContentResult[] = []
  for (const { score: _score, ...hit } of hits) {
    const count = perPage.get(hit.path) ?? 0
    if (count >= MAX_PER_PAGE) continue
    perPage.set(hit.path, count + 1)
    results.push(hit)
    if (results.length >= MAX_RESULTS) break
  }
  return results
}
