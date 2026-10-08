---
title: Value
description: One figure from the report's own data, printed in the dialog in a format.
order: 54
---

`<Value>` prints one figure from the report's data inside the
[dialog](/wiki/components/dialog), such as the rate a page converted at or
the number of rows it excluded. `of` is a path into the results: the query's
name, the row number from 0, the column. It shows a placeholder while the
data loads and a dash if the query failed. Inside a
[Rule](/wiki/components/rules), put it in the `lead` or in the body.

## Example

`excluded.sql`:

```sql
-- Orders left out: test orders
select 3 as orders
```

In `report.tsx`:

```tsx
import { Info, Rule, Rules, Value } from "~/components/report-kit/info"

import excluded from "./excluded.sql?raw"

// in defineReport({ … })
page: {
  info: () => (
    <Info>
      <Rules>
        <Rule
          id="tests"
          title="Test orders"
          lead={<><Value of="excluded.0.orders" /> orders this period were tests.</>}
        >
          They are left out of every figure.
        </Rule>
      </Rules>
    </Info>
  ),
},
queries: { excluded: query<{ orders: number }>(excluded) },
components: (k) => [
  <k.Kpis key="tests" series="excluded" tiles={[{ label: "Test orders", value: "orders" }]} />,
],
```

## Props

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `of` | a dot path | yes | | The figure: `<query>.<row>.<column>`, such as `excluded.0.orders` |
| `format` | [format](/wiki/components/common) | no | `number` | How it prints |
| `prefix` | text | no | | Printed before it |
| `suffix` | text | no | | Printed after it |
| `decimals` | number | no | | Decimals, for formats that take them |

## Checks

A path that leads nowhere prints a dash.
