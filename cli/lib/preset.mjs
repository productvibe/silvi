// The theme: the options a Silvi app's look is picked from, the preset code
// that packs a pick into a few characters, and the theme.css it gives.
//
// One copy of the theme data: the CLI writes app/src/theme.css and
// theme.json from it, and create's configurator imports this file for its
// pickers and its preview. The logos live here too: theme.json carries the
// picked one's drawing, which the kit's mark draws
// (components/brand/app-mark.tsx), so the list is in this file alone.
// Plain JavaScript with no imports, so it runs in Node and in the browser.
//
// Copied from shadcn: the Neutral greys from apps/v4/registry/themes.ts and
// the merge from its buildRegistryTheme; the code from
// packages/registry/src/preset/preset.ts, with our option lists and version
// letter "d" ("a", "b" and "c" codes still decode).

// ── options ─────────────────────────────────────────────────────────────────
// Each list's first entry is the default. Never reorder a list, only append:
// a code is a list of indexes. Reordering or dropping takes a new version
// letter and a LEGACY entry for the old one.

/** The app's own tokens, which no shadcn base sets: the overlay lines, inline
 *  code, the block and grid grounds, icons, faint text and the shortcut chip.
 *  Measured on app.notion.com (2026-09-29); written under every base.
 *  `notes` are the comments theme.css carries above a token. */
const APP_TOKENS = {
  light: {
    "line-1": "oklch(0.82 0.09 0)",
    "line-2": "oklch(0.68 0.09 195)",
    "line-3": "oklch(0.74 0.11 70)",
    "line-4": "oklch(0.66 0.1 285)",
    "code-inline": "rgb(235 87 87)",
    "code-inline-bg": "rgb(135 131 120 / 15%)",
    block: "rgb(249 248 247)",
    grid: "rgb(240 239 237)",
    icon: "rgb(142 139 134)",
    faint: "rgb(161 158 153)",
    kbd: "rgb(42 28 0 / 7%)",
    "kbd-foreground": "rgb(142 139 134)",
  },
  dark: {
    "line-1": "oklch(0.86 0.09 0)",
    "line-2": "oklch(0.78 0.09 195)",
    "line-3": "oklch(0.82 0.11 70)",
    "line-4": "oklch(0.76 0.1 285)",
    "code-inline": "rgb(255 115 105)",
    "code-inline-bg": "rgb(135 131 120 / 15%)",
    block: "rgb(255 255 255 / 3%)",
    grid: "rgb(255 255 255 / 7%)",
    icon: "rgb(255 255 255 / 46%)",
    faint: "rgb(255 255 255 / 28%)",
    kbd: "rgb(255 255 255 / 9%)",
    "kbd-foreground": "rgb(255 255 255 / 46%)",
  },
  notes: {
    light: {
      "line-1": [
        "Overlay LINES only (a rate drawn over the grey bars). Muted, one hue each,",
        "so two or three rates on one chart stay apart where a grey ramp would read",
        "as the same series twice. Marks in a plot area are otherwise grey — see",
        "product/DESIGN-REPORTS.md §5.",
      ],
      "code-inline": [
        "Notion's inline code (red on a warm grey chip) and its code-block and",
        "callout ground, rgba(66 35 3 / 0.03) flattened onto white.",
      ],
      grid: [
        "Notion's database-table lines, rgba(42 28 0 / 0.07) on white: a step",
        "lighter than --border, since a table draws one in every row and",
        "between every column.",
      ],
      icon: [
        "Notion's sidebar and toolbar glyphs: one light grey that does not",
        "change when the row is selected or hovered.",
      ],
      faint: [
        "Notion's third text grey: sidebar section labels, the search box's",
        "placeholder. And its shortcut chip.",
      ],
    },
    dark: {
      "line-1": [
        "A step lighter than the light theme's, to carry over a dark ground.",
      ],
    },
  },
}

/** The greys of every surface: shadcn's Neutral base colour (themes.ts),
 *  under every style; a style merges any greys of its own over them. The
 *  app's own tokens (APP_TOKENS) go under every one. */
const NEUTRAL = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.269 0 0)",
    sidebar: "oklch(0.985 0 0)",
    "sidebar-foreground": "oklch(0.145 0 0)",
    "sidebar-primary": "oklch(0.205 0 0)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.97 0 0)",
    "sidebar-accent-foreground": "oklch(0.205 0 0)",
    "sidebar-border": "oklch(0.922 0 0)",
    "sidebar-ring": "oklch(0.708 0 0)",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.556 0 0)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.269 0 0)",
    sidebar: "oklch(0.205 0 0)",
    "sidebar-foreground": "oklch(0.985 0 0)",
    "sidebar-primary": "oklch(0.488 0.243 264.376)",
    "sidebar-primary-foreground": "oklch(0.985 0 0)",
    "sidebar-accent": "oklch(0.269 0 0)",
    "sidebar-accent-foreground": "oklch(0.985 0 0)",
    "sidebar-border": "oklch(1 0 0 / 10%)",
    "sidebar-ring": "oklch(0.556 0 0)",
  },
}

/** The overlays that float over the page: dialogs, menus and popovers. */
const OVERLAYS = [
  "dialog-content",
  "alert-dialog-content",
  "popover-content",
  "dropdown-menu-content",
  "select-content",
  "combobox-content",
  "hover-card-content",
  "context-menu-content",
]
  .map((s) => `[data-slot="${s}"]`)
  .join(",\n")

/** The surfaces: cards, a report's widgets (a table and a KPI tile framed,
 *  `.border`; a chart open, without) and the overlays. */
const SURFACES = `[data-slot="card"],\n[data-slot="widget"],\n${OVERLAYS}`

/** The buttons that draw an edge or a fill (default, secondary, outline);
 *  ghost and link buttons stay bare in every style. */
const SOLID_BUTTONS = `[data-slot="button"]:is(.bg-primary, .bg-secondary, .border-border)`

/** The fields: inputs, text areas, select triggers, input groups, and the
 *  sidebar's search box (a menu button with an edge). */
const FIELDS = [
  '[data-slot="input"]',
  '[data-slot="textarea"]',
  '[data-slot="select-trigger"]',
  '[data-slot="input-group"]',
  '[data-slot="sidebar"] [data-slot="sidebar-menu-button"].border',
].join(",\n")

/** Style: the look of a reporting tool people know, apart from the logo.
 *  Each is a radius, any greys of its own (merged over Neutral's), its own
 *  colour (the accent, the chart ramp and, but for Neutral, the tool's
 *  categorical chart colours as `--series-1` … `--series-5`), its own font,
 *  and a few rules keyed on the components' `data-slot`, which theme.css
 *  carries after the tokens. `colour` and `font` are the existing picks
 *  nearest the tool's own, which picking the style sets (create's panel);
 *  `series` holds while the colour is the style's. The shadcn component files
 *  are never forked: a style is CSS over them. Neutral, the default, is the
 *  kit's own look and adds no rules. */
export const STYLES = [
  {
    id: "neutral",
    label: "Neutral",
    radius: "0.5rem",
    note: "hairline edges, 0.5rem corners, soft shadows",
    colour: "blue",
    font: "system",
    css: "",
  },
  {
    id: "powerbi",
    label: "Power BI",
    radius: "0.5rem",
    note:
      "Power BI's Fluent 2 base theme (Fluent2-CY26SU08, the default for new " +
      "reports): white visuals with a 1px #E6E6E6 edge, 8px corners and 16px " +
      "padding on a light grey page, the title and subtitle inside the visual, " +
      "KPI cards with a small grey label over a semibold number, faint solid " +
      "gridlines, square bars, its data colours and #118DFF accent, Segoe UI",
    // The theme's greys: #242424 foreground, #616161 secondary, #E6E6E6
    // edges and wallpaper, #F0F0F0 gridlines; the page is its #FAFAFA at 14%
    // transparency over the wallpaper. The dark ones are Power BI's dark
    // theme's.
    light: {
      background: "rgb(247 247 247)",
      foreground: "rgb(36 36 36)",
      "card-foreground": "rgb(36 36 36)",
      "popover-foreground": "rgb(36 36 36)",
      "muted-foreground": "rgb(97 97 97)",
      muted: "rgb(245 245 245)",
      accent: "rgb(245 245 245)",
      border: "rgb(230 230 230)",
      input: "rgb(199 199 199)",
      grid: "rgb(240 240 240)",
      // The report's Pages pane, measured on Microsoft Learn's screenshots
      // of the Power BI service: white, the selected page on #EBEBEB.
      sidebar: "rgb(255 255 255)",
      "sidebar-border": "rgb(224 224 224)",
      "sidebar-accent": "rgb(235 235 235)",
    },
    dark: {
      background: "rgb(27 26 25)",
      card: "rgb(41 40 39)",
      popover: "rgb(41 40 39)",
      sidebar: "rgb(32 31 30)",
      grid: "rgb(255 255 255 / 8%)",
    },
    // Blue nearest its #118DFF accent; System is Segoe UI on Windows.
    colour: "blue",
    series: ["#118DFF", "#12239E", "#E66C37", "#6B007B", "#E044A7"],
    font: "system",
    barRadius: 0,
    // The theme's categoryAxis innerPadding 50: a column as wide as the gap
    // between two (Recharts takes the gap per side, so 25%).
    barGap: "25%",
    css: `/* A report page has no heading on the canvas: its name is the page
   tab's (here the last crumb). */
[data-slot="report-title"] {
  display: none;
}
/* The visual container: a block's whole section, its title inside. White,
   a 1px edge, 8px corners, 14/16px padding, no shadow. The widget in it
   loses its own frame. */
section:has(> [data-slot="widget"]) {
  padding: 14px 16px 16px;
  background-color: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
[data-slot="card"] {
  border-color: var(--border);
  box-shadow: none;
}
section > [data-slot="widget"] {
  padding: 0;
  border: 0;
  border-radius: 0;
  background-color: transparent;
  box-shadow: none;
}
${OVERLAYS} {
  border-color: var(--border);
  box-shadow: 0 6.4px 14.4px rgb(0 0 0 / 13%), 0 1.2px 3.6px rgb(0 0 0 / 11%);
}
/* Title Segoe UI Semibold in the text colour, subtitle regular in the
   secondary grey (Microsoft's Fluent 2 example report, side by side). */
section:has(> [data-slot="widget"]) h3,
[data-slot="card-title"] {
  font-size: 1.0625rem;
  line-height: 1.5rem;
  font-weight: 600;
  color: var(--foreground);
}
section:has(> [data-slot="widget"]) h3 + p {
  font-size: 0.8125rem;
  line-height: 1.125rem;
  color: var(--muted-foreground);
}
/* Charts: no hover band behind a column; data labels small and grey. */
.recharts-tooltip-cursor {
  display: none;
}
.recharts-value-labels text,
.recharts-label-list text {
  fill: var(--muted-foreground);
  font-size: 11px;
}
/* The visual header: its icons show only while the visual is hovered or
   one of them has focus. */
section > div:not([data-slot]) > div:last-child:not(:only-child),
[data-slot="widget"]:has(.text-3xl) > div:first-child > div:last-child:not(:only-child) {
  opacity: 0;
  transition: opacity 0.1s;
}
section:is(:hover, :focus-within) > div:not([data-slot]) > div:last-child,
[data-slot="widget"]:is(:hover, :focus-within) > div:first-child > div:last-child {
  opacity: 1;
}
/* A card: compact, the label small and grey over the value, Segoe UI
   Semibold 21pt. */
section:has(> [data-slot="widget"] .text-3xl) {
  padding: 10px 16px 12px;
}
[data-slot="widget"]:has(.text-3xl) > div:first-child > span {
  font-size: 0.8125rem;
  color: var(--muted-foreground);
}
[data-slot="widget"] .text-3xl {
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--foreground);
}
/* Tables: small and dense (the theme's rowPadding 4), headers over a rule
   in the text colour, no row or column lines. */
[data-slot="table"] {
  font-size: 0.8125rem;
}
[data-slot="table-head"] {
  height: auto;
  padding-block: 4px;
}
[data-slot="table-cell"] {
  padding-block: 4px;
}
[data-slot="table-head"] {
  font-weight: 400;
  color: var(--foreground);
}
[data-slot="table-header"] [data-slot="table-row"] {
  border-bottom: 1px solid var(--foreground);
}
[data-slot="table-body"] [data-slot="table-row"] {
  border-color: transparent;
}
[data-slot="table-head"],
[data-slot="table-cell"] {
  border-inline-width: 0;
}
/* Columns are solid in the data colour, a bar under a line too. */
.recharts-bar-rectangle path {
  fill-opacity: 1;
}
/* Gridlines: solid, #F0F0F0. */
.recharts-cartesian-grid line {
  stroke: var(--grid);
}
/* Fluent fields: a hairline box with a darker underline. */
${FIELDS} {
  border-color: var(--border);
  border-bottom-color: var(--input);
}
/* The Pages pane's selected page: a grey row in semibold text with a short
   rounded black bar at its left; its icon in the text colour, not the
   accent. */
[data-slot="sidebar-menu-button"][data-active] {
  position: relative;
  font-weight: 600;
  color: var(--foreground);
  background-color: var(--sidebar-accent);
}
[data-slot="sidebar-menu-button"][data-active]::before {
  content: "";
  position: absolute;
  left: 0;
  top: 22%;
  bottom: 22%;
  width: 3px;
  border-radius: 2px;
  background-color: var(--foreground);
}
[data-slot="sidebar-menu-button"][data-active] svg {
  color: var(--foreground);
}`,
  },
  {
    id: "tableau",
    label: "Tableau",
    radius: "0",
    note:
      "Tableau's dashboards (measured on Tableau's own Superstore viz): flat on " +
      "white, square corners, bold grey sheet titles, dense crosstabs with " +
      "faint row lines and no banding, square bars, the Tableau 10 colours, " +
      "Tableau Book with Arial behind it",
    light: {
      foreground: "rgb(51 51 51)",
      "card-foreground": "rgb(51 51 51)",
      "popover-foreground": "rgb(51 51 51)",
      "muted-foreground": "rgb(85 85 85)",
      border: "rgb(212 212 212)",
      input: "rgb(128 128 128)",
      grid: "rgb(240 240 240)",
      sidebar: "rgb(240 240 240)",
      "sidebar-border": "rgb(212 212 212)",
      "sidebar-accent": "rgb(225 225 225)",
    },
    // Blue nearest its #4E79A7; Inter nearest Tableau Book (Benton Sans),
    // which is not free to bundle.
    colour: "blue",
    series: ["#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F"],
    font: "inter",
    barRadius: 0,
    css: `/* Sheets sit flat on the dashboard: no edges, no shadows. */
[data-slot="card"],
[data-slot="widget"] {
  border-color: transparent;
  box-shadow: none;
}
[data-slot="widget"].p-4 {
  padding: 0.5rem 0.25rem;
}
/* Sheet titles, KPI labels and filter labels: bold, in the text grey. */
section:has(> [data-slot="widget"]) h3,
[data-slot="card-title"],
[data-slot="label"],
[data-slot="field-label"],
[data-slot="widget"] > div:first-child > span:first-child {
  font-weight: 700;
  color: var(--muted-foreground);
}
[data-slot="widget"] .text-3xl {
  font-weight: 700;
  letter-spacing: 0;
  color: var(--muted-foreground);
}
/* A crosstab: bold headers, small dense rows, faint row lines, no bands. */
[data-slot="table"] {
  font-size: 0.75rem;
}
[data-slot="table-head"] {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--foreground);
}
[data-slot="table-cell"] {
  padding-block: 0.25rem;
}
[data-slot="table-head"],
[data-slot="table-cell"] {
  border-inline-color: transparent;
}
[data-slot="table-body"] [data-slot="table-row"] {
  border-color: var(--grid);
}
${SOLID_BUTTONS}:not(:focus-visible),
${FIELDS.replaceAll(",\n", ":not(:focus-visible),\n")}:not(:focus-visible) {
  box-shadow: none;
}
${OVERLAYS} {
  box-shadow: 0 2px 6px rgb(0 0 0 / 16%);
}
[data-slot="sidebar-menu-button"][data-active] {
  font-weight: 700;
}`,
  },
  {
    id: "looker",
    label: "Google Looker",
    radius: "0",
    note:
      "Looker Studio's default theme (as its report sends a component): white " +
      "page and components with no edge, black Roboto text, #E0E0E0 table " +
      "headers, #D1D1D1 gridlines, square bars, its series colours; Google's " +
      "pill buttons and menu highlight around it",
    light: {
      foreground: "rgb(0 0 0)",
      "card-foreground": "rgb(0 0 0)",
      "popover-foreground": "rgb(0 0 0)",
      "muted-foreground": "rgb(95 99 104)",
      border: "rgb(218 220 224)",
      input: "rgb(218 220 224)",
      grid: "rgb(209 209 209)",
      block: "rgb(224 224 224)",
      sidebar: "rgb(255 255 255)",
      "sidebar-border": "rgb(218 220 224)",
      "sidebar-accent": "rgb(241 243 244)",
    },
    dark: {
      background: "rgb(32 33 36)",
      card: "rgb(32 33 36)",
      popover: "rgb(41 42 45)",
      sidebar: "rgb(32 33 36)",
      block: "rgb(60 64 67)",
    },
    colour: "blue",
    series: ["#0072F0", "#00B6CB", "#F10096", "#F66D00", "#FFA800"],
    font: "roboto",
    barRadius: 0,
    css: `/* Components: no edge, no shadow, square, on the white page. */
[data-slot="card"],
[data-slot="widget"] {
  border-color: transparent;
  box-shadow: none;
}
section:has(> [data-slot="widget"]) h3,
[data-slot="card-title"] {
  font-weight: 500;
  color: var(--foreground);
}
/* A table's header row in the theme's accent fill. */
[data-slot="table-header"] [data-slot="table-row"] {
  background-color: var(--block);
}
[data-slot="table-head"] {
  font-weight: 500;
  color: var(--foreground);
}
.recharts-cartesian-grid line {
  stroke: var(--grid);
}
/* Google's app chrome: pill buttons and a pill on the selected menu row. */
[data-slot="button"] {
  border-radius: 9999px;
}
${OVERLAYS} {
  border-color: transparent;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(60 64 67 / 30%), 0 4px 8px 3px rgb(60 64 67 / 15%);
}
[data-slot="sidebar-menu-button"] {
  border-radius: 9999px;
}
[data-slot="sidebar-menu-button"][data-active] {
  font-weight: 500;
  color: var(--primary);
}`,
  },
]

/** The highlights in the picked colour, in every style: the active menu
 *  row takes a wash of --primary and its icon the colour itself, so
 *  Settings → Appearance's accent moves it with the buttons. */
const HIGHLIGHTS = `/* The active menu row in the colour (--primary, so Settings → Appearance's
   accent moves it too). */
[data-slot="sidebar-menu-button"][data-active] {
  background-color: color-mix(in oklab, var(--primary) 12%, transparent);
}
[data-slot="sidebar-menu-button"][data-active] svg {
  color: var(--primary);
}`

/** Colour: the highlights (accent: buttons, checked controls, the focus
 *  ring, the active menu row) and the report charts (tint: a five-step ramp
 *  of the one hue) together. The ids are app.css's `[data-accent]` and
 *  `[data-tint]` (Settings → Appearance, which overrides either per
 *  viewer); the accents are Notion's text colours, Blue the default. */
export const COLOURS = [
  colour("blue", "Blue", 250, [
    "rgb(35 131 226)",
    "rgb(255 255 255)",
    "rgb(35 131 226 / 57%)",
  ]),
  colour(
    "green",
    "Green",
    155,
    ["rgb(68 131 97)", "rgb(255 255 255)", "rgb(68 131 97 / 57%)"],
    ["rgb(82 158 114)", "rgb(255 255 255)", "rgb(82 158 114 / 57%)"],
  ),
  colour(
    "purple",
    "Purple",
    300,
    ["rgb(144 101 176)", "rgb(255 255 255)", "rgb(144 101 176 / 57%)"],
    ["rgb(157 104 211)", "rgb(255 255 255)", "rgb(157 104 211 / 57%)"],
  ),
  colour(
    "orange",
    "Orange",
    55,
    ["rgb(217 115 13)", "rgb(255 255 255)", "rgb(217 115 13 / 57%)"],
    ["rgb(203 123 55)", "rgb(255 255 255)", "rgb(203 123 55 / 57%)"],
  ),
  colour(
    "pink",
    "Pink",
    350,
    ["rgb(193 76 138)", "rgb(255 255 255)", "rgb(193 76 138 / 57%)"],
    ["rgb(209 87 150)", "rgb(255 255 255)", "rgb(209 87 150 / 57%)"],
  ),
  colour(
    "grey",
    "Grey",
    null,
    ["rgb(44 44 43)", "rgb(255 255 255)", "rgb(44 44 43 / 40%)"],
    ["rgb(212 212 212)", "rgb(25 25 25)", "rgb(212 212 212 / 40%)"],
  ),
]

/** One colour: its accent (light, and dark when it differs) and its chart
 *  ramp, the hue in five steps light to dark; no hue is the grey ramp. A
 *  style's own colour may add `series`, its tool's categorical colours. */
function colour(
  id,
  label,
  hue,
  [primary, fg, ring],
  dark = [primary, fg, ring],
  series,
) {
  const vars = ([p, f, r]) => ({
    primary: p,
    "primary-foreground": f,
    ring: r,
    "sidebar-ring": r,
  })
  const ramp =
    hue === null
      ? [
          "oklch(0.87 0 0)",
          "oklch(0.556 0 0)",
          "oklch(0.439 0 0)",
          "oklch(0.371 0 0)",
          "oklch(0.269 0 0)",
        ]
      : [
          [0.87, 0.05],
          [0.72, 0.09],
          [0.6, 0.11],
          [0.49, 0.1],
          [0.37, 0.08],
        ].map(([l, c]) => `oklch(${l} ${c} ${hue})`)
  return {
    id,
    label,
    swatch: primary,
    ramp,
    series,
    light: vars([primary, fg, ring]),
    dark: vars(dark),
  }
}

/** Font: the system face (Notion's stacks: SF Pro on a Mac, Segoe UI on
 *  Windows), or a webfont from `@fontsource-variable`, which the CLI adds
 *  to the app's packages (the families are shadcn's,
 *  apps/v4/lib/font-definitions.ts; Roboto is Looker's own). */
export const FONTS = [
  {
    id: "system",
    label: "System",
    family:
      'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Display",\n    "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif,\n    "Segoe UI Emoji", "Segoe UI Symbol"',
  },
  webfont("inter", "Inter", "'Inter Variable', sans-serif"),
  webfont("geist", "Geist", "'Geist Variable', sans-serif"),
  webfont(
    "ibm-plex-sans",
    "IBM Plex Sans",
    "'IBM Plex Sans Variable', sans-serif",
  ),
  webfont("lora", "Lora", "'Lora Variable', serif"),
  webfont("roboto", "Roboto", "'Roboto Variable', sans-serif"),
]

function webfont(id, label, family) {
  return {
    id,
    label,
    family,
    package: `@fontsource-variable/${id}`,
    version: "^5.3.0",
  }
}

/** Logo: the app's mark, at the top of the sidebar beside its name, drawn
 *  duotone in the sidebar icons' grey (a 1.65px round stroke over an 18%
 *  fill of it) on a 24px grid. Lucide icons (ISC, lucide.dev) whose
 *  shapes are closed and read right filled, each `svg` its elements as
 *  Lucide draws them; Layers, the default, is the kit's own drawing,
 *  the mark before logos (its strokes set their own width). `tags` are
 *  extra words the configurator's search matches. theme.json carries the
 *  pick (`logo`) and its drawing (`mark`); theme.css does not. */
export const LOGOS = [
  logo("layers", "Layers", "stack default", [
    ["path", { d: "M12 2.75 21 7.5 12 12.25 3 7.5Z", "stroke-width": "1.5" }],
    [
      "path",
      { d: "M3 12 12 16.75 21 12", fill: "none", "stroke-width": "2.25" },
    ],
    [
      "path",
      { d: "M3 16.5 12 21.25 21 16.5", fill: "none", "stroke-width": "2.25" },
    ],
  ]),
  logo("database", "Database", "data storage", [
    ["ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }],
    ["path", { d: "M3 5V19A9 3 0 0 0 21 19V5" }],
    ["path", { d: "M3 12A9 3 0 0 0 21 12" }],
  ]),
  logo("building", "Building", "office company", [
    ["path", { d: "M10 12h4" }],
    ["path", { d: "M10 8h4" }],
    ["path", { d: "M14 21v-3a2 2 0 0 0-4 0v3" }],
    [
      "path",
      {
        d: "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2",
      },
    ],
    ["path", { d: "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" }],
  ]),
  logo("star", "Star", "favourite", [
    [
      "path",
      {
        d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      },
    ],
  ]),
  logo("heart", "Heart", "love", [
    [
      "path",
      {
        d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
      },
    ],
  ]),
  logo("shield", "Shield", "security", [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      },
    ],
  ]),
  logo("circle", "Circle", "dot round", [
    ["circle", { cx: "12", cy: "12", r: "10" }],
  ]),
  logo("square", "Square", "box", [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ]),
  logo("triangle", "Triangle", "", [
    [
      "path",
      {
        d: "M13.73 4a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",
      },
    ],
  ]),
  logo("hexagon", "Hexagon", "package box", [
    [
      "path",
      {
        d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
      },
    ],
  ]),
  logo("diamond", "Diamond", "", [
    [
      "path",
      {
        d: "M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z",
      },
    ],
  ]),
  logo("bookmark", "Bookmark", "save", [
    [
      "path",
      {
        d: "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",
      },
    ],
  ]),
  logo("flag", "Flag", "", [
    [
      "path",
      {
        d: "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",
      },
    ],
  ]),
  logo("folder", "Folder", "files", [
    [
      "path",
      {
        d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      },
    ],
  ]),
  logo("briefcase", "Briefcase", "work business", [
    ["path", { d: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" }],
    ["rect", { width: "20", height: "14", x: "2", y: "6", rx: "2" }],
  ]),
  logo("house", "House", "home", [
    ["path", { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }],
    [
      "path",
      {
        d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
      },
    ],
  ]),
  logo("cloud", "Cloud", "weather", [
    ["path", { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" }],
  ]),
  logo("zap", "Zap", "lightning bolt power", [
    [
      "path",
      {
        d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      },
    ],
  ]),
  logo("flame", "Flame", "fire", [
    [
      "path",
      {
        d: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",
      },
    ],
  ]),
  logo("droplet", "Droplet", "water drop", [
    [
      "path",
      {
        d: "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z",
      },
    ],
  ]),
  logo("leaf", "Leaf", "nature plant", [
    [
      "path",
      {
        d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",
      },
    ],
    ["path", { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" }],
  ]),
  logo("gem", "Gem", "diamond jewel", [
    ["path", { d: "M10.5 3 8 9l4 13 4-13-2.5-6" }],
    [
      "path",
      {
        d: "M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z",
      },
    ],
    ["path", { d: "M2 9h20" }],
  ]),
  logo("crown", "Crown", "king", [
    [
      "path",
      {
        d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
      },
    ],
    ["path", { d: "M5 21h14" }],
  ]),
  logo("trophy", "Trophy", "award cup win", [
    ["path", { d: "M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978" }],
    ["path", { d: "M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978" }],
    ["path", { d: "M18 9h1.5a1 1 0 0 0 0-5H18" }],
    ["path", { d: "M4 22h16" }],
    ["path", { d: "M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" }],
    ["path", { d: "M6 9H4.5a1 1 0 0 1 0-5H6" }],
  ]),
  logo("award", "Award", "badge medal", [
    [
      "path",
      {
        d: "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",
      },
    ],
    ["circle", { cx: "12", cy: "8", r: "6" }],
  ]),
  logo("rocket", "Rocket", "launch", [
    ["path", { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" }],
    [
      "path",
      {
        d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09",
      },
    ],
    [
      "path",
      {
        d: "M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z",
      },
    ],
    ["path", { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05" }],
  ]),
  logo("bell", "Bell", "notification", [
    ["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }],
    [
      "path",
      {
        d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
      },
    ],
  ]),
  logo("message-square", "Message", "chat comment", [
    [
      "path",
      {
        d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
      },
    ],
  ]),
  logo("message-circle", "Speech bubble", "chat comment", [
    [
      "path",
      {
        d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",
      },
    ],
  ]),
  logo("calendar", "Calendar", "date", [
    ["path", { d: "M8 2v4" }],
    ["path", { d: "M16 2v4" }],
    ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }],
    ["path", { d: "M3 10h18" }],
  ]),
  logo("map-pin", "Map pin", "location place", [
    [
      "path",
      {
        d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
      },
    ],
    ["circle", { cx: "12", cy: "10", r: "3" }],
  ]),
  logo("tag", "Tag", "label price", [
    [
      "path",
      {
        d: "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",
      },
    ],
    ["circle", { cx: "7.5", cy: "7.5", r: ".5", "fill-opacity": "1" }],
  ]),
  logo("ticket", "Ticket", "", [
    [
      "path",
      {
        d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",
      },
    ],
    ["path", { d: "M13 5v2" }],
    ["path", { d: "M13 17v2" }],
    ["path", { d: "M13 11v2" }],
  ]),
  logo("file", "File", "document page", [
    [
      "path",
      {
        d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      },
    ],
    ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
  ]),
  logo("moon", "Moon", "night", [
    [
      "path",
      {
        d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
      },
    ],
  ]),
  logo("apple", "Apple", "fruit", [
    ["path", { d: "M12 6.528V3a1 1 0 0 1 1-1h0" }],
    [
      "path",
      {
        d: "M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21",
      },
    ],
  ]),
  logo("feather", "Feather", "write", [
    [
      "path",
      {
        d: "M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z",
      },
    ],
    ["path", { d: "M16 8 2 22" }],
    ["path", { d: "M17.5 15H9" }],
  ]),
  logo("mountain", "Mountain", "", [
    ["path", { d: "m8 3 4 8 5-5 5 15H2L8 3z" }],
  ]),
  logo("tree", "Tree", "pine forest", [
    [
      "path",
      {
        d: "m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z",
      },
    ],
    ["path", { d: "M12 22v-3" }],
  ]),
  logo("sparkle", "Sparkle", "star shine", [
    [
      "path",
      {
        d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
      },
    ],
  ]),
  logo("spade", "Spade", "cards", [
    ["path", { d: "M12 18v4" }],
    [
      "path",
      {
        d: "M2 14.499a5.5 5.5 0 0 0 9.591 3.675.6.6 0 0 1 .818.001A5.5 5.5 0 0 0 22 14.5c0-2.29-1.5-4-3-5.5l-5.492-5.312a2 2 0 0 0-3-.02L5 8.999c-1.5 1.5-3 3.2-3 5.5",
      },
    ],
  ]),
  logo("club", "Club", "cards", [
    [
      "path",
      {
        d: "M17.28 9.05a5.5 5.5 0 1 0-10.56 0A5.5 5.5 0 1 0 12 17.66a5.5 5.5 0 1 0 5.28-8.6Z",
      },
    ],
    ["path", { d: "M12 17.66L12 22" }],
  ]),
  logo("puzzle", "Puzzle", "piece", [
    [
      "path",
      {
        d: "M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z",
      },
    ],
  ]),
  logo("plane", "Plane", "travel flight", [
    [
      "path",
      {
        d: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
      },
    ],
  ]),
  logo("pie-chart", "Pie chart", "report", [
    [
      "path",
      {
        d: "M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",
      },
    ],
    ["path", { d: "M21.21 15.89A10 10 0 1 1 8 2.83" }],
  ]),
  logo("lock", "Lock", "secure", [
    ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
    ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }],
  ]),
  logo("landmark", "Landmark", "bank museum", [
    ["path", { d: "M10 18v-7" }],
    [
      "path",
      {
        d: "M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z",
      },
    ],
    ["path", { d: "M14 18v-7" }],
    ["path", { d: "M18 18v-7" }],
    ["path", { d: "M3 22h18" }],
    ["path", { d: "M6 18v-7" }],
  ]),
  logo("factory", "Factory", "industry", [
    ["path", { d: "M12 16h.01" }],
    ["path", { d: "M16 16h.01" }],
    [
      "path",
      {
        d: "M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z",
      },
    ],
    ["path", { d: "M8 16h.01" }],
  ]),
]

function logo(id, label, tags, svg) {
  return { id, label, tags, svg }
}

// ── the code ────────────────────────────────────────────────────────────────
// Each pick is an index into its list, bit-packed into one integer, written in
// base62 behind the version letter. Only append fields, with their default at
// index 0, and stay under 53 bits: an appended field reads as its default in
// older codes of the same letter. Any other change to the fields bumps the
// letter; older letters stay readable (LEGACY).

export const PRESET_FIELDS = [
  { key: "style", label: "Theme", options: STYLES, bits: 4 },
  { key: "colour", label: "Colour", options: COLOURS, bits: 4 },
  { key: "font", label: "Font", options: FONTS, bits: 4 },
  { key: "logo", label: "Logo", options: LOGOS, bits: 6 },
]

export const DEFAULT_PRESET = Object.fromEntries(
  PRESET_FIELDS.map((f) => [f.key, f.options[0].id]),
)

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const VERSION = "f"

/** The styles, colours and fonts of "d" codes, by index; a style dropped
 *  since reads as Neutral. */
const D_STYLES = ["neutral", "neo-brutalist", "soft", "minimal"]
const D_COLOURS = ["blue", "green", "purple", "orange", "pink", "grey"]
/** The colours and fonts of "e" codes, by index ("theme", the style's
 *  own, and the faces dropped since read as the default). */
const E_COLOURS = ["theme", "blue", "green", "purple", "orange", "pink", "grey"]
const E_FONTS = [
  "theme",
  "system",
  "inter",
  "geist",
  "ibm-plex-sans",
  "lora",
  "segoe-ui",
  "tableau",
  "roboto",
]
/** The fonts of "a" to "d" codes, by index. */
const OLD_FONTS = ["system", "inter", "geist", "ibm-plex-sans", "lora"]
/** The accents of "a" and "b" codes, by index; the colour they read as. */
const OLD_ACCENTS = ["blue", "grey", "green", "purple", "orange", "pink"]
/** The accents of "c" codes' curated themes (base · accent), by index. */
const OLD_THEME_ACCENTS = [
  "blue",
  "orange",
  "green",
  "purple",
  "green",
  "blue",
  "pink",
]
/** The icons of "b" and "c" codes, by index; one not among the logos reads
 *  as the default. Building is now Lucide's building-2, the fuller shape. */
const OLD_ICONS = [
  "layers",
  "chart",
  "pie-chart",
  "gauge",
  "database",
  "table",
  "trending-up",
  "target",
  "briefcase",
  "building",
  "globe",
  "sparkles",
]

/** Codes of an older letter: their fields, each `{ key, bits }` with `ids`
 *  when its list differs from today's (null: a field dropped since). Every
 *  older code reads as the Neutral style (a "d" code's Neutral kept, its
 *  Neo-brutalist, Soft and Minimal dropped since), with its accent as the
 *  colour (a "c" code's theme gives its pair's accent; the greys and the
 *  charts pick are dropped), its font kept, and its icon as the logo when
 *  that is one, else Layers. "a" had no icon. */
const LEGACY = {
  a: [
    { key: null, bits: 5 },
    { key: "colour", bits: 5, ids: OLD_ACCENTS },
    { key: null, bits: 5 },
    { key: "font", bits: 5, ids: OLD_FONTS },
    { key: null, bits: 5 },
    { key: null, bits: 3 },
    { key: null, bits: 2 },
  ],
  b: [
    { key: null, bits: 5 },
    { key: "colour", bits: 5, ids: OLD_ACCENTS },
    { key: null, bits: 5 },
    { key: "font", bits: 5, ids: OLD_FONTS },
    { key: null, bits: 3 },
    { key: "logo", bits: 4, ids: OLD_ICONS },
  ],
  c: [
    { key: "colour", bits: 5, ids: OLD_THEME_ACCENTS },
    { key: null, bits: 5 },
    { key: "font", bits: 5, ids: OLD_FONTS },
    { key: "logo", bits: 4, ids: OLD_ICONS },
  ],
  d: [
    { key: "style", bits: 4, ids: D_STYLES },
    { key: "colour", bits: 4, ids: D_COLOURS },
    { key: "font", bits: 4, ids: OLD_FONTS },
    { key: "logo", bits: 6 },
  ],
  e: [
    { key: "style", bits: 4 },
    { key: "colour", bits: 4, ids: E_COLOURS },
    { key: "font", bits: 4, ids: E_FONTS },
    { key: "logo", bits: 6 },
  ],
}

function toBase62(num) {
  if (num === 0) return "0"
  let result = ""
  let n = num
  while (n > 0) {
    result = BASE62[n % 62] + result
    n = Math.floor(n / 62)
  }
  return result
}

function fromBase62(str) {
  let result = 0
  for (let i = 0; i < str.length; i++) {
    const idx = BASE62.indexOf(str[i])
    if (idx === -1) return -1
    result = result * 62 + idx
  }
  return result
}

/** A pick (any field left out takes its default) → its code, e.g. "e0". */
export function encodePreset(config = {}) {
  const merged = { ...DEFAULT_PRESET, ...config }
  // Multiplication, not bitwise ops: those truncate to 32 bits.
  let bits = 0
  let offset = 0
  for (const field of PRESET_FIELDS) {
    const idx = field.options.findIndex((o) => o.id === merged[field.key])
    bits += (idx === -1 ? 0 : idx) * 2 ** offset
    offset += field.bits
  }
  return VERSION + toBase62(bits)
}

/** A code → the pick, or null when it is not a code. An older letter's
 *  code gives today's nearest pick. */
export function decodePreset(code) {
  if (!isPresetCode(code)) return null
  const bits = fromBase62(code.slice(1))
  if (bits < 0) return null
  const result = { ...DEFAULT_PRESET }
  let offset = 0
  for (const field of LEGACY[code[0]] ?? PRESET_FIELDS) {
    const idx = Math.floor(bits / 2 ** offset) % 2 ** field.bits
    offset += field.bits
    if (!field.key) continue
    const options = PRESET_FIELDS.find((f) => f.key === field.key).options
    const id = field.ids ? field.ids[idx] : options[idx]?.id
    result[field.key] = options.some((o) => o.id === id) ? id : options[0].id
  }
  return result
}

export function isPresetCode(value) {
  if (typeof value !== "string" || value.length < 2 || value.length > 10)
    return false
  if (value[0] !== VERSION && !LEGACY[value[0]]) return false
  for (let i = 1; i < value.length; i++)
    if (BASE62.indexOf(value[i]) === -1) return false
  return true
}

// ── the files ───────────────────────────────────────────────────────────────

/** The two files a preset writes, app-root relative. theme.json carries the
 *  colour as the accent and the chart tint lib/appearance.ts falls back to,
 *  and the logo with the drawing the shell's mark draws
 *  (components/brand/app-mark.tsx). */
export const THEME_FILES = {
  css: "app/src/theme.css",
  json: "app/src/theme.json",
}

const option = (key, id) => {
  const field = PRESET_FIELDS.find((f) => f.key === key)
  return field.options.find((o) => o.id === id) ?? field.options[0]
}

/** The pick's options; `ownColour`: the colour is the style's own, so a
 *  chart's series take the style's tool colours (STYLES `series`). */
export function resolvePreset(preset) {
  const r = Object.fromEntries(
    PRESET_FIELDS.map((f) => [f.key, option(f.key, preset?.[f.key])]),
  )
  return { ...r, ownColour: r.colour.id === r.style.colour }
}

/** The colour and font a style picks (create's panel sets them with it). */
export function styleDefaults(styleId) {
  const style = option("style", styleId)
  return { colour: style.colour, font: style.font }
}
const resolve = resolvePreset

/** The npm packages a preset's fonts need, as package.json lists them. */
export function themePackages(preset) {
  const { font } = resolve(preset)
  return font.package ? { [font.package]: font.version } : {}
}

/** The text of app/src/theme.json. */
export function themeJson(preset) {
  const { style, colour, logo } = resolve(preset)
  const json = {
    preset: encodePreset(preset),
    style: style.id,
    accent: colour.id,
    tint: colour.id,
    logo: logo.id,
    mark: logo.svg,
  }
  return JSON.stringify(json, null, 2) + "\n"
}

/** The CSS a `<style>` tag takes at run time: theme.css from its tokens on
 *  (`:root`, `.dark`, the highlights and the style's rules), without the
 *  build-time `@import` and `@theme inline` above them. create's preview
 *  injects it to swap the look live. */
export function themeRuntimeCss(preset) {
  const css = themeCss(preset)
  return css.slice(css.search(/^:root/m))
}

/** The text of app/src/theme.css: Neutral's greys and the app's own
 *  tokens, with the style's radius and greys, the colour's accent and chart
 *  ramp merged over them, as shadcn's buildRegistryTheme does, the font
 *  stacks, then the highlights and the style's rules. Headings take the
 *  body font. */
export function themeCss(preset) {
  const r = resolve(preset)
  const { style, colour, font, ownColour } = r

  const light = {
    ...NEUTRAL.light,
    ...APP_TOKENS.light,
    ...style.light,
    ...colour.light,
  }
  const dark = {
    ...NEUTRAL.dark,
    ...APP_TOKENS.dark,
    ...style.dark,
    ...colour.dark,
  }
  // The ramp, and a tool's own categorical colours for a chart's series
  // (report-charts.tsx falls back to the ramp where they are not set).
  const charts = {}
  colour.ramp.forEach((v, i) => (charts[`chart-${i + 1}`] = v))
  const series = ownColour ? style.series : undefined
  series?.forEach((v, i) => (charts[`series-${i + 1}`] = v))
  Object.assign(light, charts)
  Object.assign(dark, charts)
  light.radius = style.radius
  // A chart's bar corners (report-charts.tsx), where the style squares them.
  if (style.barRadius !== undefined)
    light["chart-bar-radius"] = String(style.barRadius)
  if (style.barGap) light["chart-bar-gap"] = style.barGap

  const notes = APP_TOKENS.notes
  const block = (vars, note) =>
    Object.entries(vars)
      .flatMap(([k, v]) => [...comment(note[k], "  "), `  --${k}: ${v};`])
      .join("\n")

  const fontNote =
    font.id === "system"
      ? comment(
          [
            "Notion's own stacks (measured on app.notion.com, 2026-09-29): the system",
            "face, not a webfont — SF Pro on a Mac, Segoe UI on Windows.",
          ],
          "  ",
        ).join("\n") + "\n"
      : ""
  const imports = font.package ? [font.package] : []
  // The logo is theme.json's alone, so theme.css names only the look.
  const picks = PRESET_FIELDS.filter((f) => f.key !== "logo")
    .map((f, i) => `${i ? f.label.toLowerCase() : f.label} ${r[f.key].label}`)
    .join(", ")
  // A reader's other tint (Settings → Appearance, app.css `[data-tint]`)
  // gives the series back to the ramp.
  const theme = series
    ? `
/* The ${style.label} series give way to the ramp under another tint. */
[data-tint]:not([data-tint="${colour.id}"]) {
${series.map((_, i) => `  --series-${i + 1}: initial;`).join("\n")}
}
`
    : ""
  const rules = style.css
    ? `
/* The ${style.label} style: ${style.note}. Rules over the components'
   \`data-slot\`, after the tokens; the component files stay shadcn's. */
${style.css}
`
    : ""

  return `/* The app's look: its style, colour and font. Preset ${encodePreset(preset)}:
   ${wrap(picks + ".", 75).join("\n   ")}
   \`silvi apply --preset <code>\` writes this file and theme.json whole
   (cli/lib/preset.mjs); edit it by hand and \`apply\` keeps your copy.
   Settings → Appearance overrides the accent and the charts per viewer
   (app.css \`[data-accent]\`, \`[data-tint]\`). */
${imports.map((p) => `@import "${p}";\n`).join("")}
@theme inline {
${fontNote}  --font-heading: var(--font-sans);
  --font-sans:
    ${font.family};
  --font-mono:
    "SFMono-Regular", Menlo, Consolas, "PT Mono", "Liberation Mono", Courier,
    monospace;
}

/* \`.slide-paper\` is a slide's page (blocks/deck/): always the light palette,
   as a printed page is, whatever the app's theme. */
:root,
.slide-paper {
${block(light, notes.light)}
}

.dark {
${block(dark, notes.dark)}
}

${HIGHLIGHTS}
${theme}${rules}`
}

function comment(lines, indent) {
  if (!lines?.length) return []
  return lines.map((line, i) => {
    const open = i === 0 ? "/* " : "   "
    const close = i === lines.length - 1 ? " */" : ""
    return `${indent}${open}${line}${close}`
  })
}

function wrap(text, width) {
  const lines = [""]
  for (const word of text.split(" ")) {
    const last = lines.length - 1
    if (lines[last] && (lines[last] + " " + word).length > width)
      lines.push(word)
    else lines[last] = lines[last] ? `${lines[last]} ${word}` : word
  }
  return lines
}
