import {
  BookText,
  ChartColumn,
  Pilcrow,
  type LucideIcon,
} from "lucide-react"

// The sidebar mark for each module, by the `icon` name in its registry entry.
//
// Separate from the registry (`~/modules/modules`) because the registry is read
// by things with no screen — `routes.ts` at build time — where importing an
// icon would pull in `lucide-react` and React behind it.
//
// Chosen for structure over metaphor — a briefcase or a handshake says
// "office", not what the module holds. Prefer the quieter, more geometric
// member of a lucide family.
const MODULE_ICONS: Record<string, LucideIcon> = {
  book: BookText,
  chart: ChartColumn,
}

/** The mark for an icon name. A module whose icon is not listed here gets
 *  `Pilcrow` rather than a crash: the nav is generated, and a missing icon
 *  should not be able to take the sidebar down with it. */
export function moduleIcon(name: string): LucideIcon {
  return MODULE_ICONS[name] ?? Pilcrow
}
