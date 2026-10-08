// The driver tree's canvas (visual-components.tsx `DriverTree`, loaded when a
// page has one, with its stylesheet): KPI cards as React Flow nodes, joined
// parent → child by floating bezier edges that meet the facing side of each
// card. The layout is static: the rows' own `x` / `y` when every row has
// them, else a top-down tree. The canvas pans and zooms; nothing is saved.

import { useEffect, useMemo, useState } from "react"
import {
  Background,
  Controls,
  getBezierPath,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useInternalNode,
  useStore,
  useStoreApi,
  type Edge,
  type EdgeProps,
  type InternalNode,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { Skeleton } from "~/components/ui/skeleton"
import { cn } from "~/lib/utils"

import type { Row } from "./context"
import { fmt, type Fmt, type FmtSpec } from "./format"

/** Which column holds each part of a node (default: the part's own name). */
export type NodeColumns = {
  /** the node's key, which a child's `parent` names */
  id?: string
  /** the parent's id (blank on the root) */
  parent?: string
  label?: string
  /** the figure */
  value?: string
  /** the figure's target: "/ target" after it, emerald when on track */
  target?: string
  /** a text column naming the row's format ("number", "percent", …) */
  format?: string
  /** "up" (default) or "down": which way is on track */
  direction?: string
  /** a text column: the muted line under the figure (its formula) */
  line?: string
  /** a column of `{label, value, format?, prefix?, suffix?, decimals?}`
   *  cells, drawn two across in place of the figure */
  cells?: string
  /** a boolean column: the wider, darker-edged card (the root) */
  accent?: string
  /** numeric columns: the card's place on the canvas */
  x?: string
  y?: string
}

export type DriverTreeProps = {
  rows: Row[]
  node?: NodeColumns
  /** the figures' format when a row names none */
  format?: Fmt
  /** the canvas' height class */
  height?: string
}

type Cell = FmtSpec & { label: string; value: unknown }

type Card = {
  label: string
  value?: string
  target?: string
  onTrack: boolean | null
  line?: string
  cells?: { label: string; value: string }[]
  accent: boolean
}

const H_GAP = 250
const V_GAP = 180

export default function DriverTreeCanvas(props: DriverTreeProps) {
  // React Flow measures the DOM: drawn after mount only.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted)
    return <Skeleton className={cn("w-full rounded-xl", props.height)} />
  return <Canvas {...props} />
}

function Canvas({ rows, node = {}, format, height }: DriverTreeProps) {
  const { nodes, edges } = useMemo(
    () => buildGraph(rows, node, format),
    [rows, node, format]
  )
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border bg-muted/40",
        height
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        zoomOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} color="var(--border)" />
        <Controls showInteractive={false} />
        <MeasureNodes />
      </ReactFlow>
    </div>
  )
}

function buildGraph(
  rows: Row[],
  cols: NodeColumns,
  format?: Fmt
): { nodes: Node[]; edges: Edge[] } {
  const c = (k: keyof NodeColumns) => cols[k] ?? k
  const id = (r: Row) => String(r[c("id")] ?? "")
  const parentOf = (r: Row) => {
    const v = r[c("parent")]
    return v == null || v === "" ? null : String(v)
  }
  const ids = new Set(rows.map(id))
  const children = new Map<string | null, Row[]>()
  for (const r of rows) {
    const p = parentOf(r)
    const key = p != null && ids.has(p) ? p : null
    if (!children.has(key)) children.set(key, [])
    children.get(key)!.push(r)
  }
  // A top-down tree: leaves side by side, a parent over its children.
  const pos = new Map<string, { x: number; y: number }>()
  let leaf = 0
  const place = (r: Row, depth: number): number => {
    const kids = children.get(id(r)) ?? []
    const x = kids.length
      ? (() => {
          const xs = kids.map((k) => place(k, depth + 1))
          return (xs[0] + xs[xs.length - 1]) / 2
        })()
      : leaf++ * H_GAP
    pos.set(id(r), { x, y: depth * V_GAP })
    return x
  }
  for (const root of children.get(null) ?? []) place(root, 0)
  const own = (r: Row) => {
    const x = Number(r[c("x")])
    const y = Number(r[c("y")])
    return r[c("x")] != null && r[c("y")] != null && Number.isFinite(x) && Number.isFinite(y)
      ? { x, y }
      : null
  }
  const fixed = rows.length > 0 && rows.every((r) => own(r) != null)

  const nodes: Node[] = rows.map((r) => ({
    id: id(r),
    type: "metric",
    position: (fixed ? own(r) : pos.get(id(r))) ?? { x: 0, y: 0 },
    data: card(r, c, format) as unknown as Record<string, unknown>,
  }))
  const edges: Edge[] = rows.flatMap((r) => {
    const p = parentOf(r)
    if (p == null || !ids.has(p)) return []
    return [
      {
        id: `${p}-${id(r)}`,
        source: p,
        target: id(r),
        type: "floating",
        style: { stroke: "var(--muted-foreground)", strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: "var(--muted-foreground)",
        },
      },
    ]
  })
  return { nodes, edges }
}

function card(r: Row, c: (k: keyof NodeColumns) => string, format?: Fmt): Card {
  const f: FmtSpec = { format: (r[c("format")] as Fmt | undefined) ?? format }
  const num = (k: keyof NodeColumns) => {
    const v = r[c(k)]
    return v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v)
  }
  const value = num("value")
  const target = num("target")
  const down = r[c("direction")] === "down"
  const cells = Array.isArray(r[c("cells")])
    ? (r[c("cells")] as Cell[]).map((x) => ({
        label: String(x.label ?? ""),
        value: fmt(x.value, x),
      }))
    : undefined
  // A node with neither a figure nor a target is a heading over its
  // children (no "–"); one with a target and no figure prints the dash.
  const hasValue = value != null || target != null
  return {
    label: String(r[c("label")] ?? ""),
    value: hasValue ? fmt(r[c("value")], f) : undefined,
    target: target != null ? fmt(target, f) : undefined,
    onTrack:
      value != null && target != null
        ? down
          ? value <= target
          : value >= target
        : null,
    line: r[c("line")] != null && r[c("line")] !== "" ? String(r[c("line")]) : undefined,
    cells,
    accent: Boolean(r[c("accent")]),
  }
}

// ── Nodes ──────────────────────────────────────────────────────────────────

function MetricNode({ data }: { data: Card }) {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <MetricCard card={data} />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </>
  )
}

/** A KPI card: the label, the figure "/ target" (emerald on track — the one
 *  sanctioned non-grey, muted off track), its formula in muted text; or two
 *  columns of cells for a node that is a summary of several figures. */
function MetricCard({ card: n }: { card: Card }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border bg-card p-3",
        n.accent ? "w-64 border-foreground/40" : "w-52"
      )}
    >
      <div className="text-xs font-medium text-muted-foreground">{n.label}</div>
      {n.cells ? (
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2">
          {n.cells.map((e) => (
            <div key={e.label} className="flex flex-col">
              <span className="text-[11px] text-muted-foreground">{e.label}</span>
              <span className="text-base font-semibold tracking-tight tabular-nums">
                {e.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        n.value != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight tabular-nums">
              {n.value}
            </span>
            {n.target != null && (
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  n.onTrack ? "text-emerald-600" : "text-muted-foreground"
                )}
              >
                / {n.target}
              </span>
            )}
          </div>
        )
      )}
      {n.line && (
        <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {n.line}
        </div>
      )}
    </div>
  )
}

// ── Edges: to the nearest facing side of each card ─────────────────────────

/** Where the line between two node centres crosses the first node's box. */
function nodeIntersection(node: InternalNode, other: InternalNode) {
  const { width: w = 0, height: h = 0 } = node.measured
  const a = node.internals.positionAbsolute
  const b = other.internals.positionAbsolute
  const w2 = w / 2
  const h2 = h / 2
  const cx = a.x + w2
  const cy = a.y + h2
  const ox = b.x + (other.measured.width ?? 0) / 2
  const oy = b.y + (other.measured.height ?? 0) / 2
  const dx = (ox - cx) / (2 * w2 || 1) - (oy - cy) / (2 * h2 || 1)
  const dy = (ox - cx) / (2 * w2 || 1) + (oy - cy) / (2 * h2 || 1)
  const scale = 1 / (Math.abs(dx) + Math.abs(dy) || 1)
  return {
    x: w2 * (scale * dx + scale * dy) + cx,
    y: h2 * (-scale * dx + scale * dy) + cy,
  }
}

function intersectionSide(node: InternalNode, p: { x: number; y: number }) {
  const a = node.internals.positionAbsolute
  const w = node.measured.width ?? 0
  const h = node.measured.height ?? 0
  if (Math.round(p.x) <= Math.round(a.x) + 1) return Position.Left
  if (Math.round(p.x) >= Math.round(a.x + w) - 1) return Position.Right
  if (Math.round(p.y) <= Math.round(a.y) + 1) return Position.Top
  return Position.Bottom
}

function FloatingEdge({ id, source, target, markerEnd, style }: EdgeProps) {
  const s = useInternalNode(source)
  const t = useInternalNode(target)
  if (!s || !t) return null
  const sp = nodeIntersection(s, t)
  const tp = nodeIntersection(t, s)
  const [path] = getBezierPath({
    sourceX: sp.x,
    sourceY: sp.y,
    sourcePosition: intersectionSide(s, sp),
    targetX: tp.x,
    targetY: tp.y,
    targetPosition: intersectionSide(t, tp),
  })
  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={path}
      markerEnd={markerEnd}
      style={style}
    />
  )
}

/** React Flow measures nodes with a ResizeObserver to place the edges; under
 *  SSR + Suspense that first measure does not always fire, so the edges
 *  never draw. Re-measure every node once it is in the DOM. */
function MeasureNodes() {
  const api = useStoreApi()
  const ids = useStore((s) => s.nodes.map((n) => n.id).join(","))
  useEffect(() => {
    const t = setTimeout(() => {
      const { updateNodeInternals } = api.getState()
      const updates = new Map()
      for (const id of ids.split(",")) {
        const el = document.querySelector<HTMLElement>(
          `.react-flow__node[data-id="${CSS.escape(id)}"]`
        )
        if (el) updates.set(id, { id, nodeElement: el, force: true })
      }
      if (updates.size) updateNodeInternals(updates)
    }, 0)
    return () => clearTimeout(t)
  }, [ids, api])
  return null
}

const NODE_TYPES = { metric: MetricNode }
const EDGE_TYPES = { floating: FloatingEdge }
