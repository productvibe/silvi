// The connector registry: every folder here with a `connector.json` and a
// `connector.server.ts` is a connector, found by convention, so `silvi add`
// and `silvi remove` only copy and delete folders.
//
// Which one a report reads: its frontmatter `connector:`, else
// `SILVI_CONNECTOR` in `app/.env`, else the only one installed, else `csv`
// when it is installed (it needs no setup). A connector's
// module (and its database package) is loaded on its first query, and one
// whose env is unset fails then, naming the keys: the app always starts.

import "dotenv/config"

import {
  ConnectorError,
  requireEnv,
  type Connector,
  type ConnectorInfo,
  type Row,
  type Column,
} from "./types"

const INFO = import.meta.glob<ConnectorInfo>("./*/connector.json", {
  eager: true,
  import: "default",
})
const MODULES = import.meta.glob<{ connector: Connector }>(
  "./*/connector.server.ts"
)

const folderOf = (path: string) => path.split("/")[1]

/** The installed connectors, by id. */
export const connectors: ConnectorInfo[] = Object.entries(INFO)
  .filter(([path]) => `./${folderOf(path)}/connector.server.ts` in MODULES)
  .map(([, info]) => info)
  .sort((a, b) => a.id.localeCompare(b.id))

const ids = () => connectors.map((c) => c.id).join(", ")

/** The connector that needs no setup, read when nothing else decides. */
const FALLBACK = "csv"

/** The connector a report reads: `name` (its frontmatter), else
 *  `SILVI_CONNECTOR`, else the only one installed, else csv. Throws a ConnectorError
 *  that says what to set. */
export function connectorFor(name?: string | null): ConnectorInfo {
  if (!connectors.length)
    throw new ConnectorError(
      "No connector is installed: add one with `silvi add <connector>`."
    )
  if (name) {
    const found = connectors.find((c) => c.id === name)
    if (!found)
      throw new ConnectorError(
        `This report names the connector "${name}", which is not installed. Installed: ${ids()}.`
      )
    return found
  }
  const fallback = process.env.SILVI_CONNECTOR?.trim()
  if (fallback) {
    const found = connectors.find((c) => c.id === fallback)
    if (!found)
      throw new ConnectorError(
        `SILVI_CONNECTOR in app/.env is "${fallback}", which is not installed. Set it to one of: ${ids()}.`
      )
    return found
  }
  if (connectors.length === 1) return connectors[0]
  const csv = connectors.find((c) => c.id === FALLBACK)
  if (csv) return csv
  throw new ConnectorError(
    `No connector chosen for this report: set SILVI_CONNECTOR in app/.env to one of ${ids()}, or name one in the report's frontmatter (connector: …).`
  )
}

/** The connector module for an id, loaded on first use. */
export async function loadConnector(id: string): Promise<Connector> {
  const load = MODULES[`./${id}/connector.server.ts`]
  if (!load) throw new ConnectorError(`No connector "${id}" is installed.`)
  return (await load()).connector
}

/** Run `sql` (positional `$1..$n`) on a report's connector. */
export async function query(
  name: string | null | undefined,
  sql: string,
  params: unknown[]
): Promise<Row[]> {
  const c = await loadConnector(connectorFor(name).id)
  return c.query(sql, params)
}

/** The columns `sql` returns on a report's connector (the SQL check). */
export async function columns(
  name: string | null | undefined,
  sql: string,
  params: unknown[]
): Promise<Column[]> {
  const c = await loadConnector(connectorFor(name).id)
  return c.columns(sql, params)
}

/** Close every pool a connector opened, so a script can exit. */
export async function closeAll(): Promise<void> {
  await Promise.all(
    connectors.map(async (c) => {
      if (globalThis.__silviPools?.has(c.id))
        await (await loadConnector(c.id)).close()
    })
  )
}

/** Why a report cannot run, before it tries: no connector chosen, or the
 *  chosen one's `.env` keys unset (named). Null when it can. */
export function connectorProblem(name?: string | null): string | null {
  try {
    requireEnv(connectorFor(name))
    return null
  } catch (e) {
    if (e instanceof ConnectorError) return e.message
    throw e
  }
}
