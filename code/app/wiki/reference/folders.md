---
title: Folders
description: Where each kind of file lives in your app.
order: 2
---

```
CLAUDE.md                    how Claude works on this app
README.md                    what the app is, the report format, the connectors
product/DESIGN.md            the table rules
app/                         the app itself
  .env                       your connector keys (private, never in git)
  .env.example               every installed connector's keys, empty
  wiki/                      this wiki: one file per page, a folder per section
  public/wiki/               images for the wiki
  src/reports/<id>/          one report: report.tsx and its .sql files
  src/metrics/               named metrics (metrics.ts) and the dictionary
  src/connectors/            the connectors, one folder each
  src/components/report-kit/ the report-kit: the components and the checks
```

## What you change

Ask Claude to change these; they are your content:

| Folder | Holds |
|---|---|
| `app/src/reports/` | Your reports |
| `app/src/metrics/` | Your named metrics |
| `app/wiki/` | This wiki and your own pages |
| `app/.env` | Your database keys |

## What the kit owns

The rest is the app's code. It changes when the kit is updated (see
[Kit updates](/wiki/advanced/kit-updates)) or when content cannot do what
you need. Claude changes it only then.
