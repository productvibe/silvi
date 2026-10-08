---
title: GroupedTable
description: Rows with the same measures repeated under a header per group, such as one group of columns per region.
order: 22
---

`<k.GroupedTable>` draws lead columns (the period, the row's name), then the
same measures once per group, each group under its own header with a rule
before it. Use it when every row compares one set of measures across a few
categories: sales and orders per region, per month. Headers and cells are
small, to fit many columns.

## Example

`monthly.sql`:

```sql
-- Sales and orders per month, for two regions
select '2026-01' as month, 120 as north_sales, 14 as north_orders, 95 as south_sales, 9 as south_orders, 0 as is_total
union all select '2026-02', 135, 15, 102, 10, 0
union all select 'Total', 255, 29, 197, 19, 1
```

In `report.tsx`:

```tsx
import monthly from "./monthly.sql?raw"

type Row = {
  month: string; north_sales: number; north_orders: number
  south_sales: number; south_orders: number; is_total: number
}

// in defineReport({ … })
queries: { monthly: query<Row>(monthly) },
components: (k) => [
  <k.GroupedTable
    key="regions"
    series="monthly"
    title="Sales by region"
    footer="is_total"
    lead={[{ key: "month", label: "Month", format: "month" }]}
    groups={[
      { label: "North", columns: [{ key: "north_sales", label: "Sales" }, { key: "north_orders", label: "Orders" }] },
      { label: "South", columns: [{ key: "south_sales", label: "Sales" }, { key: "south_orders", label: "Orders" }] },
    ]}
    info={{ what: "Sales and orders per month in each region.", sql: ["monthly"] }}
  />,
],
```

The `month` format prints "2026-01" as "Jan 2026" and leaves "Total" as it
is.

## Props

Also `key`, `description`, `span` (default 2) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from |
| `title` | text | yes | | The heading |
| `lead` | list of columns | yes | | The columns before the groups |
| `groups` | list of groups, or a function of the data | yes | | The groups, each `{label, columns}` |
| `strong` | column | no | | A yes/no column: the row in medium weight |
| `muted` | column | no | | A yes/no column: the row muted |
| `border` | yes/no | no | no | Draws the table in a card with a hairline edge; without it the table sits open on the page |
| `footer` | column | no | | A yes/no column: the row goes in the table's foot, under a rule |
| `formatColumn`, `note`, `estimate`, `sticky`, `copy`, `download`, `drills` | | no | | As on [Table](/wiki/components/table); `copy` sits in the empty top-left corner |

A column in `lead` or a group takes the same keys as a
[table column](/wiki/components/table), except `width`.

### A group

| Key | Type | Required | Meaning |
|---|---|---|---|
| `label` | text | yes | The group's header |
| `columns` | list of columns | yes | The group's columns |
| `strong` | true/false | no | The group's cells in medium weight, for a Total group |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
