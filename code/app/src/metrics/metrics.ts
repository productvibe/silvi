// The named metrics, by camelCase name: which columns a series must carry and
// how they combine. Hand-written; `~/metrics` reads them, and the wiki's
// Metrics page (/wiki/reference/metrics) lists them. The SQL that returns the
// columns stays in the report.
//
//   attachmentRate: {
//     name: "attachmentRate",
//     label: "Attachment rate",
//     type: "ratio",               ratio | sum | count | mean | change
//     numerator: "net_signed",     ratio, mean, change: the summed column on top
//     denominator: "eligible",     ratio, mean: the summed column below
//     format: "percent",           a kit format (report-kit/format.ts)
//     scale: 100,                  optional: the ratio × scale
//     decimals: 2,                 optional: rounded in the data, as toFixed
//     better: "higher",            higher | lower
//     definition: "Net signed ÷ eligible applications, by week created.",
//   },
//
// Relative type imports only: the wiki's build step reads this file.

import type { Metric } from "./schema"

export const METRICS = {} as const satisfies Record<string, Metric>

export type MetricName = keyof typeof METRICS
