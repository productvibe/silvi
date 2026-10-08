import type { ComponentProps, ComponentType } from "react"
import { Link } from "react-router"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { cn } from "~/lib/utils"

// How wiki prose renders. One mapping for every page, so no page can style
// itself. The blocks are Notion's, measured on app.notion.com (2026-09-29):
// text 16/24 with 8 px above and below each block, headings at Notion's
// sizes — a page's sections (`##`, the top level here, since the title is the
// route's) are Notion's Heading 1 at 30 px, `###` Heading 2 at 24 px, `####`
// Heading 3 at 20 px, all semibold at 1.3 with Notion's air above them — lists, quotes, dividers, code blocks,
// callouts and grid tables as Notion draws them. The page title is the route's
// (route.tsx), not the document's.

function heading(Tag: "h1" | "h2" | "h3" | "h4", className: string) {
  return function Heading({
    className: extra,
    ...props
  }: React.ComponentProps<typeof Tag>) {
    return <Tag className={cn(className, extra)} {...props} />
  }
}

function Anchor({ href = "", children, ...props }: React.ComponentProps<"a">) {
  // Notion's link: the text colour, a thin underline at 40 %.
  const className =
    "underline decoration-foreground/40 decoration-[0.05em] underline-offset-[0.15em] transition-colors hover:decoration-foreground"
  // In-app links (another wiki page, a module) navigate client-side; anything
  // with a scheme is an external site and opens in a new tab.
  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a
      href={href}
      className={className}
      {...(/^[a-z]+:/i.test(href)
        ? { target: "_blank", rel: "noreferrer" }
        : {})}
      {...props}
    >
      {children}
    </a>
  )
}

/** A set-off note: `> [!NOTE]`, an <aside> in the page's HTML. */
function Callout({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="my-1 flex flex-col gap-1 rounded-[0.625rem] bg-block px-4 py-4 text-base leading-6">
      <div className="flex flex-col [&_p]:py-0.5">
        {children}
      </div>
    </aside>
  )
}

/** An image is a figure: full column width, the app's card radius and
 *  hairline border, and the alt text as its caption. Files live in
 *  `public/wiki/` and are referenced as `/wiki/<file>` (DESIGN.md → Wiki). */
function Img({ alt, ...props }: ComponentProps<"img">) {
  return (
    <figure className="my-1 py-1">
      <img alt={alt} loading="lazy" className="w-full rounded-sm" {...props} />
      {alt && (
        <figcaption className="pt-1.5 pb-1 text-sm leading-5 text-muted-foreground">
          {alt}
        </figcaption>
      )}
    </figure>
  )
}

type Props = Record<string, unknown> & { children?: React.ReactNode }

// A wiki table is the app's table — Notion's database table (ui/table.tsx):
// light lines under every row and between columns, none on the outer edges,
// the quiet 14 px header. Wiki cells wrap and sit at the top of the row.
const CELL = "align-top whitespace-normal"

export const wikiComponents: Record<string, ComponentType<any>> = {
  h1: heading(
    "h1",
    "pt-8 pb-2 text-[1.875rem] leading-[1.3] font-semibold first:pt-1"
  ),
  h2: heading(
    "h2",
    "pt-8 pb-2 text-[1.875rem] leading-[1.3] font-semibold first:pt-1"
  ),
  h3: heading(
    "h3",
    "pt-7 pb-2 text-2xl leading-[1.3] font-semibold first:pt-1"
  ),
  h4: heading(
    "h4",
    "pt-[1.125rem] pb-2 text-xl leading-[1.3] font-semibold first:pt-1"
  ),
  p: (props: Props) => <p className="py-2 text-base leading-6" {...props} />,
  a: Anchor,
  ul: (props: Props) => (
    <ul
      className="list-disc py-[0.3125rem] pl-6 text-base leading-6 marker:text-foreground [&_ul]:list-[circle] [&_ul_ul]:list-[square]"
      {...props}
    />
  ),
  ol: (props: Props) => (
    <ol
      className="list-decimal py-[0.3125rem] pl-6 text-base leading-6 [&_ol]:list-[lower-alpha]"
      {...props}
    />
  ),
  li: (props: Props) => <li className="py-[0.1875rem] pl-1.5 [&_li]:py-[0.1875rem] [&>p]:py-0 [&>ul]:py-0 [&>ol]:py-0" {...props} />,
  blockquote: (props: Props) => (
    <blockquote
      className="my-1 border-l-[3px] border-foreground px-3.5 text-base leading-6 [&>p]:py-0.5"
      {...props}
    />
  ),
  hr: () => <hr className="my-1.5 border-border" />,
  aside: Callout,
  img: Img,
  strong: (props: Props) => <strong className="font-semibold" {...props} />,
  // Notion's inline code: mono at 85 %, red on a warm grey chip. Its code
  // block: mono at 85 % on the block ground, 10 px corners.
  code: ({ className, ...props }: ComponentProps<"code">) =>
    className?.startsWith("language-") ? (
      <code className={cn("font-mono", className)} {...props} />
    ) : (
      <code
        className="rounded-[0.25rem] bg-code-inline-bg px-[0.4em] py-[0.2em] font-mono text-[85%] text-code-inline"
        {...props}
      />
    ),
  pre: (props: Props) => (
    <pre
      className="my-1.5 overflow-x-auto rounded-[0.625rem] bg-block pt-[2.125rem] pr-4 pb-8 pl-8 font-mono text-[0.85rem] leading-[1.5] whitespace-pre"
      {...props}
    />
  ),
  // GFM tables land on the app's own table, so a wiki table and a report
  // table are one design. Markdown alignment (`---:`) arrives as `style` /
  // `align` on the cell and is passed through.
  table: (props: Props) => (
    <div className="py-2">
      <Table {...props} />
    </div>
  ),
  thead: (props: Props) => <TableHeader {...props} />,
  tbody: (props: Props) => <TableBody {...props} />,
  tr: (props: Props) => <TableRow {...props} />,
  th: (props: Props) => <TableHead className="whitespace-normal" {...props} />,
  td: (props: Props) => <TableCell className={CELL} {...props} />,
}
