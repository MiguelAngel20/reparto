import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectProps {
    value?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
    className?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode
}

export interface SelectContentProps {
    children: React.ReactNode
    className?: string
}

export interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string
    children: React.ReactNode
}

export interface SelectValueProps {
    placeholder?: string
    className?: string
}

const SelectContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
}>({
    open: false,
    setOpen: () => {},
})

export function Select({
    value,
    onValueChange,
    children,
    className,
    open: openProp,
    onOpenChange,
}: SelectProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = openProp !== undefined
    const open = isControlled ? openProp : internalOpen

    const setOpen = React.useCallback(
        (next: boolean) => {
            if (!isControlled) {
                setInternalOpen(next)
            }
            onOpenChange?.(next)
        },
        [isControlled, onOpenChange]
    )

    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className={cn("relative", className)}>{children}</div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
    ({ children, className, ...props }, ref) => {
        const { open, setOpen } = React.useContext(SelectContext)

        return (
            <button
                ref={ref}
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex h-10 w-full max-w-full items-center justify-between rounded-lg border-2 border-slate-300 dark:border-[#3a3a3a]",
                    "bg-white dark:bg-[#1f1f1f]",
                    "px-4 py-2 text-sm",
                    "text-slate-900 dark:text-slate-100",
                    "transition-all duration-200",
                    "hover:bg-slate-50 dark:hover:bg-[#2a2a2a]",
                    "focus:outline-none focus:border-2 focus:border-blue-500 dark:focus:border-blue-400",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-[#2a2a2a]",
                    "overflow-hidden",
                    className
                )}
                {...props}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden text-left w-0">
                    {children}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
            </button>
        )
    }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, children, className }: SelectValueProps & { children?: React.ReactNode }) => {
    const { value } = React.useContext(SelectContext)
    // Si hay children, usarlos (para mostrar el nombre en lugar del ID)
    // Pero si no hay value, mostrar el placeholder
    if (children !== undefined) {
        // Si hay value, mostrar los children (nombre del item seleccionado)
        // Si no hay value, mostrar el placeholder
        const displayText = value ? children : placeholder
        const textValue = typeof displayText === 'string' ? displayText : String(displayText || '')
        return <span className={cn(value ? "" : "text-slate-500", "truncate block min-w-0 w-full", className)} title={textValue}>{displayText}</span>
    }
    // Si no hay children, mostrar el value o placeholder
    return <span className={cn(value ? "" : "text-slate-500", "truncate block min-w-0 w-full", className)} title={value || placeholder}>{value || placeholder}</span>
}
SelectValue.displayName = "SelectValue"

const SelectContent = ({ children, className }: SelectContentProps) => {
    const { open, setOpen } = React.useContext(SelectContext)
    const contentRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [open, setOpen])

    if (!open) return null

    return (
        <div
            ref={contentRef}
                className={cn(
                    "absolute z-50 mt-2 w-full rounded-lg border border-slate-200 dark:border-[#3a3a3a]",
                    "bg-white dark:bg-[#232323]",
                    "shadow-xl shadow-black/10 dark:shadow-black/50",
                    "overflow-hidden",
                    className
                )}
        >
            <div className="p-1">{children}</div>
        </div>
    )
}
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
    ({ value, children, className, ...props }, ref) => {
        const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext)

        return (
            <button
                ref={ref}
                type="button"
                onMouseDown={(e) => {
                    e.preventDefault()
                    onValueChange?.(value)
                    setOpen(false)
                }}
                className={cn(
                    "relative flex w-full cursor-pointer select-none items-center px-3 py-2.5 text-sm outline-none",
                    "text-slate-900 dark:text-slate-100",
                    "transition-colors duration-150",
                    "hover:bg-slate-100 dark:hover:bg-[#2a2a2a]",
                    "focus:bg-slate-100 dark:focus:bg-[#2a2a2a]",
                    selectedValue === value && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium",
                    className
                )}
                {...props}
            >
                {children}
            </button>
        )
    }
)
SelectItem.displayName = "SelectItem"

export { SelectTrigger, SelectValue, SelectContent, SelectItem }

