// A page input's value as the transforms and the page read it. Client-safe:
// the server (run.server.ts) settles the values before the transforms run a
// second time, and the page (input-controls.tsx, inputs-card.tsx) reads the
// same rules, so the control shows the value the figures were made with.
//
// Three kinds of input read the page's data rather than the file:
//   • options from data: `{% select options=$months %}` — the entry's rows,
//     each `{value, label?}`; a URL value not among them falls back to the
//     default (the tag's `default=` if offered, else `default=$path`, else
//     the first row);
//   • a default from data: `{% slider default=$today.0.dd %}` — used while
//     the URL names no value;
//   • a numeric input (slider, number): its signal is a number.

/** What the settling needs of an input (schema.ts `Input`). */
export type InputRule = {
  kind: string
  param: string
  /** the literal default ("" when none) */
  default: string
  /** a `$path` into the data holding the options' rows */
  optionsFrom?: string
  /** a `$path` into the data holding the default */
  defaultFrom?: string
}

/** A dot path into the data (`today.0.dd`). */
export function valueAt(data: unknown, path: string): unknown {
  let v: unknown = data
  for (const k of path.split(".")) {
    if (v == null || typeof v !== "object") return undefined
    v = (v as Record<string, unknown>)[k]
  }
  return v
}

export const isNumericInput = (kind: string) =>
  kind === "slider" || kind === "number"

/** The options an entry of the data holds: rows `{value, label?}`, or plain
 *  values. */
export function dataOptions(
  data: unknown,
  path: string
): { value: string; label: string }[] {
  const rows = valueAt(data, path)
  if (!Array.isArray(rows)) return []
  return rows.flatMap((r) => {
    if (r == null) return []
    if (typeof r !== "object") return [{ value: String(r), label: String(r) }]
    const o = r as Record<string, unknown>
    if (o.value == null) return []
    return [{ value: String(o.value), label: String(o.label ?? o.value) }]
  })
}

/** A value read off the data as a param's text ("" for nothing). */
function asParam(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : ""
  return String(v)
}

/** The value an input is in force at, given the data: the URL's (already
 *  checked by the loader), or the default the data or the file names. */
export function settledValue(
  input: InputRule,
  data: unknown,
  asked: string | undefined
): string | undefined {
  if (input.optionsFrom) {
    const opts = dataOptions(data, input.optionsFrom).map((o) => o.value)
    const ok = (v: string | undefined) =>
      v != null &&
      v !== "" &&
      (input.kind === "multi"
        ? v.split(",").every((x) => opts.includes(x))
        : opts.includes(v))
    if (ok(asked)) return asked
    if (ok(input.default)) return input.default
    const fromData = input.defaultFrom
      ? asParam(valueAt(data, input.defaultFrom))
      : ""
    if (ok(fromData)) return fromData
    return opts[0]
  }
  if (asked != null && asked !== "") return asked
  if (input.defaultFrom) {
    const v = asParam(valueAt(data, input.defaultFrom))
    if (v !== "") return v
  }
  return input.default === "" ? asked : input.default
}

/** The inputs whose value the data changes: param → its settled value, or
 *  null when none does (the transforms need not run again). */
export function settleInputs(
  inputs: readonly InputRule[],
  data: unknown,
  params: Record<string, string> | undefined
): Record<string, string> | null {
  let changed: Record<string, string> | null = null
  for (const i of inputs) {
    if (!i.optionsFrom && !i.defaultFrom) continue
    const asked = params?.[i.param]
    const v = settledValue(i, data, asked)
    if (v != null && v !== asked) (changed ??= {})[i.param] = v
  }
  return changed
}

/** A param's text as its signal: a number for a slider or number input
 *  (null when blank), the text otherwise (a multi-select's comma list). */
export function inputSignal(kind: string, v: string | undefined): unknown {
  if (v == null) return null
  if (!isNumericInput(kind)) return v
  if (v.trim() === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
