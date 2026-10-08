import type { Config } from "@react-router/dev/config"

export default {
  // Source lives in src/ (React Router's default is app/, which nested as
  // app/src/ inside this repo's app/ package).
  appDirectory: "src",
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
} satisfies Config
