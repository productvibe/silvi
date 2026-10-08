import { redirect } from "react-router"

import { navItems } from "~/lib/nav"

/** Where the app opens: the first module in the registry. */
export function loader() {
  return redirect(navItems[0].path)
}
