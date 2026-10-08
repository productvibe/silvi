---
title: Fix problems
description: What to do when a report says Not connected, a check fails or a figure looks wrong.
order: 4
---

In every case the first step is the same: tell Claude what you see.

## "Not connected"

The report's connector has no keys in `app/.env`, or no connector is chosen.
The message names the keys to set. Ask:

> "The Orders report says Not connected. Fix it."

Claude checks which connector the report uses and which keys are missing. If
a password is missing, it opens `app/.env` for you to paste it. See
[Connect your database](/wiki/guides/connect-database).

## The check fails

After a change Claude runs the check; a failure names the file, the line and
what is wrong, such as a component reading a column its query does not return,
a prop the component does not take, or a file that does not belong in a report
folder. Ask Claude to fix it; it reads the message and the line. What the
check covers is in [The report file](/wiki/components/report-file).

## A query fails

The database refused the SQL: a wrong column name, or a function from another
database's dialect. The report shows the database's own message; ask
Claude to fix the SQL.

## A figure looks wrong

Say what you expected and where your number comes from:

> "The tile says 512 sign-ups for March; our CRM says 530. Why?"

Claude compares the two, finds the rule that differs (a time zone, a status,
a duplicate) and either fixes the SQL or writes the rule into the dialog.

## The figures are old

Results are kept for ten minutes. Wait, or ask Claude to restart the app.

## The page does not load at all

Ask: "The app does not load. Is it running?" Claude checks and starts it
again on port 9923.
