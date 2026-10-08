---
title: Treemap
description: Shares of a whole as nested rectangles, one per row, optionally grouped.
order: 14
---

`<k.Treemap>` draws one rectangle per row, its area the row's value. Use it
for how a total splits across many categories, where a bar chart would be
too long. With `group`, several groups share one map, each in its own tone.

## Example

`products.sql`:

```sql
-- Sales per product
select 'Lamps' as product, 'Home' as category, 340 as sales
union all select 'Rugs', 'Home', 210
union all select 'Chairs', 'Furniture', 480
union all select 'Tables', 'Furniture', 390
union all select 'Shelves', 'Furniture', 150
```

In `report.tsx`:

```tsx
import products from "./products.sql?raw"

type Row = { product: string; category: string; sales: number }

// in defineReport({ … })
queries: { products: query<Row>(products) },
components: (k) => [
  <k.Treemap
    key="products"
    series="products"
    name="product"
    value="sales"
    group="category"
    share
    title="Sales by product"
    info={{ what: "Each product's share of sales.", sql: ["products"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 1) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from |
| `name` | column | yes | | Each rectangle's name |
| `value` | column | yes | | Each rectangle's size |
| `title` | text | yes | | The heading |
| `format` | [format](/wiki/components/common) | no | `number` | How the value prints |
| `suffix` | text | no | | Printed after each value, such as " kr" |
| `group` | column | no | | One map of several groups, in order of first appearance, each in its own tone |
| `groupNote` | column | no | | A muted line after each group's name in the legend (from its first row) |
| `share` | true/false | no | false | Prints each rectangle's share of the whole after its value: "340 · 21.1 %" |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
