import type { ReactNode } from "react"

// A wiki page's body: the column, the title and the blocks under it. The wiki
// route draws every page with it, and About (the profile block) draws its page
// with it too, so the two read as one kind of page.

export function WikiArticle({
  title,
  children,
}: {
  title: ReactNode
  children: ReactNode
}) {
  return (
    // Notion's page: a 708 px column with 96 px either side, the title at
    // 40/48 bold 112 px under the top bar, then the blocks.
    <article className="mx-auto w-full max-w-[calc(708px+192px)] px-6 pt-16 pb-[30vh] sm:px-24 sm:pt-28">
      {/* The title alone, as a Notion page opens. The frontmatter
          `description` stays in the file — ⌘K, the tree and the exports
          read it — but is not printed under the title. */}
      <header className="flex flex-col pb-1.5">
        <h1 className="text-[2.5rem] leading-[1.2] font-bold">{title}</h1>
      </header>
      <div className="flex flex-col pt-2">{children}</div>
    </article>
  )
}
