---
title: The idea
description: What Silvi is, in one page.
order: 1
icon: lightbulb
---

Silvi is a reporting starter kit. It gives you an app whose pages are reports
on your own database, and a way to build more of them by asking Claude.

## Three parts

| Part | What it is |
|---|---|
| Reports as files | Each report is one file, `report.tsx`, in its own folder of `app/src/reports/`, with its SQL in `.sql` files beside it. It holds the charts and tables, and the explanations. |
| Read live | The app runs the report's SQL on your database through a **connector** (data files such as CSV or Excel, SQLite, or a hosted database: SQL Server, Postgres, MySQL, BigQuery or Redshift) whenever the page is opened, cached for ten minutes. |
| Written by Claude | You describe the report; Claude writes and changes the file, runs the checks and opens the page. |

Because a report is a file, it can be read, compared and put back. Because the
app checks every file, a broken report is caught before you see it.

## What you start with

The sidebar has two modules:

- **Reports**: every report in the app, listed by title and description. It
  starts with **Example**, which draws tiles, a bar chart and a table from
  sample rows written in its own SQL, so it works before any database is
  connected.
- **Wiki**: this wiki.

Settings has Appearance, where you change the theme and the look.

## What a report looks like

A report page has a title and description, an optional date filter, tiles
for the headline figures, then charts and tables. The "(i)" button in the
header opens the report's dialog: what each figure means, the rules behind
it, and the SQL that runs. The page itself holds no text: explanations live
in the dialog.

Every part a report can use is described in [Components](/wiki/components).

## In this section

| Page | Read it to |
|---|---|
| [Principles](/wiki/idea/principles) | Know the rules every change is checked against |

When you are ready, go to [How it works](/wiki/how-it-works) for the pieces,
or straight to [Learn](/wiki/learn).
