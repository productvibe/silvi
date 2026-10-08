---
title: CategoryBars
description: One measure across categories as bars, with a value label per bar and an optional reference line.
order: 12
---

`<k.CategoryBars>` draws one bar per row: a category and its value. Use it
to compare regions, products or channels on one measure. Every category
keeps its label; long ones wrap to two lines, then are cut with the full
text on hover. For a measure over time, use [Line](/wiki/components/line).

## Example

`regions.sql`:

```sql
-- Sales per region, and the average
select 'North' as region, 120 as sales, 133.75 as average
union all select 'South', 95, 133.75
union all select 'East', 180, 133.75
union all select 'West', 140, 133.75
```

In `report.tsx`:

```tsx
import regions from "./regions.sql?raw"

type Row = { region: string; sales: number; average: number }

// in defineReport({ … })
queries: { regions: query<Row>(regions) },
components: (k) => [
  <k.CategoryBars
    key="regions"
    series="regions"
    x="region"
    value="sales"
    reference={(d) => ({ value: d.regions[0]?.average, label: "Average", format: "number" })}
    title="Sales by region"
    info={{ what: "Sales per region against the average.", sql: ["regions"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 1) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from |
| `x` | column | yes | | The category of each bar |
| `value` | column | yes | | The bar's height |
| `title` | text | yes | | The heading |
| `label` | column | no | | A text column printed above each bar instead of its value |
| `height` | height class | no | `h-52` | The chart's height |
| `reference` | `{ value, label, format, decimals }`, or a function of the data returning it | no | | A dashed reference line at `value`; with `format`, the label also prints the value: "Average: 134" |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
