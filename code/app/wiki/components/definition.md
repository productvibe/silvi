---
title: Definition
description: A named metric's one-line definition, quoted in the dialog from app/src/metrics/metrics.ts.
order: 55
---

`<Definition>` prints the one-line definition of a
[named metric](/wiki/advanced/metrics), from `app/src/metrics/metrics.ts`.
Use it in the [dialog](/wiki/components/dialog) so the report quotes the
definition the metric holds, instead of restating it. The app starts with no
metrics; add one before using this. Every metric is also written out on the
wiki's [Metrics](/wiki/reference/metrics) page.

## Example

With a metric `averageOrder` in `metrics.ts`:

```tsx
import { Definition, H2, Info } from "~/components/report-kit/info"

// in defineReport({ … })
page: {
  info: () => (
    <Info>
      <H2>The measure</H2>
      <Definition name="averageOrder" />
    </Info>
  ),
},
```

## Props

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `name` | metric name | yes | | A metric in `app/src/metrics/metrics.ts` |

## Checks

A `name` that is not a metric stops the dialog with an error naming it.
