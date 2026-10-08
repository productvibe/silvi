// A reader's appearance choices, each kept in its own cookie so the server
// draws the page in them on the first byte (no flash before they land).
// Client-safe: the Appearance page writes the cookies, root.tsx reads them.
import { APP_ID } from "~/lib/app"
import theme from "~/theme.json"

/** The colours on offer, shared by both settings. */
export const COLOURS = [
  { id: "grey", label: "Greyscale" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "purple", label: "Purple" },
  { id: "orange", label: "Orange" },
  { id: "pink", label: "Pink" },
] as const

export type Colour = (typeof COLOURS)[number]["id"]

/** The preset's pick (theme.json, written with theme.css by `work apply`),
 *  or the app's own default when that file holds no colour of ours. */
const preset = (v: string, fallback: Colour): Colour =>
  isColour(v) ? v : fallback

/** Two independent settings, one attribute on `<html>` each (app.css):
 *  - `tint` — the report charts: a five-step ramp of ONE hue swapped in for
 *    `--chart-1` … `--chart-5`, so ramp order keeps its meaning
 *    (product/DESIGN-REPORTS.md §5). The preset's charts by default.
 *  - `accent` — buttons, checked controls and the focus ring: `--primary`
 *    and `--ring`. The preset's accent by default.
 *  So a reader can have Notion's blue buttons over grey charts, or the
 *  reverse. */
export const APPEARANCE = {
  tint: {
    cookie: `${APP_ID}-tint`,
    fallback: preset(theme.tint, "grey"),
    attr: "tint",
  },
  accent: {
    cookie: `${APP_ID}-accent`,
    fallback: preset(theme.accent, "blue"),
    attr: "accent",
  },
} as const satisfies Record<
  string,
  { cookie: string; fallback: Colour; attr: string }
>

export type AppearanceKey = keyof typeof APPEARANCE
export type Appearance = Record<AppearanceKey, Colour>

export function isColour(v: unknown): v is Colour {
  return COLOURS.some((c) => c.id === v)
}

/** Both choices from a `Cookie` header, each falling back to its default. */
export function appearanceFromCookie(header: string | null): Appearance {
  const cookies = new Map(
    (header ?? "")
      .split(/;\s*/)
      .filter(Boolean)
      .map((c) => {
        const i = c.indexOf("=")
        return [c.slice(0, i), c.slice(i + 1)] as const
      })
  )
  const read = (k: AppearanceKey): Colour => {
    const v = cookies.get(APPEARANCE[k].cookie)
    return isColour(v) ? v : APPEARANCE[k].fallback
  }
  return { tint: read("tint"), accent: read("accent") }
}

/** Write one choice for a year, and apply it to the open page at once. */
export function saveAppearance(key: AppearanceKey, colour: Colour) {
  const { cookie, attr } = APPEARANCE[key]
  document.cookie = `${cookie}=${colour}; path=/; max-age=31536000; samesite=lax`
  document.documentElement.dataset[attr] = colour
}
