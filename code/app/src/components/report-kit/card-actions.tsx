import { Check, Code, Copy, Info } from "lucide-react"
import { useState } from "react"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { cn } from "~/lib/utils"

// The exact query that produced a card's data, surfaced for audit.
export type SqlSource = {
  /** human label, e.g. "Net Signed" or the table queried */
  label?: string
  sql: string
  params?: unknown[]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy SQL"}
    </Button>
  )
}

function SqlBlock({ source }: { source: SqlSource }) {
  const sql = source.sql.trim()
  return (
    <div className="flex flex-col gap-2">
      {source.label && (
        <div className="text-sm font-medium">{source.label}</div>
      )}
      <pre className="max-h-[50vh] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
        <code>{sql}</code>
      </pre>
      {source.params && source.params.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Parameters: </span>
          {source.params.map((p, i) => (
            <span key={i} className="mr-2">
              ${i + 1} = <code>{JSON.stringify(p)}</code>
            </span>
          ))}
        </div>
      )}
      <div>
        <CopyButton text={sql} />
      </div>
    </div>
  )
}

export function CardActions({
  info,
  sql,
  title,
  className,
}: {
  info?: React.ReactNode
  sql?: SqlSource | SqlSource[]
  title?: string
  className?: string
}) {
  const sources = sql ? (Array.isArray(sql) ? sql : [sql]) : []
  const iconBtn =
    "text-muted-foreground/60 hover:text-foreground hover:bg-accent flex size-7 items-center justify-center rounded-md transition-colors [&_svg]:size-4 [&_svg]:shrink-0"

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {info && (
        <Popover>
          <PopoverTrigger aria-label="What is this?" className={iconBtn}>
            <Info />
          </PopoverTrigger>
          <PopoverContent className="w-72 text-sm leading-relaxed">
            {info}
          </PopoverContent>
        </Popover>
      )}
      {sources.length > 0 && (
        <Dialog>
          <DialogTrigger aria-label="View SQL" className={iconBtn}>
            <Code />
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{title ? `SQL — ${title}` : "SQL"}</DialogTitle>
              <DialogDescription>
                The exact query run on the database to produce this data.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {sources.map((s, i) => (
                <SqlBlock key={i} source={s} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
