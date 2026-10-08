// The fields a kit page adds to the filter bar's popover for its own filters
// (`filterParams`, the same `ParamFilter` list its spec resolves). Each is a
// select that writes `?<param>=` in place, like the market select: a discrete
// choice, applied on the spot (product/DESIGN.md → Components, FilterBar).

import { useSearchParams } from "react-router"

import { Field, FieldLabel } from "~/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import type { ParamFilter, ReportFilters } from "~/lib/filters"

export function useParamFilters(
  declared: readonly ParamFilter[] | undefined,
  filters: ReportFilters
) {
  const [, setSearchParams] = useSearchParams()
  if (!declared?.length) return { extra: undefined, summary: undefined }

  const set = (param: string, value: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(param, value)
        return next
      },
      { replace: true }
    )

  const fields = declared.map((d) => {
    const options = d.options(filters)
    const value = filters.params?.[d.param]
    const label = (v: string) => options.find((o) => o.value === v)?.label ?? v
    const isDefault =
      value ===
      (d.default
        ? d.default(
            options.map((o) => o.value),
            filters
          )
        : options[0]?.value)
    return { d, options, value, label, isDefault }
  })

  const extra = fields.some((f) => f.options.length > 0) ? (
    <>
      {fields.map(({ d, options, value, label }) =>
        options.length === 0 || value == null ? null : (
          <Field key={d.param}>
            <FieldLabel htmlFor={`filter-${d.param}`}>{d.label}</FieldLabel>
            <Select
              value={value}
              onValueChange={(v) => set(d.param, String(v))}
            >
              <SelectTrigger id={`filter-${d.param}`} className="w-full">
                {/* The label, not the raw value (DESIGN.md: a select trigger
                    prints the label). */}
                <SelectValue>{(v: unknown) => label(String(v))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )
      )}
    </>
  ) : undefined

  const parts = fields
    .filter(
      (f) =>
        f.value != null && (f.d.summary !== "unlessDefault" || !f.isDefault)
    )
    .map((f) => f.label(f.value!))
  return { extra, summary: parts.length ? parts.join(" · ") : undefined }
}
