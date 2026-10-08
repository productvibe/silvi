import * as React from "react"
import { FileText, Search } from "lucide-react"
import { useFetcher, useNavigate } from "react-router"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "~/components/ui/command"
import { Kbd } from "~/components/ui/kbd"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"
import { matchesPage, pageEntries, type ContentResult } from "~/lib/search"

// Global ⌘K search: page navigation (matched client-side) plus
// free-text content search across all JSON data files (via /search). Renders
// its own sidebar trigger; mount once in the shell.
export function SearchCommand() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const navigate = useNavigate()
  const fetcher = useFetcher<{ q: string; results: ContentResult[] }>()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const q = query.trim()
  const fetcherLoad = fetcher.load
  React.useEffect(() => {
    if (!open || q.length < 2) return
    const t = setTimeout(
      () => fetcherLoad(`/search?q=${encodeURIComponent(q)}`),
      150
    )
    return () => clearTimeout(t)
  }, [open, q, fetcherLoad])

  const pages = q ? pageEntries.filter((p) => matchesPage(p, q)) : pageEntries
  const content = q.length >= 2 && fetcher.data ? fetcher.data.results : []

  const go = (path: string) => {
    setOpen(false)
    setQuery("")
    navigate(path)
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery("")
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          {/* Notion's "Search or ask" box: no fill, a 1 px edge, 8 px corners,
              placeholder-grey text with no glyph, and the shortcut in a small
              chip. Collapsed to icons it is the glyph alone. */}
          <SidebarMenuButton
            tooltip="Search · ⌘K"
            className="mx-1 -mt-1 h-8 w-[calc(100%-0.5rem)] rounded-lg border border-border pr-1.5 pl-2 leading-[1.2] text-faint hover:bg-transparent hover:text-faint group-data-[collapsible=icon]:mx-0 group-data-[collapsible=icon]:mt-0 group-data-[collapsible=icon]:border-0 [&_svg]:text-faint!"
            onClick={() => setOpen(true)}
          >
            <Search className="hidden group-data-[collapsible=icon]:block" />
            <span>Search</span>
            <Kbd className="ml-auto h-[1.125rem] rounded-[0.25rem] bg-kbd px-1 text-[0.6875rem] leading-[1.3] font-medium text-kbd-foreground group-data-[collapsible=icon]:hidden">
              ⌘K
            </Kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search"
        description="Search pages and content across the app"
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search pages and content…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {q.length < 2 && pages.length === 0
                ? "Type to search…"
                : "No results found."}
            </CommandEmpty>
            {pages.length > 0 && (
              <CommandGroup heading="Pages">
                {pages.map((page) => (
                  <CommandItem
                    key={page.path}
                    value={page.path}
                    onSelect={() => go(page.path)}
                  >
                    <page.icon className="text-muted-foreground" />
                    <span className="truncate">{page.title}</span>
                    <CommandShortcut className="pl-4 tracking-normal whitespace-nowrap">
                      {page.context}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {content.length > 0 && (
              <CommandGroup heading="Content">
                {content.map((result, i) => (
                  <CommandItem
                    key={`${result.path}-${i}`}
                    value={`content:${result.path}:${i}`}
                    onSelect={() => go(result.path)}
                  >
                    <FileText className="translate-y-0.5 self-start text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate">{result.page}</span>
                        <CommandShortcut className="pl-4 tracking-normal whitespace-nowrap">
                          {result.context}
                        </CommandShortcut>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {result.snippet.before}
                        <span className="font-semibold text-foreground">
                          {result.snippet.match}
                        </span>
                        {result.snippet.after}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
