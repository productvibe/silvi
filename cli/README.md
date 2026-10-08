# silvi CLI

Starts a Silvi reports app, adds and removes the connectors its reports
read from, updates it from the kit, and sets its theme. The code is copied
into the app and is the person's from then on.

```
node silvi.mjs init <folder> --connectors csv,postgres [--preset <code>]
node silvi.mjs list
node silvi.mjs add <connector>...
node silvi.mjs remove <connector>
node silvi.mjs update [--to <tag>]
node silvi.mjs apply --preset <code>
```

Run from GitHub, not npm (`silvi` there is someone else's): a new app is
`npx github:productvibe/silvi init my-reports --connectors csv --preset f0`,
the command create's Get Code copies, or puts in a prompt for the Claude
desktop app's Code tab.

The connectors, by group (`group` in `connector.json`, the order `list`
and every message use, `ORDER` in `lib/kit.mjs`):

- Data files: `excel`, `csv`, `json`
- Local database: `sqlite`
- Hosted database: `sqlserver`, `postgres`, `mysql`, `bigquery`, `redshift`

`init` refuses without `--connectors`, or with one the kit lacks, and names
them by group. `list` prints them under their group's heading, ✓ when
installed.

Options: `--kit <folder|git url>` (default: the kit in `silvi.json`, else
`$SILVI_KIT`, else `../code` beside the CLI in silvi-dev, else
`github:productvibe/silvi`), `--to <tag>`, `--dry-run`,
`--json`, `--no-install`. Run `list`, `add`, `remove`, `update` and
`apply` inside an app: they find it by its `silvi.json`.

- **The kit** is `code/`, in silvi-dev or in the public repo. A folder is read as it stands; a
  git URL, or `--to <tag>`, is cloned at that ref. What a file is follows
  from its path (`lib/kit.mjs`).
- **A connector** is the folder `app/src/connectors/<id>/` with its
  `connector.json` (`{ id, label, group, packages, devPackages, data,
  env }`). `init` and `add` copy the folder, add its `packages` to
  `dependencies` and its `devPackages` (`@types/*`) to `devDependencies`,
  and write its `env` into `app/.env.example`. `init` takes out of
  `app/package.json` the packages only the connectors left out use, with
  their `@types/*` (`pg` stays while `redshift` or `postgres` is in), but
  never one a base file imports (`exceljs`: the table's Excel download),
  and sets `SILVI_CONNECTOR` to the first connector named.
- **Seed data**: a connector's `data` files (paths under `app/`, such as
  `data/csv/sales.csv`) are copied with it by `init` and `add` only where
  the app has no such file, and never tracked, like reports: `update` and
  `remove` leave them alone.
- **`add`** skips a connector the app already has, and says so.
- **`remove`** deletes the folder, unless the person changed one of its
  files: then the folder stays and the changed files are listed. It takes
  the connector's lines out of `.env.example`, leaves its packages, and
  lists the reports (`app/src/reports/<id>/report.tsx`) whose `meta` says
  `connector: "<id>"`.
- **`silvi.json`** records the kit, the ref, the version, the preset, the
  connectors, and the hash of every file copied. That is how `update` and
  `remove` tell the kit's files from the person's edits.
- **`update`** replaces a file only the kit changed, keeps one only the
  person changed, and when both changed writes the kit's version beside it
  as `<file>.kit` to merge.
- **Data is never overwritten**: `app/data/`, `app/wiki/`,
  `app/src/reports/` and the package files are
  copied once, at `init`, and never tracked: `update` and `remove` leave
  them alone.
- **The theme** is `app/src/theme.css` and `app/src/theme.json`, written
  whole from a preset code by `lib/preset.mjs`, never copied from the kit.
  A code picks the theme, the colour, the font and the logo. The theme is
  the style: Neutral (the kit's own: hairline edges, 0.5rem corners), Power
  BI (its Fluent 2 base theme: white visuals with a hairline edge and 8px
  corners on a light grey page, titles inside, its data colours), Tableau
  (flat, square and dense on white, bold grey titles, the Tableau 10
  colours) or Google Looker (Looker Studio's default: white with no edges,
  black Roboto, grey table headers, its series colours), each a radius, any
  greys of its own over Neutral's and CSS rules over the components'
  `data-slot` in `theme.css`. The colour (Blue, Green, Purple, Orange, Pink,
  Grey) is the accent (buttons, checked controls, focus ring, the active
  menu row) and the charts' one-hue ramp; the font is System, Inter, Geist,
  IBM Plex Sans, Lora or Roboto. Picking a theme in create also picks the
  colour and font nearest its tool's own (Power BI: Blue, System, which is
  Segoe UI on Windows; Tableau: Blue, Inter; Looker: Blue, Roboto), and
  while the colour stays that one, a chart's series take the tool's own
  colours (`--series-*`). `f0` is the default look (Neutral, Blue, System,
  Layers logo). The logo (the mark beside the app name in the sidebar, one
  of 48 Lucide shapes in `LOGOS`, drawn duotone in the sidebar icons' grey)
  goes in `theme.json` (`logo`, with its drawing as `mark`), not
  `theme.css`. An older `e`, `d`, `c`, `b` or `a` code still reads, as
  Neutral (an `e` or `d` code's style kept where it still exists) with its
  accent as the colour (a `c` code's theme gives its pair's accent), its
  font kept, and its icon as the logo when it is one, else Layers;
  `update` rewrites it as an `f` code. `apply` keeps a theme the person changed and writes the
  preset's beside it as `theme.css.kit`.
- No dependencies, no prompts. Node 20.12 or later.

The design is `docs/silvi.md` (connectors, CLI) and `docs/cli.md` (the
rules `update` and `apply` keep).
