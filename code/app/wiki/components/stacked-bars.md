---
title: StackedBars
description: Parts of a whole per period as stacked bars, with totals, shares, rate lines and clickable bars.
order: 11
---

`<k.StackedBars>` stacks one band per column for each x value. Use it for
the parts of a total over time (sales per channel per month), or with
`percent` for their shares. Rates such as a conversion rate can ride on top
as lines with `lines`.

## Example

`byChannel.sql`:

```sql
-- Orders per channel and month, and the share paid by card
select '2026-01' as month, 60 as web, 40 as store, 100 as total, 71.5 as card_rate
union all select '2026-02', 72, 38, 110, 74.0
union all select '2026-03', 80, 45, 125, 73.2
```

In `report.tsx`:

```tsx
import byChannel from "./byChannel.sql?raw"

type Row = { month: string; web: number; store: number; total: number; card_rate: number }

// in defineReport({ … })
queries: { byChannel: query<Row>(byChannel) },
components: (k) => [
  <k.StackedBars
    key="channels"
    series="byChannel"
    x="month"
    xFormat="month"
    y={{ web: "Web", store: "Store" }}
    total="total"
    lines={{ card_rate: "Paid by card" }}
    title="Orders per channel"
    info={{ what: "Orders per channel, with the share paid by card.", sql: ["byChannel"] }}
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
| `y` | list of columns, `{ column: label }`, `"*"` or a function of the data | yes, unless `metric` | | The columns stacked, bottom first |
| `title` | text | yes | | The heading |
| `metric` | metric name | no | | Draws a [named metric](/wiki/advanced/metrics) when `y` is left out |
| `xFormat` | `month`, `period` or `week` | no | as written | How x prints, as on [line](/wiki/components/line) |
| `percent` | true/false | no | false | The bands are shares (0–100); the axis ends at 100 % |
| `height` | height class | no | `h-64` | The plot's height |
| `darkFirst` | true/false | no | false | Reverses the colour order, darkest band first |
| `legend` | true/false | no | true | `false` hides the legend |
| `yWidth` | number | no | | The y axis' width in pixels |
| `counts` | `{column: countColumn}` | no | | On a chart of shares: the hover prints the count behind each band |
| `tooltip` | `{column: label}`, `{column: {label, format, decimals}}` or a function of the data | no | the drawn columns | The hover's rows, for a stack that folds small values into one band |
| `total` | column | no | | Printed above each bar: the stack's total |
| `labels` | true or list of columns | no | | Prints each band's value inside it, dropped when the band is too short |
| `labelDecimals` | `0`, `1` or `2` | no | 1 | Decimals of a percent label |
| `lines` | `{column: label}` or a function of the data | no | | Lines over the bars, on a right-hand % axis |
| `lineLabels` | true or list of `lines` columns | no | | Prints each point's value on the lines |
| `linesFormat` | `percent` or `number` | no | `percent` | The lines are rates, or plain numbers on a compact axis |
| `linesAxis` | `right` or `left` | no | `right` | `left` draws the lines on the bars' own axis, such as a target |
| `yDomain` | `[min, max]` | no | from zero | The bars' axis range; each end a number or `"auto"` |
| `linesDomain` | `[min, max]` | no | from zero | The lines' axis range, such as `[0, 100]` |
| `split` | column | no | | Small multiples: one panel per value, shared scales, one legend |
| `overlays` | `{column: label}` | no | | Bars laid over each band, a little to the right: a subset of its band |
| `scale` | `"sqrt"`, `"log"` or a number in (0, 1] | no | linear | Compresses the axis, for stages that span orders of magnitude |
| `pickPeriod` | `{from: column, to: column}` | no | | Makes the chart the date picker: a click on a bar sets the page's range to that row's two date columns |
| `highlight` | column | no | the rows inside the range, with `pickPeriod` | A yes/no column: those bars in the emphasis colour |
| `segmentParams` | `{column: {param: value}}` or a function of the data | no | | A click on a band sets these URL params; `null` removes one |

A stack with negative values is stacked by sign: positive bands up from
zero, negative ones down.

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
