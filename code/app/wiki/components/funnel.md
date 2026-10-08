---
title: Funnel
description: Stages that narrow, drawn as nested areas proportional to each stage's count.
order: 15
---

`<k.Funnel>` draws one rectangle per row, each stage's area in proportion
to its count, nested from the largest at the back to the smallest at the
front, with a legend of the exact counts. Use it for a sequence of stages
where each is a subset of the one before: visits, carts, orders.

## Example

`stages.sql`:

```sql
-- Visitors at each stage
select 'Visited' as stage, 12000 as visitors
union all select 'Added to cart', 3100
union all select 'Checked out', 1450
union all select 'Paid', 1210
```

In `report.tsx`:

```tsx
import stages from "./stages.sql?raw"

type Row = { stage: string; visitors: number }

// in defineReport({ … })
queries: { stages: query<Row>(stages) },
components: (k) => [
  <k.Funnel
    key="funnel"
    series="stages"
    label="stage"
    value="visitors"
    title="From visit to payment"
    info={{ what: "How many visitors reach each stage.", sql: ["stages"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 1) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from, one row per stage in order |
| `label` | column | yes | | The stage's name |
| `value` | column | yes | | The stage's count |
| `title` | text | yes | | The heading |

For the same stages as squares out of 100, use
[Waffle](/wiki/components/waffle).

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
