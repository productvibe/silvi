import {
  type RouteConfig,
  type RouteConfigEntry,
  index,
  layout,
  route,
} from "@react-router/dev/routes"

import { modules, type Module } from "./modules/modules"

// Each block's routes for one module, from `blocks/<block>/routes.ts`. Read
// from the folder, so a block copied in brings its routes with it.
const blockRoutes = import.meta.glob<(module: Module) => RouteConfigEntry>(
  "./blocks/*/routes.ts",
  { eager: true, import: "default" }
)

// One route per module, generated from the registry (`modules/`): the
// module's block decides which screen serves it. Adding a module or a block
// adds its route with no edit here.
function moduleRoute(module: Module) {
  // The wiki — one `.md` file per page under app-root `wiki/`, the folder tree
  // as the navigation. One splat route; the loader resolves the slug
  // (wiki/route.tsx). Part of the base, so not a folder in `blocks/`.
  if (module.block === "pages") return route(`${module.id}/*`, "wiki/route.tsx")
  return blockRoutes[`./blocks/${module.block}/routes.ts`](module)
}

export default [
  index("routes/home.tsx"),
  // resource route backing the ⌘K search palette
  route("search", "routes/search.ts"),
  // A wiki page as a file — .md, .doc or .pdf by `?format=` — behind the
  // Download glyph on every wiki page. A resource route, outside the shell.
  route("wiki-export/*", "wiki/export.ts"),
  layout("routes/shell.tsx", [
    ...modules.map(moduleRoute),
    // Settings is a section with its own sidebar menu (routes/shell.tsx):
    // Appearance, then one section per module. /settings itself only
    // redirects to the first item.
    route("settings", "routes/settings.tsx"),
    route("settings/appearance", "routes/settings.appearance.tsx"),
    route("settings/:module", "routes/settings.module.tsx"),
  ]),
] satisfies RouteConfig
