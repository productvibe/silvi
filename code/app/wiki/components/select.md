---
title: select
description: A choice from a list, in the View menu or the filter bar, with fixed options or options from the data.
order: 41
---

A select lets the reader pick one value (or several, with `input: "multi"`)
from a list. It is an entry of the report's `page.filterParams`. With
`input: "select"` it sits in the page's View menu, a button on the filter
line named by `page.inputsLabel`. Without `input` it sits in the filter
bar instead, for a choice that narrows the rows, such as a product. Its
value is `?<param>=` in the URL; see [Inputs](/wiki/components/inputs) for
what it can change.

## Example

`byRegion.sql`:

```sql
-- Sales per region and month
select 'North' as region, '2026-01' as month, 60 as sales
union all select 'North', '2026-02', 64
union all select 'South', '2026-01', 40
union all select 'South', '2026-02', 55
```

In `report.tsx`:

```tsx
import { When } from "~/components/report-kit/component-wrap"

import byRegion from "./byRegion.sql?raw"

// in defineReport({ … })
page: {
  filterParams: [
    {
      param: "view",
      label: "Show as",
      input: "select",
      options: () => [
        { value: "chart", label: "Chart" },
        { value: "table", label: "Table" },
      ],
    },
  ],
},
queries: { byRegion: query<{ region: string; month: string; sales: number }>(byRegion) },
components: (k) => [
  <When key="chart" when={{ input: "view", is: "chart" }}>
    <k.Line series="byRegion" x="month" xFormat="month" y={{ sales: "Sales" }} split="region" title="Sales" />
  </When>,
  <When key="table" when={{ input: "view", is: "table" }}>
    <k.Table
      series="byRegion"
      title="Sales"
      columns={[
        { key: "region", label: "Region", format: "text" },
        { key: "month", label: "Month", format: "month" },
        { key: "sales", label: "Sales" },
      ]}
    />
  </When>,
],
```

## Keys

The keys of a `filterParams` entry are on [Inputs](/wiki/components/inputs).
For a select:

| Key | Meaning |
|---|---|
| `param`, `label` | Required: the URL key and the label |
| `options` | The choices, `(filters) => [{ value, label, short }]`; `short` is a shorter word for the button's summary. A function of the filters, so it can list the months of the range |
| `default` | `(values, filters) => value`: the value when the URL names none (else the first option; with `"multi"`, a list joined by commas) |
| `input` | `"select"` for the View menu, `"multi"` for several values at once (`?<param>=a,b`), none for the filter bar |
| `summary` | In the filter bar: `"always"` or `"unlessDefault"` |
| `meta.optionsFrom` | The options read from the data: a dot path to rows of `{ value, label }` |

## Checks

An entry without `param`, `label` or `options` fails the typecheck. A URL
value not among the options falls back to the default.
