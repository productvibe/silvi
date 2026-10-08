// SQL Server, through `mssql`: one pool per process, from the SQLSERVER_*
// keys. The kit binds `$1..$n`; they are rewritten to SQL Server's `@p1..@pn`
// here. Write the dates a report reads as `cast($from as date)`: `$from::date`
// is Postgres syntax.

import sql from "mssql"

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

function pool(): Promise<sql.ConnectionPool> {
  return pooled(info.id, () => {
    const env = requireEnv(info)
    const p = new sql.ConnectionPool({
      server: env.SQLSERVER_HOST,
      port: Number(env.SQLSERVER_PORT),
      database: env.SQLSERVER_DB,
      user: env.SQLSERVER_USER,
      password: env.SQLSERVER_PASSWORD,
      options: {
        encrypt: env.SQLSERVER_ENCRYPT !== "false",
        trustServerCertificate: false,
      },
      pool: { max: 4, idleTimeoutMillis: 60_000 },
      connectionTimeout: 30_000,
      requestTimeout: 65_000,
    })
    // An idle connection the server drops must not crash the process.
    p.on("error", () => {})
    const ready = p.connect()
    // A failed connect is not kept: the next query tries again.
    ready.catch(() => forgetPool(info.id))
    return ready
  })
}

async function request(text: string, params: unknown[]) {
  const req = (await pool()).request()
  params.forEach((v, i) => req.input(`p${i + 1}`, v))
  return req.query(rewritePlaceholders(text, (n) => `@p${n}`))
}

/** A result column's type by its mssql type name. */
function kind(type: string): Column["type"] {
  const t = type.toLowerCase()
  if (/^(tinyint|smallint|int|bigint|decimal|numeric|float|real|money|smallmoney)\b/.test(t))
    return "number"
  if (t === "date") return "date"
  if (/^(datetime|datetime2|smalldatetime|datetimeoffset)\b/.test(t))
    return "timestamp"
  if (t === "bit") return "boolean"
  return "text"
}

/** A bound value's declared type, for sp_describe_first_result_set. */
function declared(v: unknown): string {
  if (typeof v === "number")
    return Number.isInteger(v) ? "bigint" : "float"
  if (typeof v === "boolean") return "bit"
  return "nvarchar(4000)"
}

export const connector: Connector = {
  id: info.id,
  label: info.label,
  async query(text, params) {
    const result = await request(text, params)
    const cols = Object.values(result.recordset?.columns ?? {})
    const kinds = new Map(
      cols.map((c) => [c.name, kind(String((c.type as { declaration?: string })?.declaration ?? ""))])
    )
    // Rows in the kit's shape (types.ts): bigint comes back as text, dates
    // as Date objects.
    return (result.recordset ?? []).map((r: Row) => {
      const row: Row = { ...r }
      for (const [k, v] of Object.entries(row)) {
        const t = kinds.get(k)
        if (v == null) continue
        if (t === "number" && typeof v === "string") row[k] = Number(v)
        else if (v instanceof Date) row[k] = dateText(v, t !== "date")
      }
      return row
    })
  },
  async columns(text, params) {
    // Described, not run: SQL Server works out the result's columns from the
    // text and the parameters' types alone.
    const req = (await pool()).request()
    req.input("tsql", sql.NVarChar(sql.MAX), rewritePlaceholders(text, (n) => `@p${n}`))
    req.input(
      "params",
      sql.NVarChar(sql.MAX),
      params.map((v, i) => `@p${i + 1} ${declared(v)}`).join(", ")
    )
    const result = await req.query<{ name: string | null; system_type_name: string }>(
      "exec sp_describe_first_result_set @tsql, @params"
    )
    return result.recordset
      .filter((c) => c.name)
      .map((c) => ({ name: c.name!, type: kind(c.system_type_name) }))
  },
  async close() {
    const ready = globalThis.__silviPools?.get(info.id) as
      | Promise<sql.ConnectionPool>
      | undefined
    forgetPool(info.id)
    await (await ready?.catch(() => undefined))?.close()
  },
}
