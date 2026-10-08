import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

// The sticky ContentHeader (breadcrumbs + refresh icon) is rendered by the app
// shell, one level ABOVE the routed page — so a report can't pass it props.
// This slot bridges the two: the header registers a mount node, and any report
// inside the <Outlet> can portal controls into it. Used for the report "(i)"
// dialog trigger, which belongs in the global header rather than beside each
// page's own title.

type Slot = {
  node: HTMLElement | null
  setNode: (node: HTMLElement | null) => void
}

const HeaderSlotContext = createContext<Slot | null>(null)

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLElement | null>(null)
  return (
    <HeaderSlotContext.Provider value={{ node, setNode }}>
      {children}
    </HeaderSlotContext.Provider>
  )
}

/** The mount point — rendered once, by ContentHeader. */
export function HeaderSlotTarget({ className }: { className?: string }) {
  const slot = useContext(HeaderSlotContext)
  return <div ref={slot?.setNode} data-header-slot="" className={className} />
}

/** Renders `children` into the header slot. Nothing until the header has
 *  mounted its target (and nothing at all on pages without a header). */
export function HeaderSlot({ children }: { children?: ReactNode }) {
  const slot = useContext(HeaderSlotContext)
  // The context node is the normal path. The fallback covers the streaming case:
  // a slow report's body is hydrated inside a `<div hidden>` and swapped in
  // afterwards, and can miss the provider's state update — so look the target up
  // once after mount and portal into that.
  const [fallback, setFallback] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!slot?.node) {
      setFallback(document.querySelector<HTMLElement>("[data-header-slot]"))
    }
  }, [slot?.node])

  const target = slot?.node ?? fallback
  if (!children || !target) return null
  return createPortal(children, target)
}
