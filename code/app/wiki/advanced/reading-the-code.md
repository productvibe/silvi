---
title: Reading the code
description: Where things live in the app's code, for the curious.
order: 4
---

You never have to read the code. If you are curious, ask Claude to walk you
through a part of it. This is the map.

| Part | Where | What it does |
|---|---|---|
| The report-kit | `app/src/components/report-kit/` | Runs the reports' SQL and draws the components |
| The report format | `report-kit/define.tsx`, `define-page.tsx` | What a `report.tsx` holds: `defineReport`, `query` and the page's options |
| The components | `report-kit/components.tsx`, `visual-components.tsx`, `driver-tree.tsx` | How each chart, table and tile is drawn |
| The dialog | `report-kit/info.tsx` | The "(i)" dialogs |
| The connectors | `app/src/connectors/` | One folder per database |
| The Reports module | `app/src/blocks/reports/` | The report list and its pages |
| The wiki | `app/src/wiki/` | How these pages are read and drawn |
| The shared UI | `app/src/components/ui/` | Buttons, tables, dialogs every screen uses |

Good questions to ask:

- "How does the app turn report.tsx into a page?"
- "Where does the date filter cut the rows?"
- "What happens when I open a report for the first time today?"

## Content before code

If a report needs something the components cannot do, ask first whether a
prop does it. Most of the time one does. When the kit's code does
change, it is for every report, not one: a new prop or a new
component, with a page in [Components](/wiki/components). A visual only one
report needs is drawn in that report's `report.tsx` with
[Custom](/wiki/components/custom).
