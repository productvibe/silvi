---
title: Custom
description: A visual the kit does not have, drawn by a component written in the report's own report.tsx.
order: 45
---

`<k.Custom>` draws a component you write yourself, in the report's
`report.tsx`, with the report's data. Use it for a visual only this report
needs and no component can draw, such as two dots per region for last year and
this year.

Reach for it last. First ask whether a component's props can do it: most
requests are a [Line](/wiki/components/line), a
[Table](/wiki/components/table) or [Kpis](/wiki/components/kpis) with the
right props. Do not use it:

- **for a chart a component already draws.** A component brings the "(i)", the
  loading state, the empty state, the number formats and the theme; your
  component brings only what you write.
- **for text.** Explanations go in the report's
  ["(i)" dialog](/wiki/components/dialog), never on the page.
- **to reshape rows.** Do that in the SQL, or with `reconstruct` (see
  [The report file](/wiki/components/report-file)), and give a component the
  result.
- **for a visual many reports need.** Ask Claude for a new component in the kit
  instead, so every report can use it and it gets a page here.

The component lives in `report.tsx` itself: a report folder holds only its
`report.tsx` and `.sql` files, so it cannot be a file of its own.

## Example

`regions.sql`:

```sql
-- Sales per region, last year and this year
select 'North' as region, 104 as last_year, 120 as this_year
union all select 'South', 112, 95
union all select 'East', 150, 180
union all select 'West', 131, 140
```

In `report.tsx`:

```tsx
import { fmt } from "~/components/report-kit/format"
import { SectionHeader } from "~/components/report-kit/visual-info"

import regions from "./regions.sql?raw"

type Region = { region: string; last_year: number; this_year: number }

/** Last year to this year per region, as two dots on one line. */
function YearOnYear({ data }: { data: { regions: Region[] } }) {
  const max = Math.max(1, ...data.regions.flatMap((r) => [r.last_year, r.this_year]))
  const at = (v: number) => `${(v / max) * 100}%`
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Sales, last year to this year" />
      <div className="flex flex-col gap-3 pt-1">
        {data.regions.map((r) => (
          <div key={r.region} className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{r.region}</span>
              <span className="text-muted-foreground tabular-nums">
                {fmt(r.last_year)} → {fmt(r.this_year)}
              </span>
            </div>
            <div className="relative h-3 rounded bg-muted">
              <span
                className="absolute top-1/2 size-2 -translate-1/2 rounded-full bg-muted-foreground"
                style={{ left: at(r.last_year) }}
              />
              <span
                className="absolute top-1/2 size-3 -translate-1/2 rounded-full bg-primary"
                style={{ left: at(r.this_year) }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// in defineReport({ … })
queries: { regions: query<Region>(regions) },
components: (k) => [
  <k.Custom key="year-on-year" component={YearOnYear} span={1} />,
],
```

The component receives `data`, every query's rows by its name, and
`filters`, the dates and inputs in force (`from`, `to`, `params`). Draw it
with the theme's colours (`bg-primary`, `text-muted-foreground`) and the
kit's `fmt` for numbers, so it matches the components around it.

## Props

Only `key` and `span` of [Props every component takes](/wiki/components/common):
`title`, `description`, `info` and `metric` are the component's to draw.

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `component` | a component of `{ data, filters }` | yes | | What to draw. `data` holds each query's rows by its name; `filters` the dates and inputs in force |
| `span` | `1` or `2` | no | 2 | `1` takes half the row, `2` the whole row |
| `skeleton` | a React element | no | a chart-sized grey box | What shows while the data loads |

## Checks

A component whose `data` names a query the report does not have, or a column
its rows do not have, fails the typecheck. What the component draws is not
checked: open the report after each change.
