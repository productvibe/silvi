// The report-kit's one way to run SQL: on the report's connector
// (src/connectors/), read-only. Which connector a report reads is its
// `meta.connector`, else SILVI_CONNECTOR, else the only one installed
// (connectors/index.server.ts).

import { query } from "~/connectors/index.server"

function assertSelect(sql: string) {
  const trimmed = sql.trimStart().toLowerCase()
  if (!trimmed.startsWith("select") && !trimmed.startsWith("with")) {
    throw new Error("Only read-only SELECT/WITH queries are allowed")
  }
}

export async function queryRows<Row extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  opts: { connector?: string | null } = {}
): Promise<Row[]> {
  assertSelect(sql)
  return (await query(opts.connector, sql, params)) as Row[]
}
