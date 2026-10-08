// ESLint here holds the report-kit's guard rails, not a style guide
// (formatting is prettier's). See src/components/report-kit/README.md.
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

import reportKit from "./src/components/report-kit/eslint-plugin.mjs"

export default [
  { ignores: ["build/**", ".react-router/**", "node_modules/**"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    // react-hooks is registered, not enabled: existing code names its rules
    // in disable comments, which must resolve.
    plugins: { "report-kit": reportKit, "react-hooks": reactHooks },
    linterOptions: { reportUnusedDisableDirectives: "off" },
  },
  {
    // Views: everything that renders in the browser. Route modules are left
    // out — their loader imports a spec at runtime, and the build strips it.
    files: ["src/**/*.tsx"],
    ignores: [
      "src/**/route.tsx",
      "src/**/detail.tsx",
      "src/root.tsx",
      "src/**/routes/**",
      "src/**/*.server.tsx",
    ],
    rules: { "report-kit/no-server-runtime": "error" },
  },
]
