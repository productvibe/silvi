---
title: number
description: A typed number inside an Inputs card, with the same props as a slider.
order: 44
---

`<InputNumber>` is a field where the reader types a number. It sits inside a
[`<k.Inputs>`](/wiki/components/inputs) card, its `param` declared in
`page.filterParams` with `input: "number"`, and takes the same props as
[slider](/wiki/components/slider). Use it for a value with no natural
range, such as a budget.

## Example

`today.sql`:

```sql
-- This year's budget
select 1000000 as budget
```

In `report.tsx`:

```tsx
import { InputNumber } from "~/components/report-kit/inputs-card"

import today from "./today.sql?raw"

type Today = { budget: number }
const now = (d: unknown) => (d as { today: Today[] }).today[0]?.budget

// in defineReport({ … })
page: {
  filterParams: [
    { param: "budget", label: "Budget", input: "number", options: () => [], accept: (v) => Number(v) >= 0 },
  ],
},
queries: { today: query<Today>(today) },
components: (k) => [
  <k.Inputs key="assumptions">
    <InputNumber param="budget" label="Budget" min={0} step={50000} default={now} today={now} suffix=" kr" />
  </k.Inputs>,
],
```

## Props

As [slider](/wiki/components/slider): `param` and `label` are required;
`min`, `max`, `step`, `default`, `today`, `steps`, `format`, `decimals`,
`prefix` and `suffix` are optional.

## Checks

A number without `param` or `label` fails the typecheck. A `param` not
declared in `filterParams` is not kept when the page reloads.
