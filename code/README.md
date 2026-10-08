# Silvi

Silvi is a reporting starter kit: an app of reports on your own data,
which you build on with Claude. A report is a small React file over SQL files
(tiles, charts, tables, a "(i)" dialog); the app reads it live from data
files or a database through a connector, and Claude writes and changes the files. It
runs on your own machine.

It has two modules in the sidebar:

- **Reports** (`/reports`): every report in `app/src/reports/`, listed by
  title and description; `/reports/<id>` opens one;
- **Wiki** (`/wiki`): how the app works and what you learn, as pages.

Settings has Appearance (theme and look) and one page per module.

The app root is `app/`, so run all `npm` from there. `npm run dev` serves on
**:9923**.

## Layout

```
CLAUDE.md                    how Claude works on this app
product/DESIGN.md            the table rules
kit/starter.json             the modules a new app starts with
app/                         the React Router app
  .env.example               every installed connector's keys (copy to .env)
  data/<kind>/               data files the excel, csv and json connectors read
  wiki/                      the wiki pages (Markdown)
  src/reports/<id>/          one report: report.tsx and its .sql files
  src/metrics/               named metrics (metrics.ts) and the dictionary
  src/connectors/            the connectors: one folder each, and the registry
  src/components/report-kit/ the report-kit: the format, the components, the checks
  src/blocks/reports/        the Reports module's screens: the list and its routes
  src/modules/               one file per module: sidebar, routes and Settings
  src/wiki/                  the wiki: pages, tree, reader, downloads
  src/components/ui/         the shadcn components the screens are built from
  src/routes/                the shell, Settings and search
  src/theme.css              the look: style, colour and font (from the preset)
  src/theme.json             the preset code, the style, the colour (accent
                             and charts default), and the sidebar's logo with
                             its drawing
```

The theme files are written whole from a preset code by `silvi init` and
`silvi apply --preset <code>` (the CLI's `lib/preset.mjs`), so change the look
there rather than by hand. The style (Neutral, Power BI, Tableau, Google Looker)
brings its own colour and font, and is CSS in `theme.css` over the components' `data-slot` attributes; the
components themselves stay shadcn's. The logo is the mark beside the app name
at the top of the sidebar (`src/components/brand/app-mark.tsx`).

## A report

A report is a folder of `app/src/reports/` with a `report.tsx` and its
`.sql` files; the folder name is its URL. Adding the folder adds the report to
the list.

```tsx
import { defineReport, query } from "~/components/report-kit/define"
import { H2, Info, Sql, Technical } from "~/components/report-kit/info"

import regions from "./regions.sql?raw"

type Region = { region: string; sales: number; orders: number }

export default defineReport({
  meta: { title: "Example", description: "Sales and orders by region.", connector: "postgres" },
  page: {
    info: () => (
      <>
        <Info>…</Info>
        <Technical><H2>The SQL</H2><Sql query="regions" /></Technical>
      </>
    ),
  },
  queries: { regions: query<Region>(regions) },
  components: (k) => [
    <k.CategoryBars key="bars" series="regions" x="region" value="sales" title="Sales by region" />,
    <k.Table key="table" series="regions" title="Regions"
      columns={[{ key: "region", label: "Region", format: "text" }, { key: "sales", label: "Sales" }]} />,
  ],
})
```

```sql
-- Sales and orders per region
select region, sum(amount) as sales, count(*) as orders
from sales where sold_on between $from and $to
group by region
```

- **`meta`:** `title` and `description`, and `connector` when the app has
  more than one.
- **`queries`:** one `query<Row>(sql, { grain })` per `.sql` file, whose
  first line is its `-- title`; each result is a series the components read by
  name. `grain` (`all`, `month` or `week`) is how the rows are sliced to the
  date range. `$from` and `$to` are the date filter, bound as parameters.
  Write the SQL in your database's own dialect.
- **`components`:** `k.Kpis`, `k.Line`, `k.StackedBars`, `k.CategoryBars`,
  `k.BarsWithLine`, `k.Treemap`, `k.Funnel`, `k.ShareBars`, `k.Waffle`,
  `k.Progress`, `k.DriverTree`, `k.Table`, `k.GroupedTable`, laid out with
  `k.Section`, `k.Tabs` and a table's `drills`; `k.Custom` draws a
  component written in the `report.tsx` itself, for a visual no component has. A series or column the
  queries do not return fails the type check.
- **`page`:** `filterBar: false` for a report with no dates, `filterEarliest`,
  the inputs and filters (`filterParams`), and `info`.
- **The dialog** (`page.info`, the "(i)" in the header) holds the
  explanations: `Info`, `Technical`, `Rules`, `Sql`, `Value`, `Definition`,
  `Panel`. The page itself holds no prose.

`app/src/reports/` holds three working examples for a fictional data
analytics society in Copenhagen: `events` (attendees), `members`
(demographics) and `website` (visitors). Each reads its own file of
`app/data/csv/` through `csv` (`meta.connector`), so they run with no setup;
an app without `csv` shows them as not connected. Every component has a page in the wiki's Components section
(`app/wiki/components/`); how the kit works is in
`app/src/components/report-kit/README.md`.

## Connectors

A connector is how the reports read their data. Nine exist, in three
groups (`group` in `connector.json`):

| id | Group | Reads | Packages | `.env` keys |
| --- | --- | --- | --- | --- |
| `excel` | Data files | `.xlsx` in `app/data/excel/`, a table per sheet (`<file>_<sheet>`) | `exceljs`, `better-sqlite3` | `EXCEL_DIR` (data/excel) |
| `csv` | Data files | `.csv` in `app/data/csv/`, a table per file | `csv-parse`, `better-sqlite3` | `CSV_DIR` (data/csv) |
| `json` | Data files | `.json` in `app/data/json/` (an array of objects, or `{ "rows": [...] }`), a table per file | `better-sqlite3` | `JSON_DIR` (data/json) |
| `sqlite` | Local database | A SQLite file, read-only | `better-sqlite3` | `SQLITE_PATH` (data/app.sqlite) |
| `sqlserver` | Hosted database | SQL Server | `mssql` | `SQLSERVER_HOST`, `SQLSERVER_PORT` (1433), `SQLSERVER_DB`, `SQLSERVER_USER`, `SQLSERVER_PASSWORD`, `SQLSERVER_ENCRYPT` (true) |
| `postgres` | Hosted database | Postgres | `pg` | `POSTGRES_URL` |
| `mysql` | Hosted database | MySQL | `mysql2` | `MYSQL_URL` |
| `bigquery` | Hosted database | Google BigQuery | `@google-cloud/bigquery` | `BIGQUERY_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS` (key file path), `BIGQUERY_LOCATION` (optional) |
| `redshift` | Hosted database | Amazon Redshift, TLS verified | `pg` | `REDSHIFT_HOST`, `REDSHIFT_PORT` (5439), `REDSHIFT_DB`, `REDSHIFT_USER`, `REDSHIFT_PASSWORD` |

The data-file connectors load their folder into an in-memory SQLite
database (`app/src/connectors/sqlite-tables.server.ts`), one table per file,
names and headers slugged (`Order Date` → `order_date`), a column of only
numbers stored as numbers, and load it again when a file changes; their SQL
is SQLite's. `csv` ships the example reports' data (`events.csv`,
`members.csv`, `website_visits.csv`), and `excel` and `json` a sample `sales` table.
`csv` needs no setup and is the default.

- Each is a folder of `app/src/connectors/`: `connector.json` (`id`,
  `label`, `group`, `packages`, `devPackages` for its `@types/*`, `data`
  for its seed files, `env`) and `connector.server.ts` (the code). The
  registry (`index.server.ts`) finds them by convention, so adding or
  removing one is copying or deleting its folder (`silvi add`,
  `silvi remove`).
- A report reads the connector its `meta` names (`connector`), else
  `SILVI_CONNECTOR` in `app/.env`, else the only one installed, else `csv`.
- Copy `app/.env.example` to `app/.env` and fill in your connector's keys
  (the data-file connectors and `sqlite` need none: every key has a default).
  The app starts without them; a report whose connector is not set up says
  "Not connected" and names the keys to set.
- Every connector returns rows in one shape: numbers as numbers, dates as
  `YYYY-MM-DD` text, timestamps as `YYYY-MM-DD HH:MM:SS`. Queries are
  read-only (`select` or `with`), cached ten minutes, and one query per
  report answers every date range.

## Wiki

One Markdown page per file in `app/wiki/`; a folder is a section and its
`index.md` is the landing page. Frontmatter: `title`, `description`, `order`.
`src/wiki/plugin.ts` turns each page into HTML at build time.

Pages are plain Markdown with GitHub's tables, and one more form, a set-off
note:

```md
> [!NOTE]
> **Use a read-only user.** The app only reads.
```

`/wiki/reference/metrics` lists every metric and dictionary term, written out
from `app/src/metrics/`.

## Commands (from `app/`)

| cmd | what |
| --- | --- |
| `npm install` | install the dependencies |
| `npm run dev` | dev server on :9923 |
| `npm run build` / `npm start` | build / serve |
| `npm run typecheck` | typegen + tsc |
| `npm run lint` | ESLint, the report folder check, then the type check |

## Stack and conventions

React Router 7 in framework mode (SSR), React 19, TypeScript, Tailwind 4 with
shadcn (`base-nova` on Base UI), lucide icons, Recharts, and marked for the
wiki.

- `.server.ts` files are server-only; client code imports only their types.
- `~` maps to `app/src/`.
