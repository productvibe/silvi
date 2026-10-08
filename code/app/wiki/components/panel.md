---
title: Panel
description: A further tab in the report's "(i)" dialog, after Info and Technical, for reading that is not rules or SQL.
order: 51
---

`<Panel>` adds a tab to the [dialog](/wiki/components/dialog) after Info and
Technical, with its own label. Inside, write as on the other tabs: `<H2>`
headings space it into sections. Use it for reading that is neither a rule
nor SQL, such as worked examples. A table in it can be a
`<DefTable>` from `~/components/report-kit/info`.

## Example

```tsx
import { DefTable, H2, Info, P, Panel } from "~/components/report-kit/info"

// in defineReport({ … })
page: {
  info: () => (
    <>
      <Info>
        <P>Sales per region, including tax.</P>
      </Info>
      <Panel label="Examples">
        <H2>An order in two regions</H2>
        <DefTable
          term="Region"
          definition="Amount of order A-1001"
          rows={[
            { name: "North", def: "60" },
            { name: "South", def: "40" },
          ]}
        />
        <P>An order shipped to two regions counts in both.</P>
      </Panel>
    </>
  ),
},
```

## Props

| Name | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `label` | text | yes | | The tab's name |
| `children` | content | no | | The tab's content |

## Checks

A panel without `label` fails the typecheck. A panel outside `page.info`
is not drawn.
