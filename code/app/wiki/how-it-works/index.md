---
title: How it works
description: How a report file becomes a page of figures from your database.
icon: cog
order: 2
---

## The pieces

| Piece | Where | What it does |
|---|---|---|
| A report | `app/src/reports/<id>/report.tsx` | The page: its name, its named queries, the components, the "(i)" dialog. The folder name is the address, `/reports/<id>`. |
| Its SQL | `.sql` files beside it | One query each |
| A connector | `app/src/connectors/<id>/` | Reaches one kind of database; its keys are in `app/.env` |
| The report-kit | `app/src/components/report-kit/` | Draws the components and checks the files |

Adding a folder with a `report.tsx` adds a report to the list. Nothing else
needs changing.

## How a page is served

1. **The file is checked before it runs.** Every component, prop, query and
   column it names must be one the kit and its queries know; the check names
   the file and line of an error.
2. **Every query runs once, over a wide window.** Each query runs over
   the last 24 months up to today: `$from` and `$to` in the SQL are bound to
   that window, not to the dates you pick. The result is cached for ten
   minutes.
3. **The rows are sliced to your dates.** Each query's `grain` says how:
   with `week`, each row's `week` column ("2026-W14") is kept when it falls
   in the range; with `month`, its `month` column ("2026-03"); with `all`
   (the default) nothing is sliced. Changing the dates re-slices the cached
   rows, so it is instant and runs no query.
4. **The page draws the components.** Each component reads one result by its name
   (its **series**) and the columns it names.

So a report that should follow the date filter returns a `week` or `month`
column and sets `grain`. One whose queries are all `"all"` shows the same
rows whatever the dates; `filterBar: false` hides the date filter for such a
report.

## The checks

| Check | When | What it catches |
|---|---|---|
| The lint check | After every change Claude makes | Files that are not allowed in a report folder, a `.sql` file without its title line, and every series, column and prop a component names that its queries do not return |
| The page | When you open the report | A query that fails on your database shows its error |

Claude runs these for you. What each part of a report accepts is in
[Components](/wiki/components).

## In this section

| Page | Read it to |
|---|---|
| [Connectors](/wiki/how-it-works/connectors) | See how the app reaches your database |
