// Two attributes every component takes, drawn as wrappers around it (render.tsx):
//
//   when=$flags.0.showBreakdown         drawn while the data's value holds
//   when={input: "view", is: "table"}   drawn while an input is (or is not,
//                                       `not:`) one of the values
//   repeat="market"                     one component per value of the column in
//                                       its series, in order of appearance,
//                                       each on its own rows; "{value}" in
//                                       the title is the value (or
//                                       `repeat_label`'s column); a title
//                                       without it becomes the value
//
// Neither reads code from the page: a value, an input's name or a column.

import { createElement, type ReactElement, type ReactNode } from "react"

import { KitDataContext, useKitData, useSeries, type Row } from "./context"
import { defineComponent, Layout, type ComponentMeta } from "./layout"

export type WhenSpec =
  | ((data: unknown) => unknown)
  | string
  | { input: string; is?: string | string[]; not?: string | string[] }

const truthy = (v: unknown) =>
  Array.isArray(v)
    ? v.length > 0
    : typeof v === "string"
      ? v !== "" && v !== "off" && v !== "false" && v !== "0"
      : !!v

/** Whether a `when` holds for the data and the inputs in force. */
export function holds(
  when: WhenSpec | undefined,
  data: unknown,
  params: Record<string, string> | undefined
): boolean {
  if (when == null) return true
  if (typeof when === "function") return truthy(when(data))
  if (typeof when === "string") return truthy(params?.[when])
  const v = params?.[when.input] ?? ""
  const list = (x: string | string[]) => (Array.isArray(x) ? x : [x])
  if (when.is != null && !list(when.is).includes(v)) return false
  if (when.not != null && list(when.not).includes(v)) return false
  return true
}

const metaOf = (el: ReactElement) =>
  (el.type as { kit?: ComponentMeta }).kit

/** A component drawn only while its `when` holds. It takes the component's place
 *  in the layout (its span) and its skeleton. */
export const When = defineComponent(
  function When(p: { when: WhenSpec; span?: 1 | 2; children: ReactElement }) {
    const { data, filters } = useKitData()
    return holds(p.when, data, filters.params) ? p.children : null
  },
  {
    span: 2,
    skeleton: (props) => {
      const el = props.children as ReactElement<Record<string, unknown>>
      return metaOf(el)?.skeleton(el.props) ?? null
    },
  }
)

/** One copy of a component per value of a column of its series. */
export const Repeat = defineComponent(
  function Repeat(p: {
    series: string
    by: string
    label?: string
    title?: unknown
    draw: (title: unknown) => ReactElement
    /** the repeated component's own span (two half-width copies share a row) */
    itemSpan?: 1 | 2
  }) {
    const kit = useKitData()
    const rows = useSeries(p.series)
    const groups = new Map<string, Row[]>()
    const labels = new Map<string, string>()
    for (const r of rows) {
      const k = String(r[p.by] ?? "")
      if (!groups.has(k)) {
        groups.set(k, [])
        labels.set(k, String((p.label ? r[p.label] : undefined) ?? k))
      }
      groups.get(k)!.push(r)
    }
    const titleFor = (value: string): unknown => {
      const t = p.title
      const put = (s: unknown) =>
        typeof s === "string" && s.includes("{value}")
          ? s.split("{value}").join(value)
          : value
      return typeof t === "function"
        ? (d: unknown) => put((t as (d: unknown) => unknown)(d))
        : put(t)
    }
    const items: ReactNode[] = [...groups].map(([k, rs]) =>
      createElement(RepeatItem, {
        key: k,
        span: p.itemSpan,
        data: { ...kit.data, [p.series]: rs },
        children: p.draw(titleFor(labels.get(k)!)),
      })
    )
    return <Layout components={items} />
  },
  {
    span: 2,
    skeleton: (props) => {
      const el = (props.draw as (t: unknown) => ReactElement<Record<string, unknown>>)("")
      return metaOf(el)?.skeleton(el.props) ?? null
    },
  }
)

const RepeatItem = defineComponent(
  function RepeatItem(p: {
    data: Record<string, unknown>
    span?: 1 | 2
    children: ReactElement
  }) {
    const kit = useKitData()
    return (
      <KitDataContext.Provider value={{ ...kit, data: p.data }}>
        {p.children}
      </KitDataContext.Provider>
    )
  },
  { span: 2, skeleton: () => null }
)
