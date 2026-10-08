---
title: The report file
description: What report.tsx holds, how its SQL runs, the dialect of each connector, and the checks a report must pass.
order: 1
---

A report is a folder of `app/src/reports/`, and the folder's name is its
address: `app/src/reports/sales/` opens at `/reports/sales`. The folder
holds:

| File | What it is |
|---|---|
| `report.tsx` | The page: its name, its options, its queries, its components and the "(i)" dialog |
| `<name>.sql` | One query each, read by `report.tsx` |

A report folder holds only `report.tsx` and `.sql` files. Any other file
fails the check. Adding the folder adds the report to the list on
`/reports`.

## Anatomy

`monthly.sql`:

```sql
-- Sales and orders per month
select to_char(sold_on, 'YYYY-MM') as month,
       sum(amount) as sales, count(*) as orders
from sales
where sold_on between $from and $to
group by 1
```

`report.tsx`:

```tsx
import { defineReport, query } from "~/components/report-kit/define"
import { Info, Rule, Rules, Sql, Technical } from "~/components/report-kit/info"

import monthly from "./monthly.sql?raw"

type Month = { month: string; sales: number; orders: number }

export default defineReport({
  meta: {
    title: "Sales",
    description: "Sales and orders per month.",
    connector: "postgres",
  },
  page: {
    info: () => (
      <>
        <Info>
          <Rules>
            <Rule id="sales" title="Sales">
              the order amount, including tax, by the day it was sold.
            </Rule>
          </Rules>
        </Info>
        <Technical>
          <Sql query="monthly" />
        </Technical>
      </>
    ),
  },
  queries: { monthly: query<Month>(monthly, { grain: "month" }) },
  components: (k) => [
    <k.Line
      key="sales"
      series="monthly"
      x="month"
      xFormat="month"
      y={{ sales: "Sales" }}
      title="Sales per month"
      info={{ what: "Sales per month.", rules: ["sales"], sql: ["monthly"] }}
    />,
  ],
})
```

The parts: `meta` (the report's name), `page` (its options and the
[dialog](/wiki/components/dialog)), `queries` (each `.sql` file by the name
components read it under) and `components` (the page, top to bottom). The page
itself holds no text: explanations go in the dialog.

## meta

| Key | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `title` | text | yes | | The page's title, and its name on `/reports` |
| `description` | text | yes | | One line under the title, and on `/reports` |
| `connector` | connector id | no | `SILVI_CONNECTOR` in `app/.env`, else the only connector installed, else `csv` | The connector every query of this report runs on: `excel`, `csv`, `json`, `sqlite`, `sqlserver`, `postgres`, `mysql`, `bigquery` or `redshift` |

## page

| Key | Type | Default | Meaning |
|---|---|---|---|
| `filterBar` | true/false | true | `false` hides the date filter, for a report with no dates |
| `filterPresets` | list of preset labels | every preset, and Start and End fields | Offers only these presets, in this order, and no Start and End fields: `["Last Month", "Last Year"]` |
| `filterEarliest` | `"YYYY-MM-DD"` | none | The first day the date filter may start on |
| `filterParams` | list of entries | | The report's [inputs](/wiki/components/inputs) and filter-bar choices |
| `inputsLabel` | text | "View" | The label on the button that holds the page's inputs |
| `empty` | `{ series, text }` | | When this query returns no rows, the page shows `text` instead of its components |
| `emptyText` | text | "No data in this range" | What an empty component says |
| `width` | `"6xl"` or `"7xl"` | the app's width | The page's maximum width |
| `downloadHtml` | text | | A header button that saves the page as HTML, under this file name |
| `info` | `() => content` | | The ["(i)" dialog](/wiki/components/dialog) |
| `asOfIn` | `"header"` or `"info"` | `"header"` | Where the dialog's "Data as of" line goes |

## Queries

Each query is a `.sql` file in the folder, imported with `?raw` and named
in `queries`: `queries: { monthly: query<Month>(monthly) }`. The name is
how components read the result: `series="monthly"`. `Month` is the row the
query returns, one entry per column: components may name only those columns.

- Start the file with a `--` comment line: it is the query's title in the
  dialog. A file without one fails the check.
- Queries are read-only: they must start with `select` or `with`.
- Results arrive in one shape on every connector: numbers as numbers,
  dates as `YYYY-MM-DD` text, timestamps as `YYYY-MM-DD HH:MM:SS` text.

### Reshaping rows in code

When the SQL cannot say it, a query can reshape its rows with
`reconstruct`. It runs on the server after the rows are cut to the date
filter's range, and the components then read what it returns:

```tsx
regions: query(regions, {
  reconstruct: (rows: Region[]) =>
    rows.map((r) => ({ region: r.region, perOrder: r.sales / r.orders })),
}),
```

Here the components may name `region` and `perOrder`, and no longer `sales`.
Prefer SQL when it can do the job: the dialog shows the SQL, not the code.

## $from, $to and the date filter

A query may name `$from` and `$to`, plus the `param` of any
[input](/wiki/components/inputs) the page declares. They are sent to the
database as parameters, never pasted into the text.

How the date filter works:

1. Every query of a report runs once over a **wide window**: `$from` is the
   first day of the month 23 months back, and `$to` is today. The result
   is cached for ten minutes.
2. The rows are then cut to the range the date filter shows, by the query's
   grain, `query<Month>(monthly, { grain: "month" })`: with `"month"`, each
   row needs a `month` column holding `YYYY-MM`; with `"week"`, a `week`
   column holding the ISO week, `YYYY-Www`. With `"all"` (the default),
   nothing is cut.
3. So changing the date range runs no query. A report opens on the first
   of the month a year ago through today.

With every query on `"all"` the date filter changes nothing on the page, so
a report whose results have no dates sets `filterBar: false`.

## Dialects

The SQL is your database's own. What differs most:

| | Postgres, Redshift | SQLite (and `csv`, `excel`, `json`) | MySQL | BigQuery | SQL Server |
|---|---|---|---|---|---|
| Month key | `to_char(d, 'YYYY-MM')` | `strftime('%Y-%m', d)` | `date_format(d, '%Y-%m')` | `format_date('%Y-%m', d)` | `format(d, 'yyyy-MM')` |
| ISO week key | `to_char(d, 'IYYY-"W"IW')` | `strftime('%Y-W%W', d)` (weeks from Monday, not ISO) | `date_format(d, '%x-W%v')` | `format_date('%G-W%V', d)` | `concat(year(dateadd(day, 26 - datepart(iso_week, d), d)), '-W', right(concat('0', datepart(iso_week, d)), 2))` |
| A date parameter | `cast($from as date)` | `date($from)` | `cast($from as date)` | `date($from)` | `cast($from as date)` |
| First rows | `limit 10` | `limit 10` | `limit 10` | `limit 10` | `select top 10` |
| True and false | `true`, `false` | `1`, `0` | `true`, `false` | `true`, `false` | `1`, `0` |

`$from::date` runs only on Postgres and Redshift. SQLite has no date type:
a date is its `YYYY-MM-DD` text, so `date($from)` compares as text, which
sorts right. For a yes/no column a component reads (`strong`, `ring`,
`footer`), return `1` and `0`: they work on all nine.

## Reading the data in a prop

A few props may read a value from the results instead of a fixed text:
`title`, `description`, `y`, `target`, `tooltip`, `reference`, `columns`,
`groups`, `lines` and `segmentParams`. Give them a function of the data:
`title={(d) => String(d.totals[0].label)}` is the `label` column of the
first row of `totals`.

## The checks

Claude runs `npm run lint` after every change to a report. It checks three
things:

| Check | Fails when |
|---|---|
| The code rules | A page imports server-only code |
| The report folders | A folder holds a file other than `report.tsx` and `.sql` files, has no `report.tsx`, or a `.sql` file lacks its `--` title line |
| The types | A component reads a series that is not one of the queries, or a column its rows do not have; a prop is missing, unknown or of the wrong type |

A query that fails on the database shows its error on the page. To fix one,
ask Claude: "The Sales report fails the check. Fix it."
