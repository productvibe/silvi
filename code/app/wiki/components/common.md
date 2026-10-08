---
title: Props every component takes
description: title, description, span, info and metric, the When and Repeat wrappers, and the number formats every component prints with.
order: 2
---

These props work on most components. Each component's page lists only its own; it
says when one of these does not apply.

## Props

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `key` | text | yes | | React's key: any name unique on the page |
| `title` | text, or a function of the data | yes on charts | | The heading over the component |
| `description` | text, or a function of the data | no | | One muted line under the title |
| `span` | `1` or `2` | no | the component's own | `1` takes half the row, `2` the whole row. Two `span={1}` components in a row sit side by side |
| `info` | `{ what, rules, sql }` | no | | The component's own "(i)": `what` is one line (required), `rules` a list of [rule](/wiki/components/rules) ids from the dialog, `sql` a list of query names |
| `metric` | metric name | no | | A [named metric](/wiki/advanced/metrics) on charts: its label, its format, and its value when `y` is left out |

A function of the data reads the report's results: `title={(d) =>
String(d.totals[0].label)}` is the `label` column of the first row of
`totals`.

Default spans: charts (`Line`, `StackedBars`, `CategoryBars`,
`BarsWithLine`, `Treemap`, `Funnel`, `ShareBars`, `Waffle`) take half a
row; `Kpis`, `Table`, `GroupedTable`, `Progress`, `DriverTree`, `Section`,
`Tabs`, `Inputs` and `Custom` take the whole row.

## When and Repeat

Two wrappers from `~/components/report-kit/component-wrap` go around a component:

| Wrapper | Props | Does |
|---|---|---|
| `When` | `when`, `span` | Draws the component inside only while `when` holds: a function of the data (`(d) => d.flags[0].show`), an input's name (drawn while it is on), or `{ input, is }` / `{ input, not }` (`is` and `not` take a value or a list) |
| `Repeat` | `series`, `by`, `label`, `title`, `itemSpan`, `draw` | One copy of a component per value of the `by` column of `series`, each on that value's rows. `draw(title)` returns the component; `{value}` in `title` is replaced by the value (or the `label` column's) |

## Example: When and Repeat

`byRegion.sql`:

```sql
-- Sales per region and month
select 'North' as region, '2026-01' as month, 120 as sales
union all select 'North', '2026-02', 135
union all select 'South', '2026-01', 95
union all select 'South', '2026-02', 102
```

In `report.tsx`:

```tsx
import { Repeat, When } from "~/components/report-kit/component-wrap"

import byRegion from "./byRegion.sql?raw"

type Row = { region: string; month: string; sales: number }

// in defineReport({ … })
page: {
  filterParams: [
    {
      param: "view",
      label: "Show",
      input: "select",
      options: () => [
        { value: "chart", label: "Charts" },
        { value: "table", label: "Table" },
      ],
    },
  ],
},
queries: { byRegion: query<Row>(byRegion) },
components: (k) => [
  <When key="charts" when={{ input: "view", is: "chart" }}>
    <Repeat
      series="byRegion"
      by="region"
      title="Sales in {value}"
      draw={(title) => (
        <k.Line series="byRegion" x="month" xFormat="month" y={{ sales: "Sales" }} title={title as string} />
      )}
    />
  </When>,
  <When key="table" when={{ input: "view", is: "table" }}>
    <k.Table
      series="byRegion"
      title="Sales by region"
      columns={[
        { key: "region", label: "Region", format: "text" },
        { key: "month", label: "Month", format: "month" },
        { key: "sales", label: "Sales" },
      ]}
    />
  </When>,
],
```

## Formats

A `format` prints a number. Numeric formats may start with `+` to print a
sign on a positive value too (`+number` prints "+15 000"), for a change
rather than a level.

| Format | Prints | Example |
|---|---|---|
| `number` (the default) | A whole number with spaces between thousands | 15 000 |
| `count` | A whole number from 100 up, one decimal below | 12,5 · 1 250 |
| `percent` | A value already in percent (0–100), one decimal | 12.3 % |
| `percent0` | The same, no decimals | 12 % |
| `decimal` | A decimal, one by default | 3,5 |
| `millions` | Millions with an M | 4,2M |
| `in_millions` | Millions without a unit; put it in `suffix` | 45,2 M kr |
| `multiple` | A multiple | 2,5× |
| `month` | A `YYYY-MM` key as a month | Mar 2026 |
| `date` | A `YYYY-MM-DD` date | 3 Mar 2026 |
| `text` | The value as it is | North |

Where a format is allowed, `prefix`, `suffix` and `decimals` usually are
too. A missing value prints as "–". A `percent` expects 12.3 for 12.3 %,
not 0.123: multiply by 100 in the SQL.

## Checks

A prop a component does not take, a missing required one or a wrong type fails
the typecheck, as does a `series` that is not one of the report's queries or
a column its rows do not have.
