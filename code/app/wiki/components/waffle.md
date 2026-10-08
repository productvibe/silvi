---
title: Waffle
description: Stages as 100 squares, the largest stage the whole, each square shaded by the deepest stage its 1 % reaches.
order: 16
---

`<k.Waffle>` draws 100 squares. The largest stage is all 100; each square
is shaded by the deepest stage its 1 % reaches, so the darker squares are
the share that got furthest. A legend lists each stage's share. Use it for
a funnel read as percentages. For the counts themselves, use
[Funnel](/wiki/components/funnel).

## Example

`stages.sql`:

```sql
-- Applicants at each stage
select 'Applied' as stage, 800 as people, 0 as online
union all select 'Interviewed', 320, 0
union all select 'Offered', 96, 1
union all select 'Hired', 64, 1
```

In `report.tsx`:

```tsx
import stages from "./stages.sql?raw"

type Row = { stage: string; people: number; online: number }

// in defineReport({ … })
queries: { stages: query<Row>(stages) },
components: (k) => [
  <k.Waffle
    key="hiring"
    series="stages"
    label="stage"
    value="people"
    ring="online"
    title="From application to hire"
    info={{ what: "Each square is 1 % of applicants.", sql: ["stages"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 1) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from, one row per stage |
| `label` | column | yes | | The stage's name |
| `value` | column | yes | | The stage's count; the largest is the 100 squares |
| `title` | text | yes | | The heading |
| `ring` | column | no | | A yes/no column (`1` or `0`): that stage's squares are ringed, a second kind of stage |
| `columns` | number | no | 10 | Squares per row |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
