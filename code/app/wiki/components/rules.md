---
title: Rules, Rule and Lead
description: The definitions a report follows, written once in the dialog and picked by id into each component's "(i)".
order: 52
---

`<Rules>` is a group of `<Rule>`s inside the [dialog](/wiki/components/dialog).
Each rule has an id, a title and a body. A component's `info={{ rules: [...] }}`
picks rules by id into its own "(i)", so a definition is written once and
the page and the chart cannot disagree.

A group draws as bullets, as a definition list (`as="defs"`), or as a table
(`as="table"`). A table group is for the source tables: a component's "(i)"
lists the tables its SQL reads from it, by matching each rule's title to a
table name in the query.

A rule's `lead` is a first line after its title; it may hold more than text,
such as a [Value](/wiki/components/value).

## Example

`regions.sql`:

```sql
-- Sales per region
select region, sum(amount) as sales
from (select 'North' as region, 120 as amount union all select 'South', 95) as orders
group by region
```

In `report.tsx`:

```tsx
import { H2, Info, Rule, Rules } from "~/components/report-kit/info"

import regions from "./regions.sql?raw"

// in defineReport({ … })
page: {
  info: () => (
    <Info>
      <H2>The measures</H2>
      <Rules>
        <Rule id="sales" title="Sales">the order amount including tax.</Rule>
        <Rule id="region" title="Region" lead="Where the order shipped to.">
          An order with no address counts as North.
        </Rule>
      </Rules>
      <H2>Where the data comes from</H2>
      <Rules as="table">
        <Rule id="t-orders" title="orders">One row per order: its amount and region.</Rule>
      </Rules>
    </Info>
  ),
},
queries: { regions: query<{ region: string; sales: number }>(regions) },
components: (k) => [
  <k.CategoryBars
    key="regions"
    series="regions"
    x="region"
    value="sales"
    title="Sales by region"
    info={{ what: "Sales per region.", rules: ["sales", "region"], sql: ["regions"] }}
  />,
],
```

## Props of Rules

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `as` | `"list"`, `"defs"` or `"table"` | no | `"list"` | Bullets, a definition list, or a table |
| `term` | text | no | "Table" | With `as="table"`: the first column's header |
| `definition` | text | no | "What it contributes" | With `as="table"`: the second column's header |

## Props of Rule

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `id` | text | yes | | The id a component's `info={{ rules: [...] }}` names |
| `title` | text | yes | | The rule's bold title; in a table group, the table's name |
| `lead` | text or content | no | | A first line after the title, such as `lead={<><Value of="excluded.0.orders" /> orders were tests.</>}` |
| `children` | content | no | | The rule's body |

A rule sits directly inside a `<Rules>`; anywhere else it is not drawn.

## Checks

A rule without `id` or `title`, or an `as` not one of its values, fails the
typecheck.
