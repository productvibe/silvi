---
title: Principles
description: The rules every report and every change keeps.
order: 1
---

These rules are written into `CLAUDE.md`, so Claude follows them without
being asked. Knowing them helps you ask for the right thing.

## Content before code

A report is content: a `report.tsx` file that lists its queries and components,
and a `.sql` file per query. A report folder holds nothing else. Claude
changes reports, wiki pages and the metrics first, and touches the kit's
code only when a report cannot do the job.

## Explanations go in the dialog

The page shows figures, not text. What a figure means, the rules behind it
and the SQL that produces it go in the report's "(i)" dialog. A paragraph on
the page is not how a report explains itself.

## SQL only reads

A report's SQL is a `select` or a `with` query. The app refuses anything
else, so a report can never change your database.

## Secrets stay in `.env`

Passwords, tokens and connection strings go in `app/.env` and nowhere else.
That file is never saved to git. If you prefer, Claude opens it for you and
you paste the values in yourself.

## Fictional names in examples

Examples in the wiki and in sample SQL use made-up names. Your real data
lives only in your database.

## Every change is checked

After a change Claude runs the checks: the report folder's files, and every
query, column and prop its components name against what the queries return. A
failing check names the file and the line, and Claude fixes it before you
look. The checks are listed in [The report file](/wiki/components/report-file).
