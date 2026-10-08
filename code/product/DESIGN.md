# DESIGN.md — the work app

The look the app's screens keep to.

## Tables

**The look, before any class name:** a table is an open, light surface — data
resting directly on the page, separated by hairline horizontal lines, in the
same quiet Inter as everything else. Think of a well-set book index, not a
terminal and not a dashboard widget. If a table draws attention to its own
styling — a border around it, a badge in it, a font change — it's wrong.

The intent, in five rules:

1. **Open, not boxed.** A table sits flat on the page background with no
   enclosing border, no rounded-rectangle card around it, no outer frame.
   The only lines are the hairline `border-b` between rows.
2. **One font, everywhere.** Every cell is `text-sm` Inter — including
   identifiers (`src_op_person`), numbers, dates, and timestamps. **Never
   `font-mono` in a table.** Data being "code-like" is not a reason; mono
   makes the page read like a terminal dump.

   As of 2026-08-20 this holds **everywhere, not only in tables**: there is no
   `font-mono` left in the app. It was removed from the three refresh dialogs'
   inline `<code>`, a source-path definition list, a prompt body, a sheet
   description and the shared chart tooltip's value. Inline code keeps its
   `bg-muted` chip at `text-xs` — that is what marks it as code — and numeric
   alignment is `tabular-nums`, which is what actually aligns digits. Reach for
   a second typeface nowhere; if something needs to read as code, give it the
   chip.
3. **Light grayscale.** Near-black primary text, `text-muted-foreground` for
   secondary text, hairline borders, at most a whisper of `bg-muted/50` on
   hover. No dark fills, no tinted rows, no heavy contrast blocks.
4. **Words, not badges.** A plain enum value ("incremental", "text",
   "active") is muted text, full stop. No pills, no `Badge`, no colored
   chips inside table cells — a black pill in every row is the single
   loudest element on the page.
5. **Air.** Generous row height and cell padding; whitespace does the
   separating, not lines or boxes. When in doubt, remove a visual element
   rather than add one.
6. **Fits the page.** A table must never show a horizontal scrollbar at
   normal desktop width — a scrollbar while columns sit half-empty means the
   layout is broken, not that the data is wide. Design the columns to fit:
   let long text cells wrap, drop or merge columns that don't earn their
   width. The `overflow-x-auto` wrapper is a safety net for extreme cases,
   not a license to overflow.

In this app (from Voni's "Tables are prose tables" and "One sheet, one shape"):

- **Compose from `app/src/components/ui/table.tsx`**, never a raw `<table>`.
- **An enum is muted text.** A status or a type in a cell is a word in
  `text-muted-foreground`, not a badge.
- **Cells wrap.** No fixed column widths: text cells take
  `whitespace-normal`, and only short columns (a date, an enum) stay on one
  line.
- **A row opens a Sheet.** Clicking a row opens its details in the one row
  sheet (`components/page/detail-sheet.tsx`), where it is read and edited. There
  is no inline cell editor.
- **Blanks are visible.** An empty cell reads as "—" (`Blank`), not as
  nothing.
- **No divider after a checkbox.** A checkbox column has no vertical line on
  its right; the box and the name beside it read as one cell. Set once in
  `components/ui/table.tsx` for any cell holding `role=checkbox`.

## Detail panels

A record opens in a panel on the right, the way Notion's side peek does.

- **Top to bottom.** The panel runs the full height of the window, from the
  top edge, not from under the page header. The row sheet
  (`components/page/detail-sheet.tsx`) is not docked: it covers the header,
  so the list's controls there ("Add item") show only on the list or table,
  never over an open record.
- **The inbox pane has no footer.** The item-list block draws its own
  headers: the breadcrumb over the list column, and a bar of its own over the
  reading pane. An item's action, Make a task, is a ghost button in that bar
  at the top right, portalled through `HeaderSlot`. Nothing sits at the
  bottom of the pane.
- **A row sheet keeps its footer.** Delete item on the left, Save on the
  right, pinned to the bottom, because Save is how a form ends.

## Styles

The preset's theme is a style (Neutral, Power BI, Tableau, Google Looker),
written by the CLI into `app/src/theme.css` after the tokens. Each brings its
own accent, chart colours and font; Colour and Font override them.

- **A style is CSS over `data-slot`.** Its radius, any greys of its own, and
  a few rules keyed on the components' `data-slot` attributes. Never fork a
  `components/ui/` file for a look.
- **A surface that should take the style carries a slot.** A card is
  `card`; a report visual's body, framed or open, is `widget` (Widget's body
  and the table component's card). A new surface outside `components/ui/` gets
  one of these, not its own edge or shadow rules.
- **Neutral adds no rules.** It is the look the rest of this file describes;
  the others change edges, corners, shadows and fills, never the layout.
- **Visuals side by side are one height.** Each grid cell is a column its
  visual fills (`report-kit/layout.tsx`), so a style that frames visuals
  (Power BI's cards) draws a row of equal boxes, however short one chart is.
