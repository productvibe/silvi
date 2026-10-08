import { redirect } from "react-router"

// Settings is a section, not a page: the sidebar swaps to its own menu
// (routes/shell.tsx) and /settings itself is only the way in, to the first
// item.
export function loader() {
  return redirect("/settings/appearance")
}
