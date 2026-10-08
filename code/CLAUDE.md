# CLAUDE.md

How to work on this app. What it is, the report format, the connectors and the commands are in `README.md`: read it first.

## The person

- They own and use this app and do not write React: they ask, you build.
- Never ask them to type a command: run it yourself and say what it did.
- Explain each change in plain words, say what changed on screen, and suggest one next thing to try.
- Change content before code: reports, wiki pages and `metrics.ts`; touch the kit only when a report cannot do it.
- Write a settled rule down: a report's rule in its dialog, a rule for every change in this file.

## The dev server

- Keep it running on port 9923: check with `lsof -iTCP:9923 -sTCP:LISTEN` at the start of work, and if nothing listens, run `npm run dev` from `app/` in the background.
- If you stop it, start it again on 9923 and confirm it listens before you reply.
- Never touch ports 9910, 9911, 9920, 9921 and 9922: they belong to other apps.

## Reports

- Read `app/src/components/report-kit/README.md` before writing or changing a report.
- Write a report as `app/src/reports/<id>/report.tsx` with `defineReport`, its queries as `.sql` files beside it; nothing else goes in a report folder.
- Put explanations in the report's `page.info` dialog, never on the page.
- Write SQL in the dialect of the report's connector, read-only, with `$from` and `$to` for the date range.
- Name the connector in `meta.connector` when the app has more than one.
- After a report change, run `npm run lint` and open the report.

## Connectors

- Never write a password or token anywhere but `app/.env`, and never commit `.env`.
- Add or remove a connector with `silvi add` / `silvi remove`, not by hand.
- Keep a connector's code in its own folder of `app/src/connectors/`, implementing `types.ts`.
- Put data files in `app/data/<kind>/` (`csv`, `excel`, `json`); each file is a table, queried in SQLite's dialect.
- The default connector is `csv`: it needs no `.env`.

## Changing code

- Run every `npm` command from `app/`.
- After a change, run `npm run typecheck`, `npm run lint` and `npm run build`, then open the page you changed.
- Build all UI from `app/src/components/ui/`; tables follow `product/DESIGN.md` → Tables.
- Never import a runtime value from a `*.server.ts` file into client code: it is silently `undefined` in the browser.
- Use fictional names in example data.

## Wiki

- Write pages in plain Markdown, with `> [!NOTE]` for a set-off note (`README.md` → Wiki).
- When a component or its props change, update its page in `app/wiki/components/`.
- Write for the Code tab of the Claude desktop app, never for a terminal.
