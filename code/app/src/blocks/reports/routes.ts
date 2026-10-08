import { index, route } from "@react-router/dev/routes"

import type { Module } from "~/modules/modules"

// The reports module: the list of reports at the index, and one report per
// folder of `app/src/reports/` (`report.tsx`) at `:report`, drawn by the
// report-kit's one route (components/report-kit/route.tsx).
export default function routes(module: Module) {
  return route(module.id, "blocks/reports/route.tsx", { id: `module/${module.id}` }, [
    index("blocks/reports/index.tsx", { id: `module/${module.id}/index` }),
    route(":report", "components/report-kit/route.tsx", { id: "kit/report" }),
  ])
}
