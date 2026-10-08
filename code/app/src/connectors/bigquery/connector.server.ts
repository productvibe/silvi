// BigQuery, through `@google-cloud/bigquery`: one client per process, in
// BIGQUERY_PROJECT, signed in with the service account key file at
// GOOGLE_APPLICATION_CREDENTIALS. The kit binds `$1..$n`; they are rewritten
// to BigQuery's named `@p1..@pn` here. Write the dates a report reads as
// `date($from)`: `$from::date` is Postgres syntax.

import {
  BigQuery,
  BigQueryDate,
  BigQueryDatetime,
  BigQueryTime,
  BigQueryTimestamp,
  Geography,
  type Query,
} from "@google-cloud/bigquery"

import {
  dateText,
  forgetPool,
  pooled,
  requireEnv,
  rewritePlaceholders,
  type Column,
  type Connector,
  type ConnectorInfo,
  type Row,
} from "../types"
import json from "./connector.json"

const info = json as ConnectorInfo

function client(): { bq: BigQuery; location: string | undefined } {
  return pooled(info.id, () => {
    const env = requireEnv(info)
    return {
      bq: new BigQuery({
        projectId: env.BIGQUERY_PROJECT,
        keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
      }),
      location: env.BIGQUERY_LOCATION || undefined,
    }
  })
}

/** The query with `$n` as `@pn`, its values named, and a type for each
 *  null (BigQuery cannot infer one). */
function request(sql: string, params: unknown[]): Query {
  const values: Record<string, unknown> = {}
  const types: Record<string, string> = {}
  params.forEach((v, i) => {
    values[`p${i + 1}`] = v ?? null
    if (v == null) types[`p${i + 1}`] = "STRING"
  })
  return {
    query: rewritePlaceholders(sql, (n) => `@p${n}`),
    params: values,
    types,
    location: client().location,
    jobTimeoutMs: 65_000,
  }
}

/** A value in the kit's shape (types.ts): numbers as numbers, dates and
 *  times as their text. */
function plain(v: unknown): unknown {
  if (v == null || typeof v !== "object") return v ?? null
  if (v instanceof BigQueryDate) return v.value
  if (v instanceof BigQueryDatetime)
    return v.value.replace("T", " ").slice(0, 19)
  if (v instanceof BigQueryTimestamp) return dateText(new Date(v.value), true)
  if (v instanceof BigQueryTime || v instanceof Geography) return v.value
  if (v instanceof Buffer) return v.toString("base64")
  if (Array.isArray(v)) return v.map(plain)
  // NUMERIC and BIGNUMERIC arrive as Big numbers.
  if (
    "toFixed" in v &&
    typeof (v as { toFixed: unknown }).toFixed === "function"
  )
    return Number(String(v))
  return Object.fromEntries(
    Object.entries(v as Row).map(([k, x]) => [k, plain(x)])
  )
}

function kind(type: string | null | undefined): Column["type"] {
  const t = (type ?? "").toUpperCase()
  if (
    /^(INT64|INTEGER|FLOAT64|FLOAT|NUMERIC|BIGNUMERIC|DECIMAL|BIGDECIMAL)$/.test(
      t
    )
  )
    return "number"
  if (t === "DATE") return "date"
  if (t === "DATETIME" || t === "TIMESTAMP") return "timestamp"
  if (t === "BOOL" || t === "BOOLEAN") return "boolean"
  return "text"
}

export const connector: Connector = {
  id: info.id,
  label: info.label,
  async query(sql, params) {
    const [rows] = await client().bq.query(request(sql, params))
    return (rows as Row[]).map(
      (r) =>
        Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k, plain(v)])
        ) as Row
    )
  },
  async columns(sql, params) {
    // A dry run: BigQuery works out the result's columns without running it.
    const [job] = await client().bq.createQueryJob({
      ...request(sql, params),
      dryRun: true,
    })
    const fields = job.metadata?.statistics?.query?.schema?.fields ?? []
    return fields.map((f: { name?: string; type?: string }) => ({
      name: f.name ?? "",
      type: kind(f.type),
    }))
  },
  async close() {
    forgetPool(info.id)
  },
}
