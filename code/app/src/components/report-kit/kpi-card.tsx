import { Area, AreaChart, ResponsiveContainer } from "recharts"

import {
  CardActions,
  type SqlSource,
} from "~/components/report-kit/card-actions"
import { Badge } from "~/components/ui/badge"
import { Widget } from "~/components/report-kit/widget"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { formatNumber, formatPercent } from "~/lib/format"
import { cn } from "~/lib/utils"

export type KpiCardProps = {
  label: string
  kind: "count" | "rate"
  direction: "up" | "down"
  target: number
  validated: boolean
  /** detailed plain-English explanation, shown in the info popover */
  info: string
  /** the query that produced this card's value, shown in the SQL dialog */
  sql?: SqlSource
  value: number | null
  series: { value: number | null }[]
}

export function KpiCard({
  label,
  kind,
  direction,
  target,
  validated,
  info,
  sql,
  value,
  series,
}: KpiCardProps) {
  const format = (v: number) =>
    kind === "count" ? formatNumber(v) : formatPercent(v)

  const deltaPct = value !== null ? (value / target - 1) * 100 : null
  const onTrack =
    value !== null && (direction === "up" ? value >= target : value <= target)

  return (
    // A widget card with the label and its controls INSIDE, beside the
    // figure: a metric's name belongs with the number.
    <Widget bodyClassName="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          <div className="flex items-center gap-1">
            {!validated && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Badge variant="outline" className="text-muted-foreground">
                      approx
                    </Badge>
                  }
                />
                <TooltipContent className="max-w-64">
                  Definition not yet validated.
                </TooltipContent>
              </Tooltip>
            )}
            <CardActions info={info} sql={sql} title={label} />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">
            {value !== null ? format(value) : "–"}
          </span>
          {deltaPct !== null && (
            <span
              className={cn(
                "text-sm font-medium",
                onTrack ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(0)}%
            </span>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Target {format(target)}
        </div>

        <div className="h-10">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 240, height: 40 }}
          >
            <AreaChart
              data={series}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-chart-1)"
                strokeWidth={1.5}
                fill="var(--color-chart-1)"
                fillOpacity={0.12}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
    </Widget>
  )
}
