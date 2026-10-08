---
title: Connectors
description: How the reports reach your database, and which one a report uses.
order: 1
---

A connector is how the reports read your data. The kit has nine, in three
groups:

| Group | id | Reads | Keys in `app/.env` |
|---|---|---|---|
| Data files | `excel` | The `.xlsx` files in `app/data/excel/`, a table per sheet | `EXCEL_DIR` (optional) |
| Data files | `csv` | The `.csv` files in `app/data/csv/`, a table per file | `CSV_DIR` (optional) |
| Data files | `json` | The `.json` files in `app/data/json/`, a table per file | `JSON_DIR` (optional) |
| Local database | `sqlite` | A SQLite database file | `SQLITE_PATH` (optional) |
| Hosted database | `sqlserver` | Microsoft SQL Server | `SQLSERVER_HOST`, `SQLSERVER_PORT`, `SQLSERVER_DB`, `SQLSERVER_USER`, `SQLSERVER_PASSWORD`, `SQLSERVER_ENCRYPT` |
| Hosted database | `postgres` | Postgres | `POSTGRES_URL` |
| Hosted database | `mysql` | MySQL | `MYSQL_URL` |
| Hosted database | `bigquery` | Google BigQuery | `BIGQUERY_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`, `BIGQUERY_LOCATION` |
| Hosted database | `redshift` | Amazon Redshift, with a verified TLS connection | `REDSHIFT_HOST`, `REDSHIFT_PORT`, `REDSHIFT_DB`, `REDSHIFT_USER`, `REDSHIFT_PASSWORD` |

The data-file connectors load their files into a small SQLite database in
memory, so a report queries them in SQL like any other, and load them
again when a file changes. `csv` needs no setup at all, so it is the
default: the three example reports (Events, Members and Website visitors)
run on its sample files as soon as the app starts.

Your app has the ones chosen when it was made. Each is a folder of
`app/src/connectors/`, so adding or removing one is adding or removing a
folder; ask Claude, and it does that for you. How to fill in the keys is in
[Connect your database](/wiki/guides/connect-database).

## Which connector a report uses

1. The one its file names: `connector: "postgres"` in its `meta`.
2. Otherwise `SILVI_CONNECTOR` in `app/.env`.
3. Otherwise the only connector installed.
4. Otherwise `csv`, when the app has it.

With more than one connector, each report names its own.

## When it is not set up

The app starts without any keys. A report whose connector is not chosen, or
whose keys are empty, shows **Not connected** and names the keys to set. It
runs nothing until they are there.

## One shape of rows

Every connector returns rows the same way: numbers as numbers, dates as
`YYYY-MM-DD` text, timestamps as `YYYY-MM-DD HH:MM:SS`. So the components read
a report the same way on every database.

## The SQL is the database's own

A report's SQL is written in its database's dialect; the data files and
SQLite share SQLite's. Most of it is common to all; dates differ. For
example, turning a date into a month key is `to_char(day, 'YYYY-MM')` on
Postgres and Redshift, `strftime('%Y-%m', day)` on SQLite and the data
files, `date_format(day, '%Y-%m')` on MySQL, `format_date('%Y-%m', day)` on
BigQuery and `format(day, 'yyyy-MM')` on SQL Server. Claude writes the
right one for the report's connector; the table is in
[The report file](/wiki/components/report-file).

## Read-only

Queries are read-only: `select` or `with`. `$from`, `$to` and input values
are passed as parameters, never pasted into the SQL text.
