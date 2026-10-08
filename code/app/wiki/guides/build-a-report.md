---
title: Build a report
description: Ask for a new report so it comes out right the first time.
order: 2
---

## Say four things

1. **The question.** "How are sign-ups doing this quarter?"
2. **The data.** The table or tables, if you know them. If not: "Find the
   table that holds sign-ups first."
3. **The figures.** What to count or add up, and how: "sign-ups, and the
   share that became paying within 30 days".
4. **The period.** By week or by month, and whether it follows the date
   filter.

For example:

> "Make a report called Sign-ups on the signups table. Tiles for this
> period's sign-ups and conversion rate, a line chart of both by week, and a
> table by country. Follow the date filter. In the (i), say that conversion
> means paying within 30 days."

## What Claude does

1. Looks at the table's columns on your database.
2. Writes `app/src/reports/<id>/report.tsx` and a `.sql` file per query:
   the report's name, its queries, the components and the dialog.
3. Runs the checks, including each component's columns against its query's row.
4. Opens the report and tells you what is on it.

## Pick the right component

Ask for what you want to see; Claude picks the component. If you want a
particular one, name it. The whole list, with when to use each, is in
[Components](/wiki/components).

## Check the figures

Compare one figure with a number you trust. If it is off, say what you
expected and where your number comes from. Claude reads the SQL and explains
the difference, then fixes it or writes the rule into the dialog.

## Several pages

A long report can be split into pages, each its own file
(`report.<page>.md`) in the same folder. Ask: "Split this report into an
overview page and a page per region."
