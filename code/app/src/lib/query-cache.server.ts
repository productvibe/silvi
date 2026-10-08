// In-memory cache for report queries. Two jobs:
// 1. Avoid re-querying the database on every navigation: a report runs its
//    queries once over the wide window and every date range re-slices them.
// 2. Dedupe in-flight requests, which is why pending promises are cached,
//    not just resolved values.
//
// An entry lives TTL_MS. The key holds a hash of the report's SQL (its spec
// id), so an edited query is read fresh at once.

type Entry = {
  promise: Promise<unknown>
  createdAt: number
  expiresAt: number
}

declare global {
  var __queryCache: Map<string, Entry> | undefined
}

const MAX_ENTRIES = 200
const TTL_MS = 10 * 60 * 1000

const live = (entry: Entry, now: number) => entry.expiresAt > now

/**
 * When the live entry under `key` was fetched, or null if there is none.
 *
 * Synchronous on purpose. A report's "Data as of" must not cost an await: the
 * loader hands the page an un-awaited promise so it can paint early, and
 * awaiting the query just to timestamp it would give that back. On a hit this
 * is the exact moment the rows were read; on a miss the caller is about to
 * start the fetch, so `Date.now()` is the right answer and this returns null to
 * say so.
 */
export function cachedAt(key: string): number | null {
  const hit = globalThis.__queryCache?.get(key)
  return hit && live(hit, Date.now()) ? hit.createdAt : null
}

export function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = TTL_MS
): Promise<T> {
  const cache = (globalThis.__queryCache ??= new Map())
  const now = Date.now()

  const hit = cache.get(key)
  if (hit && live(hit, now)) return hit.promise as Promise<T>

  const promise = fn()
  const entry: Entry = { promise, createdAt: now, expiresAt: now + ttlMs }
  cache.set(key, entry)
  // A failed query must not be served from cache for its whole TTL. Compare
  // the stored entry by identity first: a slow failure can land after a later
  // call has already replaced this key with a fresh (possibly successful)
  // promise, and deleting that one throws away a good answer.
  promise.catch(() => {
    if (cache.get(key) === entry) cache.delete(key)
  })

  if (cache.size > MAX_ENTRIES) {
    // Evict a dead entry in preference to insertion order: the oldest key can
    // be a query that is still in flight, and dropping it loses the in-flight
    // dedupe that is half the point of caching the promise.
    let victim: string | undefined
    for (const [k, e] of cache) {
      if (!live(e, now)) {
        victim = k
        break
      }
    }
    victim ??= cache.keys().next().value
    if (victim !== undefined && victim !== key) cache.delete(victim)
  }
  return promise
}

/** A loader's `{ data, asOf }` for one cached fetch: `data` un-awaited for
 *  streaming, `asOf` when the rows were read (now, on a miss). */
export function loadCached<T>(
  key: string,
  fn: () => Promise<T>
): { data: Promise<T>; asOf: number } {
  const asOf = cachedAt(key) ?? Date.now()
  return { data: cached(key, fn), asOf }
}
