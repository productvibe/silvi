---
title: Your first report
description: Lesson 2. Ask Claude for a report on one of your tables, and open it.
order: 2
---

## Pick one table and one question

Start small: one table and one question about it. For example, a table of
orders and the question "How many orders do we get each week, and for how
much?"

## Ask for it

> "Make a report called Orders on the orders table. Show the number of orders
> and their total amount per week, with tiles for the totals and a line
> chart over time. Follow the date filter."

Name the table, the figures and the period. If you are not sure of the
column names, ask Claude to look first:

> "Look at the orders table and tell me which columns could give a weekly
> order count and amount."

## What Claude writes

Claude makes a folder `app/src/reports/orders/` with one file,
`report.tsx`, and a `.sql` file per query:

- the **name**: the title, the description, and the connector;
- one or more **queries**, each a `.sql` file with a name, that return the
  rows, cut to the date filter by week;
- the **components**: `Kpis` for the tiles, `Line` for the chart, each reading a
  query by its name;
- the **dialog**: what each figure means and the SQL behind it.

Then it runs the checks and opens `/reports/orders`.

## Look and steer

Open the report and check the figures against what you know. Then ask for
changes in plain words:

- "Show the amount in thousands."
- "Start the chart at the beginning of the year."
- "Add a table of the last twelve weeks under the chart."

If something looks wrong, say what you expected:

> "Last week shows 40 orders, but our shop had about 400. Check the SQL."

Next: [Make it yours](/wiki/learn/next).
