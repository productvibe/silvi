---
title: Kpis
description: A row of figures as tiles, from one row of a result or one tile per row, with deltas, targets and drills.
order: 20
---

`<k.Kpis>` draws tiles: a label, a figure, and optional lines under it.
There are two ways to fill them:

- `tiles={[…]}` reads every tile from the **first row** of the result, one
  column per tile. Use it for a page's headline figures.
- `each={{…}}` draws **one tile per row**, naming the columns once. Use it
  when the number of tiles depends on the data, such as one per region.

A row of tiles has no title. Up to four sit side by side.

## Example

`totals.sql`:

```sql
-- This month's headline figures
select 535 as sales, 50 as orders, 10.7 as avg_order,
       12.5 as sales_change, 600 as sales_target, 0 as on_track,
       'October 2026' as period
```

In `report.tsx`:

```tsx
import totals from "./totals.sql?raw"

type Row = {
  sales: number; orders: number; avg_order: number; sales_change: number
  sales_target: number; on_track: number; period: string
}

// in defineReport({ … })
queries: { totals: query<Row>(totals) },
components: (k) => [
  <k.Kpis
    key="totals"
    series="totals"
    tiles={[
      { label: "Sales", value: "sales", delta: "sales_change", deltaLabel: "vs last month", target: "sales_target", status: "on_track" },
      { label: "Orders", value: "orders", period: "period" },
      { label: "Average order", value: "avg_order", format: "decimal", suffix: " kr" },
    ]}
  />,
],
```

## Props

Also `key` and `span` (default 2): see
[Props every component takes](/wiki/components/common). `Kpis` takes no
`title`, `description` or `info`.

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the figures come from |
| `tiles` | list of tiles | one of `tiles` or `each` | | Tiles read off the first row |
| `each` | one tile spec | one of `tiles` or `each` | | One tile per row |
| `drills` | list of [drills](/wiki/components/drill) | no | | The drills a tile's `drill` names |

### A tile in `tiles`

| Key | Type | Required | Meaning |
|---|---|---|---|
| `label` | text | yes, unless `metric` | The tile's label |
| `value` | column | yes, unless `metric` | The figure |
| `format`, `prefix`, `suffix`, `decimals` | [format](/wiki/components/common) | no | How the figure prints |
| `line` | column | no | One muted line under the figure |
| `period` | column | no | The period the tile covers, set smaller |
| `delta` | column | no | A change in percent (12.5 for 12.5 %), printed whole and signed beside the figure: "+13 %", green when up |
| `deltaLabel` | text | no | The words after the delta, such as "vs last month" |
| `target` | column | no | Printed as "/ target" after the figure |
| `status` | column | no | A yes/no column: "On track" in green, or "Off track" muted |
| `metric` | metric name | no | A [named metric](/wiki/advanced/metrics): its label and format, and its value when `value` is left out |
| `drill` | drill name | no | The tile's click opens the [drill](/wiki/components/drill) of this `name` in `drills` |

### The spec in `each`

| Key | Type | Required | Meaning |
|---|---|---|---|
| `label` | column | yes | Each tile's label |
| `value` | column | yes | Each tile's figure |
| `format`, `prefix`, `suffix`, `decimals` | [format](/wiki/components/common) | no | How the figures print |
| `formatColumn` | column | no | A text column naming each row's format, for tiles in mixed units |
| `line`, `period`, `target`, `status` | column | no | As in `tiles` |
| `trend` | column | no | A list of `{value}` points, oldest first: the tile becomes a card with a sparkline |
| `direction` | column | no | `up` (the default) or `down`: which way is good, with `trend` |
| `approx` | column | no | A yes/no column: a badge saying the definition is not settled |
| `definition` | column | no | A text column shown in the card's "(i)" |

## Example: one tile per row

`regions.sql`:

```sql
-- Sales per region
select 'North' as region, 120 as sales
union all select 'South', 95
union all select 'East', 180
```

In `report.tsx`:

```tsx
import regions from "./regions.sql?raw"

// in defineReport({ … })
queries: { regions: query<{ region: string; sales: number }>(regions) },
components: (k) => [
  <k.Kpis key="regions" series="regions" each={{ label: "region", value: "sales" }} />,
],
```

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
