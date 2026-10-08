// Redshift, through `pg`: one pool per process, from the REDSHIFT_* keys.
// `$1..$n` are Redshift's own placeholders, so the SQL runs as the kit binds
// it.
//
// TLS is verified in full — chain AND hostname — against Amazon's roots
// (redshift-ca.server.ts): `sslmode=verify-full`. The pool is small on
// purpose: a shared cluster has few query slots, and a connection storm from
// one app is an outage for everyone else on it.

import pg from "pg"

import {
  dateText,
  forgetPool,
  pooled,
  requireEnv,
  type Column,
  type Connector,
  type ConnectorInfo,
} from "../types"
import json from "./connector.json"
import { REDSHIFT_CA_BUNDLE } from "./redshift-ca.server"

const info = json as ConnectorInfo
const T = pg.types.builtins

// Rows in the kit's shape (types.ts): every number a number (pg hands int8
// and numeric back as text), dates as their text (pg makes a Date in the
// server's time zone).
const types = {
  getTypeParser(oid: number, format?: "text" | "binary") {
    if (oid === T.INT8 || oid === T.NUMERIC) return (v: string) => Number(v)
    if (oid === T.DATE) return (v: string) => v
    if (oid === T.TIMESTAMP) return (v: string) => v.slice(0, 19)
    if (oid === T.TIMESTAMPTZ)
      return (v: string) => dateText(new Date(v), true)
    return pg.types.getTypeParser(oid, format as "text")
  },
} as pg.CustomTypesConfig

function pool(): pg.Pool {
  return pooled(info.id, () => {
    const env = requireEnv(info)
    const p = new pg.Pool({
      host: env.REDSHIFT_HOST,
      port: Number(env.REDSHIFT_PORT),
      database: env.REDSHIFT_DB,
      user: env.REDSHIFT_USER,
      password: env.REDSHIFT_PASSWORD,
      ssl: {
        ca: REDSHIFT_CA_BUNDLE,
        rejectUnauthorized: true,
        servername: env.REDSHIFT_HOST,
      },
      types,
      max: 2,
      idleTimeoutMillis: 60_000,
      // A page fires several queries at once: let them queue for a slot
      // rather than fail (concurrency is still capped at `max`).
      connectionTimeoutMillis: 30_000,
      // node-pg sets statement_timeout after connecting; Redshift honours it.
      statement_timeout: 60_000,
      query_timeout: 65_000,
    })
    // An idle client the cluster drops must not crash the process.
    p.on("error", () => {})
    return p
  })
}

const NUMBER = new Set<number>([
  T.INT2,
  T.INT4,
  T.INT8,
  T.FLOAT4,
  T.FLOAT8,
  T.NUMERIC,
])

function kind(oid: number): Column["type"] {
  if (NUMBER.has(oid)) return "number"
  if (oid === T.DATE) return "date"
  if (oid === T.TIMESTAMP || oid === T.TIMESTAMPTZ) return "timestamp"
  if (oid === T.BOOL) return "boolean"
  return "text"
}

export const connector: Connector = {
  id: info.id,
  label: info.label,
  async query(sql, params) {
    const result = await pool().query(sql, params)
    return result.rows
  },
  async columns(sql, params) {
    const result = await pool().query(
      `select * from (\n${sql}\n) as limit_0 limit 0`,
      params
    )
    return result.fields.map((f) => ({ name: f.name, type: kind(f.dataTypeID) }))
  },
  async close() {
    const p = globalThis.__silviPools?.get(info.id) as pg.Pool | undefined
    forgetPool(info.id)
    await p?.end()
  },
}
