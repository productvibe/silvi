import { Link } from "react-router"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { cn } from "~/lib/utils"

// The frame the Settings pages share: the document column of
// routes/settings.mcp.tsx, an h1 naming what the page is, one muted line
// under it. The crumb above is the shell's "Settings / <item>".

export function SettingsPage({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6 lg:p-8">
      <header className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </header>
      {children}
    </div>
  )
}

/** Label/value facts. A long unbroken value (a host name) breaks anywhere
 *  rather than overflowing. */
export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid max-w-xl grid-cols-[7rem_1fr] gap-x-4 gap-y-2.5 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere] tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export type PageTab = { value: string; label: string; content: React.ReactNode }

/** Underline tabs (DESIGN.md → Tabs): `variant="line"`, a hairline under the
 *  `w-fit` list. Local state, not `?view=`: every tab is a slice of the one
 *  loader payload. */
export function PageTabs({
  tabs,
  defaultValue,
}: {
  tabs: PageTab[]
  defaultValue?: string
}) {
  return (
    <Tabs
      defaultValue={defaultValue ?? tabs[0]?.value}
      className="min-w-0 gap-0"
    >
      <TabsList variant="line" className="border-b">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="pt-6">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

/** A clickable cell: a `Link` filling the cell (DESIGN.md → Tables), so the
 *  whole rectangle is the target and cmd-click opens a tab. */
export function CellLink({
  to,
  className,
  children,
}: {
  to: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        "-mx-2 -my-[7.5px] block rounded-sm px-2 py-[7.5px] outline-hidden hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {children}
    </Link>
  )
}
