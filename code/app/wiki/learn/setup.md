---
title: Setup
description: Lesson 1. Open the app, see the example reports, connect your database.
order: 1
---

## Open the folder

In the Claude desktop app, open the Code tab and choose your Silvi folder.
Then say:

> "Start the app and open it in my browser."

Claude starts the app on port 9923 and opens <http://localhost:9923>. It
keeps it running while you work; if the page stops loading, ask Claude to
start it again.

## Look at the example reports

Click **Reports** in the sidebar. Three examples are there, for a made-up
data analytics society in Copenhagen:

- **Events**: how many people came to each event, by month and format.
- **Members**: who the members are, by age, gender, district and field.
- **Website visitors**: visitors per month, where they came from and the
  pages they read.

Open **Events**.

Click the "(i)" in the header. The dialog has an **Info** tab, with what the
figures mean, and a **Technical** tab, with the SQL behind them.

The examples work without a database: they read sample CSV files that came
with the app. So they are a safe place to try things. Ask, for example:

> "In the Events report, add a chart of turnout by venue."

## Connect your database

Your reports need to reach your database. Follow
[Connect your database](/wiki/guides/connect-database): you tell Claude which
database you use, and you put the connection details in the app's private
settings file.

When it works, ask:

> "Which tables can my reports read? List the ten largest."

Claude asks the database and answers. You are ready for
[Your first report](/wiki/learn/start).
