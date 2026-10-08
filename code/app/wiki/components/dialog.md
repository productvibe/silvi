---
title: Info and Technical
description: The report's "(i)" in the header, with an Info tab for the reader and a Technical tab for the SQL.
order: 50
---

The report's "(i)", the button in the page's header, is `page.info`: a
function that returns its content. Every explanation of a report lives
here, never on the page. It has two tabs:

- `<Info>`: what the figures mean, for the reader: the measures, the rules,
  where the data comes from;
- `<Technical>`: how they are made: the SQL, with [Sql](/wiki/components/sql).

Inside both, write `<H2>` headings, `<P>` paragraphs, lists and the
[rules](/wiki/components/rules). Content outside both goes on the Info tab.
A [Panel](/wiki/components/panel) adds a further tab. A component's own "(i)"
(`info={{ what, rules, sql }}`) picks [rules](/wiki/components/rules) from
this dialog by id, so a rule is written once. All of them are imported from
`~/components/report-kit/info`.

The dialog ends with a "Data as of" line: when the report's rows were read.

## Example

`regions.sql`:

```sql
-- Sales per region
select 'North' as region, 120 as sales
union all select 'South', 95
```

In `report.tsx`:

```tsx
import { H2, Info, P, Rule, Rules, Sql, Technical } from "~/components/report-kit/info"

import regions from "./regions.sql?raw"

// in defineReport({ … })
page: {
  info: () => (
    <>
      <Info>
        <H2>The measures</H2>
        <Rules>
          <Rule id="sales" title="Sales">
            the order amount including tax, by the day the order was paid.
          </Rule>
        </Rules>
        <H2>Who to ask</H2>
        <P>The sales team owns these figures.</P>
      </Info>
      <Technical>
        <H2>The SQL</H2>
        <Sql query="regions" />
      </Technical>
    </>
  ),
},
queries: { regions: query<{ region: string; sales: number }>(regions) },
components: (k) => [
  <k.CategoryBars
    key="regions"
    series="regions"
    x="region"
    value="sales"
    title="Sales by region"
    info={{ what: "Sales per region.", rules: ["sales"], sql: ["regions"] }}
  />,
],
```

## Options

| Name | Where | Type | Default | Meaning |
|---|---|---|---|---|
| `info` | `page` | `() => content` | | The dialog's content |
| `asOfIn` | `page` | `"header"` or `"info"` | `"header"` | Where the "Data as of" line goes: under the description, or at the foot of the Info tab |

`<Info>` and `<Technical>` take only their content. `<H2>` starts a
section; `<P>` is a paragraph on the dialog's scale.

## Checks

A rule id in a component's `info` that no `<Rule>` holds is left out of its
"(i)". An explanation belongs in the dialog, not between components.
