// A report's inputs (a `filterParams` entry with `input: "select"`,
// `"toggle"` or `"multi"`) as ONE View trigger on the filter line
// (product/DESIGN.md → Components: chart controls collapse into one button).
// Each value is a report param in the URL, resolved by the loader into
// `filters.params`; a change replaces `?<param>=` and the loader re-runs —
// on the cached fetch, unless the SQL names the input (`$<param>`).
//
// A select whose options come from the data (`meta.optionsFrom`) draws them
// once the data has streamed, and shows the value settled on
// (input-values.ts); until then it shows the URL's value. A multi-select
// (`input: "multi"`) is a checklist, `?<param>=a,b`. Sliders and numbers are
// drawn in their `<k.Inputs>` card on the page, a `tabs` input by its
// `<k.Tabs param>`: neither is here.

import { Suspense, use } from "react"
import { useSearchParams } from "react-router"

import type { ReportFilters } from "~/lib/filters"

import { useKitReport } from "./context"
import type { ResolvedParam } from "./define-page"
import { dataOptions, settledValue } from "./input-values"
import { ViewControls, type ViewControl } from "./view-controls"

const IN_POPOVER = ["select", "toggle", "multi", undefined]

export function InputControls({
  inputs,
  filters,
  label = "View",
}: {
  inputs: readonly ResolvedParam[]
  filters: ReportFilters
  label?: string
}) {
  const shown = inputs.filter((i) => IN_POPOVER.includes(i.input))
  const { data } = useKitReport()
  if (!shown.length) return null
  const fromData = shown.some((i) => i.meta?.optionsFrom || i.meta?.defaultFrom)
  const draw = (d: unknown) => (
    <Controls inputs={shown} filters={filters} label={label} data={d} />
  )
  if (!fromData || !isThenable(data)) return draw(data)
  return (
    <Suspense fallback={draw(undefined)}>
      <Awaited data={data} draw={draw} />
    </Suspense>
  )
}

const isThenable = (v: unknown): v is Promise<unknown> =>
  !!v && typeof (v as Promise<unknown>).then === "function"

function Awaited({
  data,
  draw,
}: {
  data: Promise<unknown>
  draw: (d: unknown) => React.ReactNode
}) {
  const d = use(settled(data))
  return <>{draw(d)}</>
}

// One settled promise per data promise, so `use` sees the same one on every
// render; a failed fetch is the page's error to show, not the trigger's.
const SETTLED = new WeakMap<Promise<unknown>, Promise<unknown>>()
function settled(p: Promise<unknown>) {
  let s = SETTLED.get(p)
  if (!s) SETTLED.set(p, (s = p.catch(() => undefined)))
  return s
}

function Controls({
  inputs,
  filters,
  label,
  data,
}: {
  inputs: readonly ResolvedParam[]
  filters: ReportFilters
  label: string
  data: unknown
}) {
  const [, setSearchParams] = useSearchParams()
  const set = (param: string, value: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(param, value)
        return next
      },
      { replace: true, preventScrollReset: true }
    )
  const controls = inputs.map((i): ViewControl => {
    const asked = filters.params?.[i.param]
    const options =
      i.meta?.optionsFrom && data !== undefined
        ? dataOptions(data, i.meta.optionsFrom)
        : i.options
    const value =
      (data !== undefined && (i.meta?.optionsFrom || i.meta?.defaultFrom)
        ? settledValue(
            {
              kind: i.input ?? "select",
              param: i.param,
              default: i.default ?? "",
              optionsFrom: i.meta.optionsFrom,
              defaultFrom: i.meta.defaultFrom,
            },
            data,
            asked
          )
        : asked) ??
      i.default ??
      ""
    if (i.input === "multi") {
      const values = value === "" ? [] : value.split(",")
      return {
        label: i.label,
        value,
        options,
        multiple: true,
        values,
        countNoun: "picked",
        onChange: (v) => set(i.param, v),
        onToggle: (v, on) =>
          set(
            i.param,
            options
              .map((o) => o.value)
              .filter((o) => (o === v ? on : values.includes(o)))
              .join(",")
          ),
      }
    }
    return {
      label: i.label,
      value,
      options,
      toggle: i.input === "toggle",
      onChange: (v) => set(i.param, v),
    }
  })
  return <ViewControls label={label} controls={controls} />
}
