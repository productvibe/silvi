---
title: slider
description: A number picked on a slider inside an Inputs card, its default and "Today" value read from the data.
order: 43
---

`<InputSlider>` sets a number between `min` and `max` by `step`, or along a
ladder of values (`steps`). It sits inside a [`<k.Inputs>`](/wiki/components/inputs)
card, and its `param` is declared in `page.filterParams` with
`input: "slider"`. Its value is `?<param>=` in the URL, written when the
reader lets go. Use it for an assumption in a model: a price, a rate, a
growth.

## Example

`today.sql`:

```sql
-- Today's conversion rate
select 3.2 as conversion
```

In `report.tsx`:

```tsx
import { InputSlider } from "~/components/report-kit/inputs-card"

import today from "./today.sql?raw"

type Today = { conversion: number }
const now = (d: unknown) => (d as { today: Today[] }).today[0]?.conversion

// in defineReport({ … })
page: {
  filterParams: [
    {
      param: "conversion",
      label: "Conversion",
      input: "slider",
      options: () => [],
      accept: (v) => Number(v) >= 1 && Number(v) <= 6,
    },
  ],
},
queries: { today: query<Today>(today) },
components: (k) => [
  <k.Inputs key="assumptions">
    <InputSlider param="conversion" label="Conversion" min={1} max={6} step={0.1} default={now} today={now} format="decimal" suffix=" %" />
  </k.Inputs>,
],
```

## Props

[number](/wiki/components/number) takes the same props.

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `param` | a lowercase name | yes | | The URL key, as declared in `filterParams` |
| `label` | text | yes | | The field's label |
| `min` | number | no | | The lowest value |
| `max` | number | no | | The highest value |
| `step` | number | no | | The step between values |
| `default` | number, or a function of the data | no | `min` | The value while the URL names none; a function reads the measured value from the data |
| `today` | number, text, or a function of the data | no | | Printed under the control as "Today <value>"; a text prints as it is |
| `steps` | list of numbers, or a function of the data | no | | A ladder of values instead of `min` to `max`; a function may return `{ value, label }` rows |
| `format` | [format](/wiki/components/common) | no | `number` | How the value prints |
| `decimals` | number | no | | Decimals, for formats that take them |
| `prefix` | text | no | | Printed before the value |
| `suffix` | text | no | | Printed after the value |

The `filterParams` entry's `accept` says which URL values are kept: a value
it refuses falls back to the default.

## Checks

A slider without `param` or `label` fails the typecheck. A `param` not
declared in `filterParams` is not kept when the page reloads.
