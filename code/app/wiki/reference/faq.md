---
title: Questions
description: Answers to the questions people ask most.
order: 3
---

## Does the app change my database?

No. A report's SQL must be a `select` or a `with` query; anything else is
refused. Give the app a read-only database user as well.

## Where do my passwords go?

In `app/.env`, on your computer. It is never saved to git. Claude can open
the file for you to paste them in yourself.

## Why does the date filter not change my chart?

Each query runs once over the last 24 months, and the date filter then keeps
the rows in your range by the query's `grain`. A query whose `grain` is `all`
(the default), or whose rows have no `week` or `month` column, shows the same
rows whatever dates you pick. Ask Claude to make it follow the date filter;
see [How it works](/wiki/how-it-works).

## Why do the figures not change right away after new data arrives?

Results are kept for ten minutes, so pages open fast. They refresh after
that.

## Can a report read two databases?

A report reads one connector. Two reports can read two databases; each
report's `meta.connector` picks its own.

## Can I write SQL myself?

Yes. Give Claude the query and ask it to make a report from it. Claude adds a
name, checks the columns and builds the components.

## Can I have a chart the kit does not have?

First ask Claude whether a component's props can do it; most can. If
not, a visual only this report needs can be drawn in its own `report.tsx`
with [Custom](/wiki/components/custom). One many reports need is better
added to the kit as a new component, for every report.

## Why is there no text on the report page?

Text goes in the "(i)" dialog, so the page stays figures and every
explanation has one place. Claude follows this rule when it writes a
report; see [Principles](/wiki/idea/principles).

## How do I share a report?

Everyone who runs the app sees the same reports. A report can also be saved
as an HTML file; ask Claude to add the download button.

## How do I undo a change?

Ask Claude to put the last change back. See
[Saved versions](/wiki/advanced/checkpoints).
