---
title: Make it yours
description: Lesson 3. Add charts, a table, the dialog, the date filter and an input.
order: 3
---

Each step below is one thing to ask. Try them on the report from lesson 2.

## A chart by category

> "Add a bar chart of this period's amount by product category."

Claude adds a [`CategoryBars`](/wiki/components/category-bars) component and a
query that groups by category. For parts of a whole over time it would use
[`StackedBars`](/wiki/components/stacked-bars).

## A table

> "Add a table of the categories with orders, amount and average order
> value."

A [`Table`](/wiki/components/table) names its columns and their formats.

## The dialog

> "Explain in the (i) how the amount is counted: before or after refunds,
> and with or without VAT."

The [dialog](/wiki/components/dialog) holds the rules. Each component's own "(i)"
picks the rules that apply to it.

## The date filter

The date filter applies to a query that has a `week` or `month` column and
a matching `grain`. A result without one shows the same
rows whatever dates you pick. Ask:

> "Make the category chart follow the date filter too."

## An input

> "Add a toggle that shows the table by month instead of by week."

Inputs ([`select`](/wiki/components/select), `toggle`, `slider`, `number`)
change the view without running a new query, unless the SQL reads them.

## Read on

- [Components](/wiki/components): every component and what it accepts.
- [Guides](/wiki/guides): one job at a time.
- [Ask Claude](/wiki/guides/ask-claude): prompts that work well.
