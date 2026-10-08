// MySQL, through `mysql2`: one pool per process, from MYSQL_URL. The kit
// binds `$1..$n`; they are rewritten to MySQL's `?` here. Write the dates a
// report reads as `cast($from as date)`: `$from::date` is Postgres syntax.

import mysql from "mysql2/promise"

import {
  forgetPool,
  pooled,
  positional,
  requireEnv,
  type Column,
  type Connector,
  type ConnectorInfo,
  type Row,
} from "../types"
import json from "./connector.json"

const info = json as ConnectorInfo

function pool(): mysql.Pool {
  return pooled(info.id, () => {
    const env = requireEnv(info)
    const p = mysql.createPool({
      uri: env.MYSQL_URL,
      connectionLimit: 4,
      connectTimeout: 30_000,
      // Rows in the kit's shape (types.ts): decimals and bigints as numbers,
      // dates as their text, as MySQL stored them.
      decimalNumbers: true,
      supportBigNumbers: true,
      bigNumberStrings: false,
      dateStrings: true,
    })
    // An idle connection the server drops must not crash the process.
    p.on("connection", (c) => c.on("error", () => {}))
    return p
  })
}

async function run(sql: string, params: unknown[]) {
  const p = positional(sql, params)
  const values = p.values.map((v) => (typeof v === "boolean" ? Number(v) : v))
  return pool().query({ sql: p.sql, values, timeout: 65_000 })
}

const T = mysql.Types
const NUMBER = new Set<number>([
  T.DECIMAL,
  T.NEWDECIMAL,
  T.TINY,
  T.SHORT,
  T.LONG,
  T.INT24,
  T.LONGLONG,
  T.FLOAT,
  T.DOUBLE,
  T.YEAR,
])

function kind(type: number | undefined): Column["type"] {
  if (type === undefined) return "text"
  if (NUMBER.has(type)) return "number"
  if (type === T.DATE || type === T.NEWDATE) return "date"
  if (type === T.DATETIME || type === T.TIMESTAMP) return "timestamp"
  return "text"
}

export const connector: Connector = {
  id: info.id,
  label: info.label,
  async query(sql, params) {
    const [rows, fields] = await run(sql, params)
    const stamps = (fields as mysql.FieldPacket[])
      .filter((f) => kind(f.columnType ?? f.type) === "timestamp")
      .map((f) => f.name)
    // "2026-03-01 10:00:00.123": cut to seconds, as the other connectors give it
    return (rows as Row[]).map((r) => {
      if (!stamps.length) return r
      const row: Row = { ...r }
      for (const k of stamps)
        if (typeof row[k] === "string") row[k] = (row[k] as string).slice(0, 19)
      return row
    })
  },
  async columns(sql, params) {
    const [, fields] = await run(
      `select * from (\n${sql}\n) as limit_0 limit 0`,
      params
    )
    return (fields as mysql.FieldPacket[]).map((f) => ({
      name: f.name,
      type: kind(f.columnType ?? f.type),
    }))
  },
  async close() {
    const p = globalThis.__silviPools?.get(info.id) as mysql.Pool | undefined
    forgetPool(info.id)
    await p?.end()
  },
}
