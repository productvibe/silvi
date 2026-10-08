// How a list of components is laid out, and the skeleton that list implies.
//
// Full-width components (span 2: tiles, tables, sections, `span={2}` charts) each
// take a row; consecutive half-width components pair into a two-up grid — or, in a
// `{% section columns=3 %}`, three across. Rows are `gap-6` apart and cards in
// a grid `gap-4` (product/DESIGN.md → Page layout). A cell is a column whose
// visual fills it, so framed visuals side by side are one height.
//
// Three across only when each component still gets ~380 px (settled 2026-09-29:
// at ~267 px, three across at 1280 px, labels overprinted and ticks crowded).
// So a `columns=3` row is measured on its CONTAINER, not the viewport: three
// across from a 1172 px row, two across from 640 px — the odd last component then
// takes the whole row rather than sitting beside a hole — one column below.
// At the report column's width (≤ ~1090 px) that is two.

import {
  Children,
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react"

import { Skeleton } from "~/components/ui/skeleton"

/** What every component carries so the page can lay it out and draw its
 *  loading state before the data arrives. */
export type ComponentMeta = {
  /** default width: 1 = half the page from `xl` up, 2 = the whole row */
  span: 1 | 2
  skeleton: (props: Record<string, unknown>) => ReactNode
}

type KitComponent = ComponentType<never> & { kit?: ComponentMeta }

export function defineComponent<C extends ComponentType<never>>(c: C, meta: ComponentMeta) {
  ;(c as KitComponent).kit = meta
  return c
}

type El = ReactElement<Record<string, unknown>>

function metaOf(el: El): ComponentMeta | undefined {
  return (el.type as KitComponent).kit
}

function spanOf(el: El): 1 | 2 {
  const s = el.props.span
  return s === 1 || s === 2 ? s : (metaOf(el)?.span ?? 2)
}

/** How many span-1 components share a row: 2 (the page), or 3 in a section. */
export type Columns = 2 | 3

function rows(components: ReactNode, columns: Columns): El[][] {
  const els = Children.toArray(components).filter(isValidElement) as El[]
  const out: El[][] = []
  for (const el of els) {
    const last = out[out.length - 1]
    if (
      spanOf(el) === 1 &&
      last &&
      last.length < columns &&
      spanOf(last[0]) === 1
    )
      last.push(el)
    else out.push([el])
  }
  return out
}

function drawRows(
  components: ReactNode,
  draw: (el: El) => ReactNode,
  columns: Columns = 2
) {
  return (
    <div className="flex flex-col gap-6">
      {rows(components, columns).map((row, i) =>
        spanOf(row[0]) === 2 ? (
          <div key={i} className="min-w-0 empty:hidden">
            {draw(row[0])}
          </div>
        ) : (
          columns === 3 ? (
            <div key={i} className="@container">
              <div className="grid grid-cols-1 gap-4 @min-[40rem]:grid-cols-2 @min-[40rem]:[&>*:last-child:nth-child(odd)]:col-span-2 @min-[73.25rem]:grid-cols-3 @min-[73.25rem]:[&>*:last-child:nth-child(odd)]:col-span-1">
                {row.map((el, j) => (
                  <div key={j} className="flex min-w-0 flex-col *:flex-1">
                    {draw(el)}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div key={i} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {row.map((el, j) => (
                <div key={j} className="flex min-w-0 flex-col *:flex-1">
                  {draw(el)}
                </div>
              ))}
            </div>
          )
        )
      )}
    </div>
  )
}

export function Layout({
  components,
  columns,
}: {
  components: ReactNode
  columns?: Columns
}) {
  return drawRows(components, (el) => el, columns)
}

export function LayoutSkeleton({
  components,
  columns,
}: {
  components: ReactNode
  columns?: Columns
}) {
  return drawRows(
    components,
    (el) => {
    const meta = metaOf(el)
    return meta ? (
      meta.skeleton(el.props)
    ) : (
      <Skeleton className="h-80 rounded-xl" />
    )
    },
    columns
  )
}
