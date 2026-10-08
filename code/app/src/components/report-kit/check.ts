// `npm run lint`'s second part: a report folder holds only its `report.tsx`
// and `.sql` files, and every `.sql` file starts with its `-- title` line.
// Series and column names are checked by `npm run typecheck` (define.tsx).
//
// Run: `tsx src/components/report-kit/check.ts` (from app/).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const REPORTS = join(import.meta.dirname, "../../reports")
const problems: string[] = []

const isDir = (p: string) => existsSync(p) && statSync(p).isDirectory()

for (const dir of readdirSync(REPORTS)) {
  if (dir === ".DS_Store") continue
  const abs = join(REPORTS, dir)
  if (!isDir(abs)) {
    problems.push(`${dir}: a report is a folder with a report.tsx`)
    continue
  }
  const files = readdirSync(abs).filter((f) => f !== ".DS_Store")
  if (!files.includes("report.tsx"))
    problems.push(`${dir}/: a report folder needs its report.tsx`)
  for (const f of files) {
    if (f.endsWith(".sql")) {
      const first = readFileSync(join(abs, f), "utf8").split("\n")[0]
      if (!/^--\s*\S/.test(first))
        problems.push(
          `${dir}/${f}: the first line must be its title, as a -- comment`
        )
    } else if (f !== "report.tsx")
      problems.push(
        `${dir}/${f}: a report folder holds only its report.tsx and .sql files`
      )
  }
}

if (problems.length) {
  console.error(problems.map((p) => `  ${p}`).join("\n"))
  console.error(`report-kit check: ${problems.length} problem(s)`)
  process.exit(1)
}
console.log("report-kit check: ok")
