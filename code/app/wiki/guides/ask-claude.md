---
title: Ask Claude
description: Requests that work well when you build reports.
order: 3
---

Claude knows the report format, the components and the checks. You bring the
question and the knowledge of your data.

## Good habits

- **Name the report.** "In the Orders report, …" keeps changes in one place.
- **Say what you see, then what you want.** "The chart shows every day; I
  want weeks."
- **Give the rule, not the SQL.** "Refunds don't count as orders" is enough;
  Claude writes the SQL and puts the rule in the dialog.
- **Ask for one change at a time**, and look before the next.
- **Ask why.** "Why is March lower than February?" Claude can read the data
  and explain.

## Prompts to start from

| You want | Ask |
|---|---|
| A new report | "Make a report on the invoices table: amount invoiced per month, by customer segment." |
| To explore first | "What could I report on from the tables in the sales schema?" |
| A different chart | "Show this as stacked bars by channel instead of lines." |
| A figure explained | "Explain in the (i) how active customers are counted." |
| A check of a number | "Last month shows 1 240 orders. Compare with a direct count on the database." |
| A tidy-up | "Make the tiles show thousands with one decimal." |
| A filter | "Add a select to pick the region; default to all." |
| A copy | "Make a copy of this report for the Nordic stores only." |
| A wiki page | "Add a wiki page about what our order statuses mean." |

## When you don't know the word

Describe it. "The little numbers above each bar" is fine; Claude finds the
right prop. The names are in [Components](/wiki/components) if you
want them.
