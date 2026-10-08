---
title: Drills
description: Components drawn for one row in a dialog, opened by clicking a table row or a tile.
order: 32
---

A drill is a dialog of components that opens when the reader clicks a row of a
[Table](/wiki/components/table) or [GroupedTable](/wiki/components/grouped-table),
or a [tile](/wiki/components/kpis). The components inside draw on the page's own
data, with every result that has the `match` column cut to the clicked
row's `key` value. So the dialog is the same report, seen for one row. A
table, grouped table or kpis takes its drills in its `drills` prop; a tile
opens one by its `name`.

## Example

`regions.sql` and `regionMonths.sql`:

```sql
-- Sales per region
select 'North' as region, 120 as sales
union all select 'South', 95
```

```sql
-- Sales per region and month
select 'North' as region, '2026-01' as month, 60 as sales
union all select 'North', '2026-02', 60
union all select 'South', '2026-01', 40
union all select 'South', '2026-02', 55
```

In `report.tsx`:

```tsx
import regions from "./regions.sql?raw"
import regionMonths from "./regionMonths.sql?raw"

// in defineReport({ … })
queries: {
  regions: query<{ region: string; sales: number }>(regions),
  regionMonths: query<{ region: string; month: string; sales: number }>(regionMonths),
},
components: (k) => [
  <k.Table
    key="regions"
    series="regions"
    title="Regions"
    columns={[{ key: "region", label: "Region", format: "text" }, { key: "sales", label: "Sales" }]}
    drills={[
      {
        name: "byRegion",
        key: "region",
        components: (
          <k.Line series="regionMonths" x="month" xFormat="month" y={{ sales: "Sales" }} title="Sales per month" />
        ),
      },
    ]}
  />,
],
```

A click on "North" opens a dialog titled "North" with a line of North's
months only.

## Props of a drill

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `components` | components | yes | | The components the dialog draws |
| `name` | text | for a tile | | The name a tile's `drill` uses |
| `key` | column | yes for a row drill | | The clicked row's column whose value cuts the data |
| `match` | column | no | `key` | The column the other results are cut on, when it is named differently |
| `label` | column | no | `key` | The clicked row's column printed as the dialog's title |
| `title` | text | no | the tile's label | The dialog's title when no row names it |
| `description` | text | no | | A line under the dialog's title |

## Checks

A component inside a drill naming a series or column the queries do not return
fails the typecheck. A tile's `drill` that names no drill in `drills` opens
nothing.
