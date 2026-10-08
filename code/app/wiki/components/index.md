---
title: Components
icon: component
description: Every piece a report is built from, one page each, with its props, an example and the checks that fail it.
order: 4
---

A report is one file, `report.tsx`, with its SQL in `.sql` files beside it:
it names its queries, then lists components that read the results by name.
This section is the reference for every component. You rarely write these
yourself: ask Claude, for example "Add a line chart of sales per month to
the Sales report", and use these pages to know what is possible and what to
ask for.

Every example writes its rows in the SQL itself, so it needs no table; a
date function in it may need the dialect of your connector (see
[The report file](/wiki/components/report-file) → Dialects). On your own data the SQL reads your
tables instead.

## The report file

| Page | What it covers |
|---|---|
| [The report file](/wiki/components/report-file) | `report.tsx`: `meta`, `connector`, the queries, `$from` and `$to`, dialects, the checks |
| [Props every component takes](/wiki/components/common) | `title`, `description`, `span`, `info`, `metric`, `When` and `Repeat`, and the number formats |

## Charts

| Component | Shows |
|---|---|
| [Line](/wiki/components/line) | One or more measures over time, as lines |
| [StackedBars](/wiki/components/stacked-bars) | Parts of a whole per period, as stacked bars, with optional rate lines |
| [CategoryBars](/wiki/components/category-bars) | One measure across categories, as bars |
| [BarsWithLine](/wiki/components/bars-with-line) | A count as bars and a rate as a line, on one chart |
| [Treemap](/wiki/components/treemap) | Shares of a whole, as nested rectangles |
| [Funnel](/wiki/components/funnel) | Stages that narrow, as nested areas |
| [Waffle](/wiki/components/waffle) | Stages as 100 squares, each square 1 % |
| [Progress](/wiki/components/progress) | A figure against its target, as a bar |
| [DriverTree](/wiki/components/driver-tree) | Measures joined parent to child, as cards on a canvas |

## Numbers and tables

| Component | Shows |
|---|---|
| [Kpis](/wiki/components/kpis) | A row of figures as tiles |
| [Table](/wiki/components/table) | Rows and columns |
| [GroupedTable](/wiki/components/grouped-table) | Rows with the same measures repeated per group of columns |
| [ShareBars](/wiki/components/share-bars) | A list of labelled bars, each a share out of 100 |

## Layout

| Component | Does |
|---|---|
| [Section](/wiki/components/section) | Puts a heading over a group of components |
| [Tabs](/wiki/components/tabs) | Shows one group of components at a time |
| [Drills](/wiki/components/drill) | Opens components for one row in a dialog when a row or tile is clicked |

## Inputs

| Component | Does |
|---|---|
| [Inputs](/wiki/components/inputs) | Values the reader sets, and the card of sliders and numbers on the page |
| [select](/wiki/components/select) | A choice from a list, in the View menu or the filter bar |
| [toggle](/wiki/components/toggle) | An on/off switch in the View menu |
| [slider](/wiki/components/slider) | A number picked on a slider, inside `Inputs` |
| [number](/wiki/components/number) | A typed number, inside `Inputs` |

## Your own visual

| Component | Does |
|---|---|
| [Custom](/wiki/components/custom) | Draws a component written in the report's `report.tsx`, for a visual no component has |

## The "(i)" dialog

| Component | Does |
|---|---|
| [Info and Technical](/wiki/components/dialog) | The report's "(i)": the Info and Technical tabs |
| [Panel](/wiki/components/panel) | A further tab in the dialog |
| [Rules, Rule and Lead](/wiki/components/rules) | The definitions a report follows, which components pick by id |
| [Sql](/wiki/components/sql) | Shows a query of the report |
| [Value](/wiki/components/value) | Prints one figure from the report's data in the dialog |
| [Definition](/wiki/components/definition) | Prints a named metric's one-line definition |
