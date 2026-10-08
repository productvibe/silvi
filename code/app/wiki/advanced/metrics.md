---
title: Metrics
description: Named measures with one definition, used by name in every report.
order: 1
---

When a measure appears in several reports, such as a conversion rate, give it
a name and one definition. Every report then uses it by name, and they
cannot disagree.

## A metric

The metrics are one file, `app/src/metrics/metrics.ts`: one entry each,
under its name in camelCase (`conversionRate`).

```ts
export const METRICS = {
  conversionRate: {
    name: "conversionRate",
    label: "Conversion rate",
    type: "ratio",
    numerator: "paying",
    denominator: "signups",
    format: "percent",
    scale: 100,
    decimals: 1,
    better: "higher",
    definition: "Sign-ups that became paying within 30 days, as a share of all sign-ups.",
  },
} as const satisfies Record<string, Metric>
```

| Key | Required | Means |
|---|---|---|
| `name` | yes | The name reports use, camelCase, the same as the entry's key |
| `label` | yes | The name people read |
| `type` | yes | `ratio`, `sum`, `count`, `mean` or `change` |
| `numerator`, `denominator` | for `ratio`, `mean`, `change` | The columns added up above and below the line (a `change` is numerator minus denominator, over denominator) |
| `column` | for `sum`, `count` | The column added up |
| `format` | yes | `number`, `percent`, `percent0`, `decimal` or `millions` |
| `scale` | no | Multiplies a ratio, such as 100 for percent |
| `decimals` | no | Rounds the value |
| `better` | yes | `higher` or `lower`: which way is good |
| `definition` | yes | One line saying what it is |

The SQL still returns the columns; the metric says how they combine. A
wrong key or value fails the typecheck.

## Using a metric

Ask Claude: "Use the conversion rate metric in the Sign-ups report." A component
names it with `metric="conversionRate"`, and so can a table column or a tile.
The label, the format and the definition in the "(i)" then come from the
file.

## Every metric is in the wiki

The [Metrics](/wiki/reference/metrics) page writes out every metric from
`metrics.ts`, with its formula and how it is shown. It follows the file by
itself: there is nothing to keep in step.
