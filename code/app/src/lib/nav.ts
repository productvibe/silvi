import type { LucideIcon } from "lucide-react"

import { modules } from "~/modules/modules"

import { moduleIcon } from "./module-icons"

// Navigation is generated from the modules, not hand-listed. The structure of
// the app *is* the module set, so a second list of the same things would only
// be a second place to forget to edit.
export type NavItem = {
  id: string
  title: string
  icon: LucideIcon
  path: string
  /** the palette shows this under the page title */
  description?: string
}

export function modulePath(id: string): string {
  return `/${id}`
}

// One sidebar item per module, in registry order. The order is the registry's,
// not this file's — a second opinion about it would be a second place to forget
// to edit.
export const navItems: NavItem[] = modules.map((module) => ({
  id: module.id,
  title: module.title,
  icon: moduleIcon(module.icon),
  path: modulePath(module.id),
  description: module.purpose,
}))

/** The item a path is in: the module's own page or anything under it. */
export function navItemForPath(pathname: string): NavItem | undefined {
  return navItems.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
  )
}
