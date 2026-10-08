---
title: Connect your database
description: Point the app at your data files or database, with the keys each connector needs.
order: 1
---

Your reports read your data through a connector. There are three kinds:
data files you drop in a folder, a database file on your computer, and a
hosted database. A data-file connector needs no setup; the others need a
few values in the app's private settings file, `app/.env`. That file stays
on your computer and is never saved to git.

## Start

Tell Claude where your data is:

> "My sales are in a CSV export. Set the app up to read it."

> "Connect my Postgres database. Open app/.env for me and I will paste the
> connection string in myself."

You can also give Claude the values in the chat, but you do not have to:
pasting secrets into the file yourself keeps them out of the conversation.

Claude creates `app/.env` from `app/.env.example` if it does not exist yet,
shows you which lines to fill in, and checks the result. A key with a
default may be left out.

## Data files

The data-file connectors read the files in a folder of `app/data/` as
tables you query in SQL (SQLite's dialect). Each file is a table named after
it: `sales.csv` is `sales`. Names and column headers are made lowercase,
with anything but letters, digits and `_` turned into `_`: the header
`Order Date` is the column `order_date`. A column holding only numbers is
numbers; everything else is text. When you add, change or remove a file,
the next report you open reads it again. Each connector ships a small
sample file, `sales`, with four regions and their sales and orders.

### CSV files (`csv`)

Drop `.csv` files in `app/data/csv/`. The first line is the header; commas,
semicolons and tabs all work. This is the default connector: it needs no
`.env` at all.

> "Here is orders.csv. Put it in the CSV folder and make a report of orders
> per month."

| Key | What it is | Default |
|---|---|---|
| `CSV_DIR` | The folder, from `app/` | `data/csv` |

### Excel files (`excel`)

Drop `.xlsx` files in `app/data/excel/`. Every sheet is a table named
`<file>_<sheet>`: the sheet Regions of `sales.xlsx` is `sales_regions`. A
sheet's first row is its header; a formula reads as its last value.

> "I put budget.xlsx in the Excel folder. Which tables did it make?"

| Key | What it is | Default |
|---|---|---|
| `EXCEL_DIR` | The folder, from `app/` | `data/excel` |

### JSON files (`json`)

Drop `.json` files in `app/data/json/`. A file is a list of objects, or an
object with that list under `"rows"`. The columns are every key any object
has; a missing key is empty.

> "Read the export in app/data/json/visits.json and chart visits per day."

| Key | What it is | Default |
|---|---|---|
| `JSON_DIR` | The folder, from `app/` | `data/json` |

## Local database

### SQLite (`sqlite`)

A SQLite database file on your computer, opened read-only.

> "Read my SQLite database at app/data/shop.sqlite."

| Key | What it is | Default |
|---|---|---|
| `SQLITE_PATH` | The database file, from `app/` | `data/app.sqlite` |

## Hosted database

### SQL Server (`sqlserver`)

> "Connect our SQL Server. I will paste the password into app/.env myself."

| Key | What it is | Default |
|---|---|---|
| `SQLSERVER_HOST` | The server's address | |
| `SQLSERVER_PORT` | The port | 1433 |
| `SQLSERVER_DB` | The database name | |
| `SQLSERVER_USER` | Your database user | |
| `SQLSERVER_PASSWORD` | Its password | |
| `SQLSERVER_ENCRYPT` | Whether the connection is encrypted | true |

### Postgres (`postgres`)

> "Connect my Postgres database."

| Key | What it is |
|---|---|
| `POSTGRES_URL` | The connection string, `postgres://user:password@host:5432/database` |

### MySQL (`mysql`)

> "Connect our MySQL database. I have the connection string."

| Key | What it is |
|---|---|
| `MYSQL_URL` | The connection string, `mysql://user:password@host:3306/database` |

### BigQuery (`bigquery`)

BigQuery signs in with a service account key file. Ask whoever runs your
Google Cloud project for one with read access to BigQuery, save it on your
computer, and give Claude its path.

> "Connect BigQuery, project my-project. The key file is in my Downloads."

| Key | What it is | Default |
|---|---|---|
| `BIGQUERY_PROJECT` | The Google Cloud project the queries run (and are billed) in | |
| `GOOGLE_APPLICATION_CREDENTIALS` | The path to the service account key file | |
| `BIGQUERY_LOCATION` | Where the datasets are, such as `EU` or `US` | none |

### Amazon Redshift (`redshift`)

> "Connect our Redshift cluster."

| Key | What it is | Default |
|---|---|---|
| `REDSHIFT_HOST` | The cluster's endpoint, without the port | |
| `REDSHIFT_PORT` | The port | 5439 |
| `REDSHIFT_DB` | The database name | |
| `REDSHIFT_USER` | Your database user | |
| `REDSHIFT_PASSWORD` | Its password | |

The connection is encrypted and the server's certificate is checked.

## More than one database

When the app has more than one connector, `SILVI_CONNECTOR` in `app/.env`
names the default one, and each report can name its own in its file
(`connector: "redshift"` in its `meta`). Ask:

> "Make Redshift the default, and have the Orders report read Postgres."

## A database the app does not have yet

If your app was made without the connector you need, ask:

> "Add the SQL Server connector."

Claude adds it to the app and adds its keys to `app/.env.example`. Then fill
them in as above.

## Check it works

1. Open a report that uses the database. It no longer says **Not connected**.
2. Ask Claude: "Open every report and check its figures load." A query the
   database refuses shows its message on the page.

If a report still says Not connected, it names the keys it is missing. Read
[Fix problems](/wiki/guides/fix-problems).

> [!NOTE]
> **Use a read-only user.** The reports only read, and the app refuses any
> SQL that writes. Even so, give the app a database user that can only read
> the tables your reports need.
