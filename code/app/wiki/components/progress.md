---
title: Progress
description: A figure against its target as a bar, with a projection behind it and up to three figures under it.
order: 17
---

`<k.Progress>` reads the first row of a result and draws a bar: the figure
so far, a paler projection behind it, and the full width as the target,
with "0" and the target printed under its ends. Up to three figures can
follow under the bar. Use it for a budget or a goal for the year.

## Example

`year.sql`:

```sql
-- Sales so far this year, the projection and the target
select 640 as sales, 910 as projected, 1000 as target,
       'Jan to Aug' as period, 64.0 as reached
```

In `report.tsx`:

```tsx
import year from "./year.sql?raw"

type Row = { sales: number; projected: number; target: number; period: string; reached: number }

// in defineReport({ … })
queries: { year: query<Row>(year) },
components: (k) => [
  <k.Progress
    key="goal"
    series="year"
    value="sales"
    projection="projected"
    target="target"
    targetLabel="Goal"
    suffix=" k"
    cells={[
      { label: "So far", value: "sales", line: "period", swatch: "value" },
      { label: "Projected", value: "projected", swatch: "projection" },
      { label: "Reached", value: "reached", format: "percent" },
    ]}
    title="Sales against the yearly goal"
    info={{ what: "Sales so far and projected, against the goal.", sql: ["year"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 2) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query; only its first row is read |
| `value` | column | yes | | The figure so far: the filled part |
| `target` | column | yes | | The full width: the budget or target |
| `title` | text | yes | | The heading |
| `projection` | column | no | | Where the figure is heading: a paler part behind it |
| `targetLabel` | text | no | "Target" | The word before the target under the bar's right end |
| `format` | [format](/wiki/components/common) | no | `number` | How the figures print |
| `prefix` | text | no | | Printed before each figure |
| `suffix` | text | no | | Printed after each figure |
| `decimals` | number | no | 1 | Decimals, for formats that take them |
| `cells` | list of `{label, value, line, swatch, format, prefix, suffix, decimals}` | no | | Figures under the bar, up to three across. `label` and `value` (a column) are required; `line` is a column printed under it; `swatch` is `value` or `projection`, a colour key. A text column prints as it is |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
