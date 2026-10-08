import { data } from "react-router"

import type { Route } from "./+types/settings.module"
import { Facts, SettingsPage } from "~/components/settings/page"
import { APP_NAME } from "~/lib/app"
import { moduleById } from "~/modules/modules"

// One module's section in Settings: what the module is, read from its registry
// entry. One route serves every module, so a module added to the registry has
// its section with no new code. Read-only: the registry is changed by asking
// Claude, not here.

export function loader({ params }: Route.LoaderArgs) {
  const module = moduleById(params.module)
  if (!module) throw data(`No module "${params.module}"`, { status: 404 })
  return { id: module.id }
}

export const meta: Route.MetaFunction = ({ data }) => [
  {
    title: `${moduleById(data?.id)?.title ?? "Module"} — Settings — ${APP_NAME}`,
  },
]

export default function SettingsModule({ loaderData }: Route.ComponentProps) {
  const module = moduleById(loaderData.id)!
  const facts: [string, React.ReactNode][] = [
    ["Name", module.title],
    ["Block", module.block],
  ]
  facts.push([
    "Data",
    <span key="data" className="font-mono text-xs">
      {module.folder}
    </span>,
  ])
  return (
    <SettingsPage title={module.title} subtitle={module.purpose}>
      <Facts items={facts} />
    </SettingsPage>
  )
}
