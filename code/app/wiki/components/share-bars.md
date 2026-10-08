---
title: ShareBars
description: A list of labelled bars, each filled to a share out of 100.
order: 23
---

`<k.ShareBars>` draws one thin bar per row, filled to its value out of 100,
with the label above it and an optional text on the right. Use it for a
short list of shares or completion rates that read best as a list rather
than a chart.

## Example

`channels.sql`:

```sql
-- Share of orders per channel
select 'Web' as channel, 54.0 as share, '27 of 50' as detail
union all select 'Store', 30.0, '15 of 50'
union all select 'Phone', 16.0, '8 of 50'
```

In `report.tsx`:

```tsx
import channels from "./channels.sql?raw"

type Row = { channel: string; share: number; detail: string }

// in defineReport({ … })
queries: { channels: query<Row>(channels) },
components: (k) => [
  <k.ShareBars
    key="channels"
    series="channels"
    label="channel"
    value="share"
    line="detail"
    title="Orders by channel"
    info={{ what: "Each channel's share of orders.", sql: ["channels"] }}
  />,
],
```

## Props

Also `key`, `description`, `span` (default 1) and `info`: see
[Props every component takes](/wiki/components/common).

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `series` | query name | yes | | The query the rows come from |
| `label` | column | yes | | Each bar's label |
| `value` | column | yes | | The filled part, 0 to 100 |
| `title` | text | yes | | The heading |
| `line` | column | no | | A text printed right of the label |

## Checks

A `series` that is not one of the report's queries, or a column it names
that the query's rows do not have, fails the typecheck, as does a missing
required prop or a value of the wrong type.
