import { defineReport, query } from "~/components/report-kit/define"
import {
  H2,
  Info,
  Rule,
  Rules,
  Sql,
  Technical,
} from "~/components/report-kit/info"

import byAge from "./by-age.sql?raw"
import byDistrict from "./by-district.sql?raw"
import byField from "./by-field.sql?raw"
import byGender from "./by-gender.sql?raw"
import joins from "./joins.sql?raw"
import totals from "./totals.sql?raw"

type Totals = { active: number; joined_year: number; lapsed_share: number }
type Join = { month: string; joined: number }
type Count<K extends string> = Record<K, string> & { members: number }
type Gender = { gender: string; share: number; members: string }
type District = {
  district: string
  members: number
  share: number
  joined_year: number
}

export default defineReport({
  meta: {
    title: "Members",
    description:
      "Who the society's members are: age, gender, district and field.",
    connector: "csv",
  },
  page: {
    filterBar: false,
    info: () => (
      <>
        <Info>
          <H2>The measures</H2>
          <Rules>
            <Rule id="active" title="Members:">
              active members, whose membership has not lapsed. Every breakdown
              counts them as they are today.
            </Rule>
            <Rule id="joined" title="Joined:">
              members by the date they first joined.
            </Rule>
          </Rules>
        </Info>
        <Technical>
          <H2>The SQL</H2>
          <Sql query="totals" />
          <Sql query="joins" />
          <Sql query="byDistrict" />
        </Technical>
      </>
    ),
  },
  queries: {
    totals: query<Totals>(totals),
    joins: query<Join>(joins),
    byAge: query<Count<"age_group">>(byAge),
    byGender: query<Gender>(byGender),
    byField: query<Count<"field">>(byField),
    byDistrict: query<District>(byDistrict),
  },
  components: (k) => [
    <k.Kpis
      key="totals"
      series="totals"
      tiles={[
        { label: "Members", value: "active" },
        { label: "Joined in the last 12 months", value: "joined_year" },
        { label: "Lapsed", value: "lapsed_share", format: "percent0" },
      ]}
    />,
    <k.StackedBars
      key="joins"
      series="joins"
      x="month"
      xFormat="month"
      y={{ joined: "Joined" }}
      title="New members per month"
      span={2}
      info={{
        what: "Members by the month they joined, over the last two years.",
        rules: ["joined"],
        sql: ["joins"],
      }}
    />,
    <k.CategoryBars
      key="age"
      series="byAge"
      x="age_group"
      value="members"
      title="Age"
      info={{
        what: "Active members per age group.",
        rules: ["active"],
        sql: ["byAge"],
      }}
    />,
    <k.ShareBars
      key="gender"
      series="byGender"
      label="gender"
      value="share"
      line="members"
      title="Gender"
      info={{
        what: "Each gender's share of active members.",
        rules: ["active"],
        sql: ["byGender"],
      }}
    />,
    <k.CategoryBars
      key="field"
      series="byField"
      x="field"
      value="members"
      title="Field of work"
      span={2}
      info={{
        what: "Active members per field of work.",
        rules: ["active"],
        sql: ["byField"],
      }}
    />,
    <k.Table
      key="districts"
      series="byDistrict"
      title="Districts"
      span={2}
      columns={[
        { key: "district", label: "District", format: "text" },
        { key: "members", label: "Members" },
        { key: "share", label: "Share", format: "percent0" },
        { key: "joined_year", label: "Joined in the last 12 months" },
      ]}
      info={{
        what: "Active members per Copenhagen district.",
        rules: ["active", "joined"],
        sql: ["byDistrict"],
      }}
    />,
  ],
})
