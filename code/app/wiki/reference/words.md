---
title: Words
description: The words this wiki uses, in one place.
order: 1
---

| Word | Means |
|---|---|
| **Report** | One page of figures: a folder in `app/src/reports/` holding `report.tsx`. The folder name is its address. |
| **report.tsx** | The report's file: its name and connector, its queries, its components and the dialog. See [The report file](/wiki/components/report-file). |
| **Query** | A `.sql` file in the report's folder, named in `report.tsx`. Its result is a series. |
| **Series** | A named list of rows: a query's result. Components read series by name. |
| **Component** | One part of a report page: a chart, tiles, a table, a section, written `<k.Table>` and so on. See [Components](/wiki/components). The folder `app/src/blocks/` is something else: the code behind a module's screens. |
| **Prop** | A setting on a component, such as `title="Sales"` or `x="week"`. |
| **Dialog** | What the "(i)" in the report's header opens: the rules and the SQL. Each component has its own "(i)" too. |
| **Rule** | One explained point in the dialog, with an id components refer to. |
| **Input** | A control that changes the view: a select, a toggle, a slider or a number. Its value is in the page address. |
| **Connector** | How the app reads one kind of data: Excel, CSV or JSON files, SQLite, SQL Server, Postgres, MySQL, BigQuery or Redshift. The default, `csv`, needs no setup. |
| **Grain** | How rows are matched to the date filter: `week`, `month` or `all` (not filtered). |
| **Wide window** | The 24 months up to today that every query runs over, once; the date filter then picks rows out of it. |
| **Metric** | A named measure with one definition, in `app/src/metrics/metrics.ts`. See [Metrics](/wiki/advanced/metrics). |
| **Check** | What tests a report after each change; a failure names the file and a line. |
| **Kit** | The starter Silvi came from; `silvi update` brings its improvements in. |
