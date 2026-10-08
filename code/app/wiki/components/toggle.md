---
title: toggle
description: An on/off switch in the View menu, kept in the URL as on or off.
order: 42
---

A toggle is a switch in the page's View menu: a `page.filterParams` entry
with `input: "toggle"`. Its value is `on` or `off`, kept as `?<param>=` in
the URL. Use it to show or hide something, such as a detail table, with
`<When>`. See [Inputs](/wiki/components/inputs) for what else it can change.

## Example

`orders.sql`:

```sql
-- The latest orders
select 'A-1001' as order_no, 'North' as region, 120 as amount
union all select 'A-1002', 'South', 95
```

In `report.tsx`:

```tsx
import { When } from "~/components/report-kit/component-wrap"

import orders from "./orders.sql?raw"

// in defineReport({ … })
page: {
  filterParams: [
    {
      param: "details",
      label: "Show orders",
      input: "toggle",
      options: () => [
        { value: "off", label: "Off" },
        { value: "on", label: "On", short: "Orders" },
      ],
    },
  ],
},
queries: { orders: query<{ order_no: string; region: string; amount: number }>(orders) },
components: (k) => [
  <When key="orders" when={{ input: "details", is: "on" }}>
    <k.Table
      series="orders"
      title="Latest orders"
      columns={[
        { key: "order_no", label: "Order", format: "text" },
        { key: "region", label: "Region", format: "text" },
        { key: "amount", label: "Amount" },
      ]}
    />
  </When>,
],
```

## Keys

| Key | Meaning |
|---|---|
| `param`, `label` | Required: the URL key and the switch's label |
| `input` | `"toggle"` |
| `options` | Always `off` then `on`; the `on` option's `short` is the View button's summary while it is on |
| `default` | `() => "on"` to start on; off by default (the first option) |

## Checks

An entry without `param`, `label` or `options` fails the typecheck.
