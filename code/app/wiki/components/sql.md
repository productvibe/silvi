---
title: Sql
description: Shows one of the report's queries, as the database runs it, in the dialog.
order: 53
---

`<Sql>` shows a query of the report by name, with its title from the
query's first `--` line. Use it on the Technical tab of the
[dialog](/wiki/components/dialog), so a reader can see exactly what runs. A
component's own "(i)" shows its SQL from `info={{ sql: [...] }}` instead.

## Example

```tsx
import { H2, Sql, Technical } from "~/components/report-kit/info"

import regions from "./regions.sql?raw"

// in defineReport({ … })
page: {
  info: () => (
    <Technical>
      <H2>The SQL</H2>
      <Sql query="regions" title="Sales per region, from sample rows" />
    </Technical>
  ),
},
queries: { regions: query<{ region: string; sales: number }>(regions) },
```

## Props

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `query` | query name | yes | | The query to show, by its name in `queries` (or a `.sql` file of the report's folder, without `.sql`) |
| `title` | text | no | the query's first `--` line | The title over the SQL |

## Checks

A `query` that names no query shows "no query" in its place.
