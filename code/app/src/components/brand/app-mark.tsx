/**
 * The in-app mark: the preset's logo, a duotone glyph (outline over a light
 * fill) at the top of the sidebar beside the app's name. theme.json carries the logo (`logo`) and
 * its drawing (`mark`), written by `silvi init`/`apply` from
 * cli/lib/preset.mjs LOGOS, the one list of logos: Lucide icons drawn
 * duotone, or Layers, the default, the kit's own drawing of three stacked
 * layers (product/DESIGN.md → App identity, settled 2026-09-29: a solid mark
 * that reads as one shape at 20 px). It inherits `currentColor`, so it takes
 * the foreground and carries no colour of its own. Layers is also
 * `public/icon.svg`, the browser tab's icon.
 *
 * Neutral on purpose: this is the base's mark, and a fork may redraw it.
 */
import type { SVGAttributes } from "react"

import { cn } from "~/lib/utils"
import theme from "~/theme.json"

/** A logo's drawing: its SVG elements on a 24 px grid, `[tag, attributes]`
 *  with the attributes as SVG spells them (`stroke-width`). */
export type LogoNode = [string, Record<string, string>]

/** Layers, for an app whose theme.json has no drawing (made before logos). */
const LAYERS: LogoNode[] = [
  ["path", { d: "M12 2.75 21 7.5 12 12.25 3 7.5Z", "stroke-width": "1.5" }],
  ["path", { d: "M3 12 12 16.75 21 12", fill: "none", "stroke-width": "2.25" }],
  [
    "path",
    { d: "M3 16.5 12 21.25 21 16.5", fill: "none", "stroke-width": "2.25" },
  ],
]

const PRESET_MARK =
  ((theme as { mark?: unknown }).mark as LogoNode[] | undefined) ?? LAYERS

/** `stroke-width` → `strokeWidth`, as React takes an SVG attribute. */
const camel = (attrs: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => [
      k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ])
  ) as SVGAttributes<SVGElement>

export function AppMark({
  className,
  mark = PRESET_MARK,
}: {
  className?: string
  /** a logo's drawing (preset.mjs LOGOS `svg`); theme.json's by default */
  mark?: LogoNode[]
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillOpacity={0.18}
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // Duotone: the outline in the sidebar icons' grey (`text-icon`) over
      // an 18% fill of it, lighter than a solid shape.
      className={cn("text-icon", className)}
    >
      {mark.map(([Tag, attrs], i) => {
        const El = Tag as "path"
        return (
          <El key={i} {...(camel(attrs) as SVGAttributes<SVGPathElement>)} />
        )
      })}
    </svg>
  )
}
