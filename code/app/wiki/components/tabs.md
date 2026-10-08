---
title: Tabs
description: Groups of components shown one at a time under tabs, optionally kept in the URL as an input.
order: 31
---

`<k.Tabs>` holds a list of tabs, each a group of components; the reader sees one
tab at a time. The first tab is open. Use it to split the same results by
grain or by view: a table by month in one tab, by week in another. With
`param`, the open tab is kept in the URL (`?grain=month`) and acts as an
[input](/wiki/components/inputs) that `When` and the SQL can read; declare
it in `page.filterParams` with `input: "tabs"`.

## Example

`monthly.sql` and `weekly.sql`:

```sql
-- Sales per month
select '2026-01' as month, 410 as sales
union all select '2026-02', 455
```

```sql
-- Sales per week
select '2026-W05' as week, 98 as sales
union all select '2026-W06', 104
```

In `report.tsx`:

```tsx
import monthly from "./monthly.sql?raw"
import weekly from "./weekly.sql?raw"

// in defineReport({ … })
page: {
  filterParams: [
    {
      param: "grain",
      label: "Grain",
      input: "tabs",
      options: () => [
        { value: "month", label: "By month" },
        { value: "week", label: "By week" },
      ],
    },
  ],
},
queries: {
  monthly: query<{ month: string; sales: number }>(monthly),
  weekly: query<{ week: string; sales: number }>(weekly),
},
components: (k) => [
  <k.Tabs
    key="sales"
    title="Sales"
    param="grain"
    tabs={[
      {
        label: "By month",
        value: "month",
        components: (
          <k.Table
            series="monthly"
            columns={[{ key: "month", label: "Month", format: "month" }, { key: "sales", label: "Sales" }]}
          />
        ),
      },
      {
        label: "By week",
        value: "week",
        components: (
          <k.Table
            series="weekly"
            columns={[{ key: "week", label: "Week", format: "text" }, { key: "sales", label: "Sales" }]}
          />
        ),
      },
    ]}
  />,
],
```

## Props

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `key` | text | yes | | A name unique on the page |
| `tabs` | list of tabs | yes | | The tabs, in order; the first is open |
| `title` | text, or a function of the data | no | | A heading over the tabs |
| `description` | text, or a function of the data | no | | A muted line under the heading |
| `info` | `{ what, rules, sql }` | no | | The "(i)" |
| `param` | a lowercase name | no | | Keeps the open tab in the URL as `?<param>=<value>`; not `from`, `to` or `page` |

### A tab

| Key | Type | Required | Meaning |
|---|---|---|---|
| `label` | text | yes | The tab's name |
| `value` | letters, digits, `-`, `_` | with `param` | The tab's value in the URL |
| `components` | components | yes | The components in the tab |

A table inside a tab may leave out its title.

## Checks

A tab without `label` or `components`, or a component inside it naming a series or
column the queries do not return, fails the typecheck.
