---
title: Inputs
description: Values the reader sets, kept in the URL; a card of sliders and numbers on the page for a model's assumptions.
order: 40
---

A report's inputs are values the reader sets, kept in the page's address
(`?<param>=<value>`), so a copied link opens on the same view. Each is an
entry of the report's `page.filterParams`; its `input` says where it shows:

| `input` | Where it shows | Page |
|---|---|---|
| `"select"`, `"multi"` | The View menu | [select](/wiki/components/select) |
| none | The filter bar's menu | [select](/wiki/components/select) |
| `"toggle"` | The View menu | [toggle](/wiki/components/toggle) |
| `"slider"` | A `<InputSlider>` in a `<k.Inputs>` card on the page | [slider](/wiki/components/slider) |
| `"number"` | A `<InputNumber>` in a `<k.Inputs>` card on the page | [number](/wiki/components/number) |
| `"tabs"` | A [Tabs](/wiki/components/tabs) with `param` | [Tabs](/wiki/components/tabs) |

**What an input changes.** Its value is read in two places:

- a component wrapped in `<When when={{ input: "<param>", is: "<value>" }}>`
  shows or hides with it ([Props every component takes](/wiki/components/common));
- a query may name it as `$<param>`; the query then runs once per value,
  and each value's rows are kept apart. An input the SQL reads needs a
  value: give it a `default`.

`<k.Inputs>` is the card that holds sliders and numbers: one card, under the
tiles, each field with its label, its value, the control and an optional
"Today" line. The address changes when the reader lets go of a slider.

## An entry of `filterParams`

| Key | Type | Required | Meaning |
|---|---|---|---|
| `param` | a lowercase name | yes | The URL key; not `from`, `to` or `page` |
| `label` | text | yes | The input's label |
| `options` | `(filters) => [{ value, label, short }]` | yes | The choices for the range in force; `[]` for a slider or number |
| `default` | `(values, filters) => value` | no | The value when the URL names none or one not offered (else the first option) |
| `input` | `"select"`, `"multi"`, `"toggle"`, `"slider"`, `"number"` or `"tabs"` | no | Where it shows; without it, in the filter bar |
| `summary` | `"always"` or `"unlessDefault"` | no | In the filter bar: name it on the button always, or only off its default |
| `accept` | `(value) => true or false` | no | A value outside `options` it still takes, such as a slider's number |
| `meta` | `{ optionsFrom, defaultFrom }` | no | A select's options or default read from the data: a dot path such as `"months"` or `"today.0.month"` |

## Example

`today.sql`:

```sql
-- Today's price and volume
select 249 as price, 1200 as volume
```

In `report.tsx`:

```tsx
import { InputNumber, InputSlider } from "~/components/report-kit/inputs-card"

import today from "./today.sql?raw"

type Today = { price: number; volume: number }

// in defineReport({ … })
page: {
  filterParams: [
    { param: "price", label: "Price", input: "slider", options: () => [], accept: (v) => Number(v) >= 199 && Number(v) <= 299 },
    { param: "volume", label: "Volume", input: "number", options: () => [], accept: (v) => Number(v) >= 0 },
  ],
},
queries: { today: query<Today>(today) },
components: (k) => [
  <k.Inputs key="assumptions">
    <InputSlider param="price" label="Price" min={199} max={299} step={10} default={(d) => (d as { today: Today[] }).today[0]?.price} today={(d) => (d as { today: Today[] }).today[0]?.price} suffix=" kr" />
    <InputNumber param="volume" label="Volume" min={0} default={(d) => (d as { today: Today[] }).today[0]?.volume} />
  </k.Inputs>,
],
```

## Props of Inputs

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `key` | text | yes | | A name unique on the page |
| `span` | `1` or `2` | no | 2 | The card's width |
| `children` | `<InputSlider>` and `<InputNumber>` fields | yes | | Up to four across |

## Checks

A `filterParams` entry without `param`, `label` or `options`, or an `input`
that is not one of the kinds, fails the typecheck.
