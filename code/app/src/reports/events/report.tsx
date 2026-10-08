import { defineReport, query } from "~/components/report-kit/define"
import {
  H2,
  Info,
  Rule,
  Rules,
  Sql,
  Technical,
} from "~/components/report-kit/info"

import byFormat from "./by-format.sql?raw"
import byMonth from "./by-month.sql?raw"
import list from "./list.sql?raw"

type Month = {
  month: string
  events: number
  registered: number
  attended: number
}
type FormatMonth = { month: string; format: string; attended: number }
type Event = {
  month: string
  date: string
  event: string
  venue: string
  format: string
  capacity: number
  registered: number
  attended: number
  turnout: number
}

export default defineReport({
  meta: {
    title: "Events",
    description: "The society's events and who came, by month and format.",
    connector: "csv",
  },
  page: {
    info: () => (
      <>
        <Info>
          <H2>The measures</H2>
          <Rules>
            <Rule id="attended" title="Attendees:">
              people checked in at the door, or who joined an online event.
            </Rule>
            <Rule id="turnout" title="Turnout:">
              attendees as a share of those who registered.
            </Rule>
          </Rules>
        </Info>
        <Technical>
          <H2>The SQL</H2>
          <Sql query="byMonth" />
          <Sql query="byFormat" />
          <Sql query="events" />
        </Technical>
      </>
    ),
  },
  queries: {
    byMonth: query<Month>(byMonth, { grain: "month" }),
    // the range's totals: the months in the date filter, added up
    totals: query(byMonth, {
      grain: "month",
      reconstruct: (rows: Month[]) => {
        const sum = (k: "events" | "registered" | "attended") =>
          rows.reduce((n, r) => n + r[k], 0)
        const registered = sum("registered")
        return [
          {
            events: sum("events"),
            attended: sum("attended"),
            turnout: registered ? (100 * sum("attended")) / registered : 0,
          },
        ]
      },
    }),
    byFormat: query(byFormat, {
      grain: "month",
      reconstruct: (rows: FormatMonth[]) => {
        const by = new Map<string, number>()
        for (const r of rows)
          by.set(r.format, (by.get(r.format) ?? 0) + r.attended)
        return [...by]
          .map(([format, attended]) => ({ format, attended }))
          .sort((a, b) => b.attended - a.attended)
      },
    }),
    events: query<Event>(list, { grain: "month" }),
  },
  components: (k) => [
    <k.Kpis
      key="totals"
      series="totals"
      tiles={[
        { label: "Events", value: "events" },
        { label: "Attendees", value: "attended" },
        { label: "Turnout", value: "turnout", format: "percent0" },
      ]}
    />,
    <k.BarsWithLine
      key="months"
      series="byMonth"
      x="month"
      xFormat="month"
      bar="attended"
      line="events"
      lineFormat="number"
      labels={{ attended: "Attendees", events: "Events" }}
      title="Attendees per month"
      info={{
        what: "Attendees per month, with the number of events held.",
        rules: ["attended"],
        sql: ["byMonth"],
      }}
    />,
    <k.CategoryBars
      key="formats"
      series="byFormat"
      x="format"
      value="attended"
      title="Attendees by format"
      info={{
        what: "Attendees in the date range, per event format.",
        rules: ["attended"],
        sql: ["byFormat"],
      }}
    />,
    <k.Table
      key="events"
      series="events"
      title="Events"
      span={2}
      columns={[
        { key: "event", label: "Event", format: "text" },
        { key: "date", label: "Date", format: "date" },
        { key: "venue", label: "Venue", format: "text", wide: true },
        { key: "registered", label: "Registered" },
        { key: "attended", label: "Attended" },
        { key: "turnout", label: "Turnout", format: "percent0" },
      ]}
      info={{
        what: "Every event in the date range, newest first.",
        rules: ["attended", "turnout"],
        sql: ["events"],
      }}
    />,
  ],
})
