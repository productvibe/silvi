import { defineReport, query } from "~/components/report-kit/define"
import {
  H2,
  Info,
  Rule,
  Rules,
  Sql,
  Technical,
} from "~/components/report-kit/info"

import byMonth from "./by-month.sql?raw"
import byPage from "./by-page.sql?raw"

type Month = {
  month: string
  visitors: number
  search: number
  social: number
  newsletter: number
  direct: number
  sessions: number
}
type PageMonth = {
  month: string
  page: string
  visitors: number
  sessions: number
}

export default defineReport({
  meta: {
    title: "Website visitors",
    description:
      "Who visits the society's website, where they come from and what they read.",
    connector: "csv",
  },
  page: {
    info: () => (
      <>
        <Info>
          <H2>The measures</H2>
          <Rules>
            <Rule id="visitors" title="Visitors:">
              people who opened a page, counted once per page per month.
            </Rule>
            <Rule id="source" title="Source:">
              where a visitor came from: a search engine, social media, the
              newsletter, or typing the address.
            </Rule>
          </Rules>
        </Info>
        <Technical>
          <H2>The SQL</H2>
          <Sql query="byMonth" />
          <Sql query="pages" />
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
        const visitors = rows.reduce((n, r) => n + r.visitors, 0)
        const sessions = rows.reduce((n, r) => n + r.sessions, 0)
        const search = rows.reduce((n, r) => n + r.search, 0)
        return [
          {
            visitors,
            sessions,
            search: visitors ? (100 * search) / visitors : 0,
          },
        ]
      },
    }),
    pages: query(byPage, {
      grain: "month",
      reconstruct: (rows: PageMonth[]) => {
        const by = new Map<string, { visitors: number; sessions: number }>()
        for (const r of rows) {
          const p = by.get(r.page) ?? { visitors: 0, sessions: 0 }
          p.visitors += r.visitors
          p.sessions += r.sessions
          by.set(r.page, p)
        }
        const all = rows.reduce((n, r) => n + r.visitors, 0)
        return [...by]
          .map(([page, p]) => ({
            page,
            ...p,
            share: all ? (100 * p.visitors) / all : 0,
          }))
          .sort((a, b) => b.visitors - a.visitors)
      },
    }),
  },
  components: (k) => [
    <k.Kpis
      key="totals"
      series="totals"
      tiles={[
        { label: "Visitors", value: "visitors" },
        { label: "Sessions", value: "sessions" },
        { label: "From search", value: "search", format: "percent0" },
      ]}
    />,
    <k.Line
      key="visitors"
      series="byMonth"
      x="month"
      xFormat="month"
      y={{ visitors: "Visitors" }}
      title="Visitors per month"
      info={{
        what: "Visitors per month.",
        rules: ["visitors"],
        sql: ["byMonth"],
      }}
    />,
    <k.StackedBars
      key="sources"
      series="byMonth"
      x="month"
      xFormat="month"
      y={{
        search: "Search",
        social: "Social",
        newsletter: "Newsletter",
        direct: "Direct",
      }}
      legend
      title="Where visitors come from"
      info={{
        what: "Visitors per month, by source.",
        rules: ["visitors", "source"],
        sql: ["byMonth"],
      }}
    />,
    <k.Table
      key="pages"
      series="pages"
      title="Pages"
      span={2}
      columns={[
        { key: "page", label: "Page", format: "text" },
        { key: "visitors", label: "Visitors" },
        { key: "share", label: "Share", format: "percent0" },
        { key: "sessions", label: "Sessions" },
      ]}
      info={{
        what: "Visitors and sessions per page in the date range.",
        rules: ["visitors"],
        sql: ["pages"],
      }}
    />,
  ],
})
