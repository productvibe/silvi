import {
  useRouteLoaderData,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router"

import { Toaster } from "~/components/ui/sonner"
import { APP_NAME } from "~/lib/app"
import { appearanceFromCookie } from "~/lib/appearance"

import type { Route } from "./+types/root"
import "./app.css"

/** The reader's appearance (Settings → Appearance: chart tint, button
 *  colour), read from its cookies so the first byte is already drawn in it. */
export function loader({ request }: Route.LoaderArgs) {
  return {
    ...appearanceFromCookie(request.headers.get("Cookie")),
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const root = useRouteLoaderData<typeof loader>("root")
  return (
    <html lang="en" data-tint={root?.tint} data-accent={root?.accent}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        {/* App-level toasts — the wiki's "Copied as Markdown" is the first
            caller (2026-09-20). One mount, here, so no page carries its own. */}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

/** The browser tab's icon: the app mark as an SVG (public/icon.svg), with
 *  `favicon.ico` left as the fallback for browsers that take no SVG. */
export function links() {
  return [{ rel: "icon", href: "/icon.svg", type: "image/svg+xml" }]
}

// App-level default document title. Routes that set their own `meta` (the wiki,
// Settings, …) override it; everything else shows the app's name.
export function meta() {
  return [{ title: APP_NAME }]
}

export default function App() {
  return <Outlet />
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!"
  let details = "An unexpected error occurred."
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error"
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
