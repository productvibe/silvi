---
title: Table
description: Rows and columns, with formats, totals, a column picker, copy, Excel download and row drills.
order: 21
---

`<k.Table>` draws one row per row of a result and the columns you list. Use it
when the reader needs the exact figures. A total row is marked with a yes/no
column (`strong`) and stays at the foot. For the same measures repeated per
group of columns, use [GroupedTable](/wiki/components/grouped-table).

## Example

`regions.sql`:

```sql
-- Sales, orders and share per region, with a total row
select 'North' as region, 120 as sales, 14 as orders, 22.4 as share, 0 as is_total
union all select 'South', 95, 9, 17.8, 0
union all select 'East', 180, 16, 33.6, 0
union all select 'West', 140, 11, 26.2, 0
union all select 'Total', 535, 50, 100.0, 1
```

In `report.tsx`:

```tsx
import regions from "./regions.sql?raw"

type Row = { region: string; sales: number; orders: number; share: number; is_total: number }

// in defineReport({ … })
queries: { regions: query<Row>(regions) },
components: (k) => [
  <k.Table
    key="regions"
    series="regions"
    title="Regions"
    strong="is_total"
    copy
    download="regions"
    columns={[
      { key: "region", label: "Region", format: "text" },
      { key: "sales", label: "Sales" },
      { key: "orders", label: "Orders" },
      { key: "share", label: "Share", format: "percent" },
    ]}
    info={{ what: "Sales and orders per region.", sql: ["regions"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 2) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from |
| `columns` | list of columns, or a function of the data | yes | | The columns, in order; the first names the row |
| `title` | text | no | | The heading; leave it out inside a [tab](/wiki/components/tabs) |
| `strong` | column | no | | A yes/no column: the row is a total, set in medium weight and kept at the foot |
| `muted` | column | no | | A yes/no column: the row is set muted |
| `border` | yes/no | no | no | Draws the table in a card with a hairline edge; without it the table sits open on the page |
| `tag` | column | no | | A text column: a muted word after the first cell, such as "Default" |
| `firstWidth` | width | no | | The first column's width ("10rem", "18%"), so stacked tables line up |
| `formatColumn` | column | no | | A text column naming each row's format, for rows that are measures in their own units |
| `note` | column | no | | A text column: the first cell's definition, on hover |
| `estimate` | column | no | | A column: the row is an estimate, a clock after its first cell with the column's text on hover |
| `sticky` | true/false | no | false | The first column stays put while the rest scroll sideways |
| `copy` | true/false | no | false | A copy button: the table as text and HTML on the clipboard |
| `download` | file name stem | no | | An Excel button in the header; the file is named from the stem, the inputs in force and today |
| `picker` | true/false or a text | no | | A "Columns" button: which columns show and in what order, kept in the URL (`?cols=`); a text names the URL key (`picker="sales"` uses `?sales_cols=`) |
| `sort` | true/false | no | false | With `picker`: the reader may also sort by a column (`?sort=`) |
| `drills` | list of [drills](/wiki/components/drill) | no | | A row's click opens the first drill with a `key` for the row |

### A column

| Key | Type | Required | Meaning |
|---|---|---|---|
| `key` | column | yes, unless `metric` | The column printed |
| `label` | text | no | The header |
| `format`, `prefix`, `suffix`, `decimals` | [format](/wiki/components/common) | no | How the cells print; `format: "text"` for a text column |
| `metric` | metric name | no | A [named metric](/wiki/advanced/metrics): its label and format, and its value when `key` is left out |
| `share` | column | no | Printed small and muted after the value |
| `shareFormat` | format | no | The share's format |
| `sub` | column | no | A second, muted line under the value |
| `subFormat` | format | no | The second line's format |
| `align` | `left` or `right` | no | Numbers align right, text left, unless set |
| `wide` | true/false or `"xl"` | no | Dropped on narrow screens (below `lg`, or below `xl`) |
| `strong` | true/false | no | The column's cells in medium weight, for a total column |
| `width` | width | no | The column's width: "7rem", "96px" or "12%" |
| `note` | text | no | The header's definition on hover |
| `short` | text | no | A few words beside the name in the column picker |
| `hidden` | true/false | no | Left out until the reader picks it |
| `sortable` | true/false | no | `false`: the picker cannot sort by it |
| `unit` | `"muted"` | no | A percent's "%" printed small and muted |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
