---
title: DriverTree
description: Measures joined parent to child as cards on a canvas, each its figure against its target.
order: 18
---

`<k.DriverTree>` draws one card per row and joins each to its parent, so a
top measure sits above the measures that drive it. Each card shows its
figure, "/ target" after it (green when on track, muted when not), and an
optional line such as its formula. The canvas pans and zooms; nothing on
it is saved.

## Example

`drivers.sql`:

```sql
-- Revenue and what drives it
select 'revenue' as id, '' as parent, 'Revenue' as label, 1250000 as value, 1200000 as target, 'number' as format, 'Orders × average order' as line, 1 as accent
union all select 'orders', 'revenue', 'Orders', 5000, 5200, 'number', '', 0
union all select 'aov', 'revenue', 'Average order', 250, 231, 'number', '', 0
union all select 'visits', 'orders', 'Visits', 125000, 120000, 'number', '', 0
union all select 'conversion', 'orders', 'Conversion', 4.0, 4.3, 'percent', 'Orders ÷ visits', 0
```

In `report.tsx`:

```tsx
import drivers from "./drivers.sql?raw"

type Row = {
  id: string; parent: string; label: string; value: number; target: number
  format: string; line: string; accent: number
}

// in defineReport({ … })
queries: { drivers: query<Row>(drivers) },
components: (k) => [
  <k.DriverTree
    key="tree"
    series="drivers"
    title="What drives revenue"
    info={{ what: "Each card's figure against its target.", sql: ["drivers"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 2) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query, one row per card |
| `title` | text | no | | The heading |
| `node` | `{part: column}` | no | each part's own name | Which column holds each part of a card, when it is not named like the part: `node={{ label: "name" }}` |
| `format` | [format](/wiki/components/common) | no | `number` | The figures' format when a row names none |
| `height` | height class | no | `h-[36rem]` | The canvas' height |

The parts of a card, each a column named like the part unless `node`
renames it:

| Part | Meaning |
|---|---|
| `id` | The card's key, which a child's `parent` names |
| `parent` | The parent's `id`; empty on the top card |
| `label` | The card's name |
| `value` | The figure |
| `target` | The target: "/ target" after the figure |
| `format` | A format for this row's figures |
| `direction` | `up` (the default) or `down`: which way is on track |
| `line` | A muted line under the figure, such as its formula |
| `cells` | Several figures in place of one, two across: a list of `{label, value, format}` |
| `accent` | A yes/no column: the wider card with a darker edge, for the top |
| `x`, `y` | The card's place on the canvas; used only when every row has both, else the cards are laid out top-down |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
