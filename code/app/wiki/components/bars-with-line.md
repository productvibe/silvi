---
title: BarsWithLine
description: A count as bars and a rate as a line on one chart, on two axes that share zero.
order: 13
---

`<k.BarsWithLine>` draws one column as bars and another as a line. Use it
for a volume and a rate that belong together: orders as bars, the return
rate as a line. The two axes share their zero. When the two are not a count
and its rate, `separate` draws the line in its own plot under the bars.

## Example

`monthly.sql`:

```sql
-- Orders and return rate per month
select '2026-01' as month, 410 as orders, 4.2 as return_rate
union all select '2026-02', 455, 3.8
union all select '2026-03', 430, 5.1
union all select '2026-04', 498, 4.6
```

In `report.tsx`:

```tsx
import monthly from "./monthly.sql?raw"

type Row = { month: string; orders: number; return_rate: number }

// in defineReport({ … })
queries: { monthly: query<Row>(monthly) },
components: (k) => [
  <k.BarsWithLine
    key="orders"
    series="monthly"
    x="month"
    xFormat="month"
    bar="orders"
    line="return_rate"
    labels={{ orders: "Orders", return_rate: "Return rate" }}
    title="Orders and returns"
    info={{ what: "Orders per month, and the share returned.", sql: ["monthly"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 1) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from |
| `x` | column | yes | | The column along the x axis |
| `bar` | column | yes | | The column drawn as bars |
| `line` | column | yes | | The column drawn as a line |
| `title` | text | yes | | The heading |
| `labels` | `{column: label}` | no | the column names | The legend's words for `bar` and `line` |
| `xFormat` | `month`, `period` or `week` | no | as written | How x prints, as on [line](/wiki/components/line) |
| `metric` | metric name | no | | A [named metric](/wiki/advanced/metrics)'s format |
| `tooltip` | `{column: label}` or `{column: {label, format, decimals}}` | no | | Extra rows in the hover |
| `height` | height class | no | `h-64` | The chart's height; `h-72` for about 25 categories |
| `dashed` | true/false | no | false | The line is dashed: a projection beside measured bars |
| `lineAxis` | `right` or `left` | no | `right` | `left` draws the line on the bars' axis, in the bars' unit |
| `lineFormat` | `percent` or `number` | no | `percent` | The line is a rate, or a plain number |
| `legend` | true/false | no | true | `false` hides the legend |
| `yDomain` | `[min, max]` | no | from zero | The bars' axis range |
| `lineDomain` | `[min, max]` | no | from zero | The line's axis range |
| `split` | column | no | | Small multiples: one panel per value, on shared scales |
| `separate` | true/false | no | false | The line in its own plot under the bars, each captioned by its label |
| `barLabels` | true/false | no | false | Prints each bar's value |
| `lineLabels` | true/false | no | false | Prints each point's value |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
