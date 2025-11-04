"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AccordionContextValue {
  openItems: Set<string>
  toggleItem: (id: string) => void
  type: "single" | "multiple"
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple"
  defaultValue?: string | string[]
}

export function Accordion({
  className,
  children,
  type = "single",
  defaultValue,
  ...props
}: AccordionProps) {
  const initial = React.useMemo(() => {
    if (type === "multiple") {
      return new Set(Array.isArray(defaultValue) ? defaultValue : [])
    }
    return new Set(typeof defaultValue === "string" ? [defaultValue] : [])
  }, [type, defaultValue])

  const [openItems, setOpenItems] = React.useState<Set<string>>(initial)

  const toggleItem = React.useCallback(
    (id: string) => {
      setOpenItems(prev => {
        const next = new Set(prev)
        const isOpen = next.has(id)
        if (type === "single") {
          next.clear()
          if (!isOpen) next.add(id)
        } else {
          if (isOpen) next.delete(id)
          else next.add(id)
        }
        return next
      })
    },
    [type]
  )

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function AccordionItem({ className, children, value, ...props }: AccordionItemProps) {
  return (
    <div className={cn("border-b border-foreground/10", className)} data-value={value} {...props}>
      {children}
    </div>
  )
}

export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function AccordionTrigger({ className, children, value, ...props }: AccordionTriggerProps) {
  const ctx = React.useContext(AccordionContext)
  const isOpen = !!ctx?.openItems.has(value)

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${value}`}
      onClick={() => ctx?.toggleItem(value)}
      className={cn(
        "w-full flex items-center justify-between py-3 text-left text-sm font-medium transition-colors",
        "hover:text-foreground",
        className
      )}
      {...props}
    >
      <span>{children}</span>
      <span className={cn("transition-transform", isOpen ? "rotate-180" : "rotate-0")}>⌄</span>
    </button>
  )
}

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

export function AccordionContent({ className, children, value, ...props }: AccordionContentProps) {
  const ctx = React.useContext(AccordionContext)
  const isOpen = !!ctx?.openItems.has(value)

  return (
    <div
      id={`accordion-content-${value}`}
      role="region"
      className={cn(
        "overflow-hidden text-sm text-muted-foreground",
        isOpen ? "animate-accordion-down" : "animate-accordion-up h-0",
        className
      )}
      {...props}
    >
      <div className="pb-4">
        {children}
      </div>
    </div>
  )
}

export const AccordionTriggerContent = ({
  header,
  description,
}: { header: string; description?: string }) => (
  <div>
    <div className="text-foreground">{header}</div>
    {description && <div className="text-xs text-muted-foreground">{description}</div>}
  </div>
)


