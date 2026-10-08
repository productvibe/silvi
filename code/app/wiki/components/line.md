---
title: Line
description: One or more measures over time as lines, with targets, value labels and small multiples.
order: 10
---

`<k.Line>` draws one line per column of a result, over an x column such
as a month or a week. Use it for a measure over time, or several measures
on one scale. For parts of a whole, use [StackedBars](/wiki/components/stacked-bars);
for one measure across categories, [CategoryBars](/wiki/components/category-bars).

## Example

`monthly.sql`:

```sql
-- Sales and target per month
select '2026-01' as month, 120 as sales, 110 as target
union all select '2026-02', 135, 115
union all select '2026-03', 128, 120
union all select '2026-04', 150, 125
```

In `report.tsx`:

```tsx
import monthly from "./monthly.sql?raw"

type Row = { month: string; sales: number; target: number }

// in defineReport({ … })
queries: { monthly: query<Row>(monthly) },
components: (k) => [
  <k.Line
    key="sales"
    series="monthly"
    x="month"
    xFormat="month"
    y={{ sales: "Sales", target: "Target" }}
    dashed={["target"]}
    title="Sales per month"
    info={{ what: "Sales against the monthly target.", sql: ["monthly"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 1) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from |
| `x` | column | yes | | The column along the x axis, in the order the rows arrive |
| `y` | list of columns, `{ column: label }`, `"*"` or a function of the data | yes, unless `metric` | | The columns drawn, each a line; an object also names them in the legend; `"*"` is every column but `x` |
| `title` | text | yes | | The heading |
| `metric` | metric name | no | | Draws a [named metric](/wiki/advanced/metrics) when `y` is left out; with `y`, sets only the format |
| `xFormat` | `month`, `period` or `week` | no | as written | `month` prints "2026-03" as "Mar 2026"; `period` prints short labels made unique ("Aug", or "Aug 25" and "Aug 26"); `week` prints "2026-W30" as "2026 W30" |
| `percent` | true/false | no | false | The values are percent (0–100) |
| `height` | height class | no | `h-64` | The plot's height, such as `h-80` |
| `target` | number or a function of the data | no | | A dashed reference line at this value |
| `targetLabel` | text | no | | The reference line's label |
| `legend` | true/false | no | true | `false` hides the legend |
| `dashed` | list of columns | no | | These lines are drawn dashed: a projection beside the actual |
| `yWidth` | number | no | 40 | The y axis' width in pixels, when a tick is cut |
| `yDomain` | `[min, max]` | no | from zero | The y axis' range; each end a number or `"auto"`. `["auto", "auto"]` need not start at zero |
| `labels` | true or list of columns | no | | Prints each point's value; the labels thin out when they would overlap |
| `labelDecimals` | `0`, `1` or `2` | no | 1 | Decimals of a percent label |
| `tooltip` | `{column: label}` or `{column: {label, format, decimals}}` | no | | Extra rows in the hover |
| `split` | column | no | | Small multiples: one panel per value of the column, on one shared scale, two or three across |
| `focus` | column | no | | Draws this column in full and every other `y` column faint, with no hover or legend |
| `xLabel` | text | no | | A muted caption under the x axis |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
