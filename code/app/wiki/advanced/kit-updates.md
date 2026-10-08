---
title: Kit updates
description: Bring the kit's improvements into your app without losing your reports.
order: 3
---

Your app was made from the Silvi kit. The kit keeps improving: new
components, fixes, better checks. An update brings those into your app.

## Ask for it

> "Is there a kit update? Tell me what it changes before applying it."

Claude runs `silvi update` with a dry run first, tells you which files would
change, and applies it when you say so. Then it runs the checks and opens a
report to confirm all is well.

## What an update touches

| Your files | What happens |
|---|---|
| Reports in `app/src/reports/` | Never touched: they are yours |
| `app/.env` | Never touched |
| Kit files you did not change | Replaced by the new version |
| Kit files you changed, which the kit did not | Kept as you have them |
| Kit files both you and the kit changed | Kept as you have them, with the kit's version beside them as `<file>.kit` |

When a `.kit` file appears, ask Claude to merge the two and remove it.

## Go back

> "Go back to the kit version before the update."

Claude updates to the earlier version, or puts back your saved version (see
[Saved versions](/wiki/advanced/checkpoints)).
