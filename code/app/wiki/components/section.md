---
title: Section
description: A heading over a group of components, laid out like the page or three across.
order: 30
---

`<k.Section>` puts a heading, a description and an "(i)" over the components
inside it. Inside, components are laid out as on the page: two half-row components
side by side, a whole-row component on its own. With `columns={3}`, half-row
components sit three across when each gets about 380 pixels, else two; leave out
the title for a bare row of three.

## Example

`regions.sql`:

```sql
-- Sales and orders per region
select 'North' as region, 120 as sales, 14 as orders
union all select 'South', 95, 9
union all select 'East', 180, 16
```

In `report.tsx`:

```tsx
import regions from "./regions.sql?raw"

type Row = { region: string; sales: number; orders: number }

// in defineReport({ … })
queries: { regions: query<Row>(regions) },
components: (k) => [
  <k.Section
    key="regions"
    title="Regions"
    description="How the regions compare."
    info={{ what: "Sales and orders per region.", sql: ["regions"] }}
  >
    <k.CategoryBars key="sales" series="regions" x="region" value="sales" title="Sales" />
    <k.CategoryBars key="orders" series="regions" x="region" value="orders" title="Orders" />
  </k.Section>,
],
```

## Props

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `key` | text | yes | | A name unique on the page |
| `title` | text, or a function of the data | no | | The heading; without it, no heading row |
| `description` | text, or a function of the data | no | | A muted line under the heading |
| `info` | `{ what, rules, sql }` | no | | The section's "(i)" |
| `columns` | `2` or `3` | no | 2 | Half-row components two or three across |
| `children` | components | yes | | The components inside |

A section holds only components. It always takes the whole row.

## Checks

A prop the section does not take, or a `columns` other than 2 or 3, fails
the typecheck.
