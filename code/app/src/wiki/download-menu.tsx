import { Download } from "lucide-react"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

// The wiki page's downloads, grouped behind one glyph in the global header —
// the same slot and the same bare `Download` glyph as a report's .xlsx, so
// the header stays one shape across the app. Copy is client-side from the
// source the loader already sent; the files come from /wiki-export.

export function WikiDownloadMenu({
  slug,
  title,
  source,
}: {
  slug: string
  title: string
  source: string
}) {
  const url = (format: string) => `/wiki-export/${slug}?format=${format}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(`# ${title}\n\n${source}\n`)
      toast.success("Copied as Markdown")
    } catch {
      toast.error("Could not copy to the clipboard")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Download page"
        title="Download page"
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground data-open:bg-accent data-open:text-foreground [&_svg]:size-4 [&_svg]:shrink-0"
      >
        <Download />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => void copy()}>
          Copy as Markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href={url("md")} download />}>
          Download Markdown
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={url("doc")} download />}>
          Download Word
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={url("pdf")} download />}>
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
