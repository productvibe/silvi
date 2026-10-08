# report-kit

Report pages as React code, run on the app's connectors (`src/connectors/`).
Cut on 7 October 2026 to what a generic starter needs: no markets, no .pptx
decks, no `/api/data` or MCP, no per-analyst sign-in, no chapter panel. Since 8 October 2026 a report is a
`report.tsx`, not a tag file: no report.json shaping, shared datasets,
partials or several-page reports.

## A report

```
app/src/reports/<id>/
  report.tsx          the page: meta, page options, queries, components, dialog
  <name>.sql          a query: first line `-- title`, named $variables
app/src/metrics/metrics.ts   the named metrics, used by name on components
```

```tsx
import { defineReport, query } from "~/components/report-kit/define"
import { H2, Info, Rule, Rules, Sql, Technical } from "~/components/report-kit/info"

import byWeek from "./by-week.sql?raw"

type Week = { week: string; sales: number }

export default defineReport({
  meta: { title: "Sales", description: "Sales by week", connector: "postgres" },
  page: {
    info: () => (
      <>
        <Info>
          <H2>The measures</H2>
          <Rules>
            <Rule id="sales" title="Sales:">every paid order, by the day it was paid.</Rule>
          </Rules>
        </Info>
        <Technical>
          <Sql query="byWeek" />
        </Technical>
      </>
    ),
  },
  queries: { byWeek: query<Week>(byWeek, { grain: "week" }) },
  components: (k) => [
    <k.Line key="sales" series="byWeek" x="week" xFormat="week" y={{ sales: "Sales" }}
      title="Sales" info={{ what: "…", rules: ["sales"], sql: ["byWeek"] }} />,
  ],
})
```

- **Serving.** The Reports module's screens (`src/blocks/reports/routes.ts`) mount the
  shared `route.tsx` at `/reports/<id>`; the loader (`load.server.ts`) finds
  the folder by `:report`, and `/reports` lists every `report.tsx` by its
  `meta` (`pages.ts`). Adding a folder adds a report, with no edit elsewhere.
- **The definition.** `defineReport` (`define.tsx`) only describes: it
  returns `{ meta, queries, page, Page }`, so `report.tsx` is client-safe.
  `load.server.ts` turns it into a `ReportSpec` (`lib/report.ts`); `Page`
  draws `KitPageView` (`define-page.tsx`) with the components.
- **Types.** The page's data `D` is one array of rows per query, by name,
  typed by `query<Row>`; `components` receives `k: Kit<D>` (`components.tsx`), so a
  series or a column the queries do not return fails `npm run typecheck`.
- **Connector.** Every query of a report runs on one connector: its
  `meta.connector`, else `SILVI_CONNECTOR` in `app/.env`, else the only one
  installed (`src/connectors/index.server.ts`). `lib/db.server.ts` is the
  kit's one way in (`queryRows`, read-only: SELECT or WITH). A report whose
  connector is not chosen or whose `.env` keys are unset shows "Not
  connected" with the keys to set, and runs nothing.
- **SQL.** Every query runs once inside the report's one fetch, over the
  wide window (24 months to today), cached ten minutes
  (`lib/query-cache.server.ts`) and sliced to the filter's range on its
  grain: `all` (default) as it is, `month` / `week` by its `month`
  (`YYYY-MM`) or `week` (`YYYY-Www`) column. `$from`, `$to` and the params
  the page declares are bound as positional parameters (`compileSql`,
  `sql.ts`; `$1…`, which SQL Server's connector rewrites to `@p1…`). A param
  the SQL names keys the cache; the rest only pick a view. The SQL is the
  connector's own dialect: `$from::date` is Postgres, `cast($from as date)`
  runs everywhere.
- **Reshaping.** `query(sql, { reconstruct: (rows: Row[], filters) => Out[] })`
  reshapes a query's sliced rows in code, on the server (the spec's
  `reconstruct`); `D` then holds `Out`, so the components are typed by it.
- **Page options** (`page`, PageOptions less `title` and `description`):
  `filterBar`, `filterPresets`, `filterEarliest`, `width`, `downloadHtml`,
  `empty`, `emptyText`, `info`, `filterParams`, `inputsLabel`, `asOfIn`.
- **Filters and inputs.** The page's filters are the date range (`?from=`,
  `?to=`; `filterBar: false` hides it for a report with no dates) and
  `page.filterParams` (`ParamFilter`, `lib/filters.ts`): an entry without
  `input` is a select in the filter bar's popover; `input: "select"`,
  `"toggle"` or `"multi"` goes in the one View trigger; `"slider"` and
  `"number"` are drawn by `<InputSlider>` / `<InputNumber>`
  (`inputs-card.tsx`) inside `<k.Inputs>`; `"tabs"` by `<k.Tabs param>`.
- **Dialog.** `page.info` returns `<Info>` and `<Technical>` (the two tabs)
  and any `<Panel label>`, written with `<H2>`, `<P>`, `<Rules as>` of
  `<Rule id title lead?>`, `<Sql query>`, `<Value of format>` and
  `<Definition name>` (`info.tsx`). A component's `info={{ what, rules, sql }}`
  picks rules by id and lists the tables its SQL reads from the
  `as="table"` group.
- **Components** (`components.tsx`, `visual-components.tsx`, `driver-tree.tsx`):
  `Line`, `StackedBars`, `CategoryBars`, `BarsWithLine`, `Treemap`,
  `Funnel`, `Kpis`, `Table`, `GroupedTable`, `ShareBars`, `Waffle`,
  `Progress`, `DriverTree`, the containers `Section`, `Tabs`, `Inputs`, and
  `Custom` (a component written in the `report.tsx`, given `{ data, filters }`);
  `When` and `Repeat` (`component-wrap.tsx`) wrap a component, and a table's or a
  tile's `drills` (`drill.tsx`) open components on the clicked row. Span-2
  components take a row; consecutive span-1 components pair into a two-up grid. The
  skeleton is derived from the same list.
- **Checks.** `npm run lint`: ESLint (`eslint-plugin.mjs`: no runtime import
  from a `.server` module in a view), `check.ts` (a report folder holds only
  `report.tsx` and `.sql` files; each `.sql` starts with its `-- title`) and
  `npm run typecheck`.

## Design rules

The table rules are in `product/DESIGN.md` (repo root). The components carry the
report design rules. The kit's history before report.tsx (the
choices made while porting it, in the tag syntax reports used then) is in
git: `git show 5204081:app/src/components/report-kit/README.md`.
