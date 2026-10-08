// Running a report's compiled queries. Server-only.

import { createHash } from "node:crypto"

import { queryRows } from "~/lib/db.server"
import { cached } from "~/lib/query-cache.server"

type Row = Record<string, unknown>

/** Run a compiled query on a connector, cached under its text, values and
 *  connector. */
export function runCompiled<R extends Row>(
  name: string,
  text: string,
  args: unknown[],
  connector?: string | null
): Promise<R[]> {
  const hash = createHash("sha1").update(text).digest("hex").slice(0, 10)
  const on = connector ?? process.env.SILVI_CONNECTOR ?? ""
  return cached(`query:${name}:${hash}:${on}:${JSON.stringify(args)}`, () =>
    queryRows<R>(text, args, { connector })
  )
}
