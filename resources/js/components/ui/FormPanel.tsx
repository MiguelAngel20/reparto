"use client"

import * as React from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface FormPanelProps {
    /**
     * Controla si el panel está abierto
     */
    open: boolean
    /**
     * Callback cuando se cierra el panel
     */
    onOpenChange: (open: boolean) => void
    /**
     * Título del panel
     */
    title: string
    /**
     * Descripción opcional del panel
     */
    description?: string
    /**
     * Contenido del formulario (inputs, etc.)
     */
    children: React.ReactNode
    /**
     * Contenido del footer (botones de acción)
     */
    footer?: React.ReactNode
    /**
     * Acciones adicionales en el header (botones, etc.)
     */
    headerActions?: React.ReactNode
    /**
     * Lado desde donde se abre el panel (por defecto "right")
     */
    side?: "top" | "right" | "bottom" | "left"
    /**
     * Ancho del panel (por defecto "sm:max-w-lg")
     */
    className?: string
}

/**
 * Componente base reutilizable para paneles de formularios (crear/editar)
 * Maneja la estructura común: header, body, footer
 * 
 * @example
 * ```tsx
 * <FormPanel
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Crear Sucursal"
 *   description="Completa los datos para crear una nueva sucursal"
 *   footer={
 *     <>
 *       <Button onClick={() => setIsOpen(false)}>Cancelar</Button>
 *       <Button variant="primary" onClick={handleSubmit}>Guardar</Button>
 *     </>
 *   }
 * >
 *   <Input ... />
 *   <Input ... />
 * </FormPanel>
 * ```
 */
export default function FormPanel({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    headerActions,
    side = "right",
    className,
}: FormPanelProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side={side}
                className={cn(
                    "sm:max-w-lg",
                    "max-[500px]:inset-0 max-[500px]:h-full max-[500px]:w-full max-[500px]:max-w-none max-[500px]:rounded-none",
                    className
                )}
            >
                <SheetHeader className="border-b border-slate-200 dark:border-[#2b2b2b] pb-6 mb-6">
                    <div className="flex items-start justify-between gap-4 pr-12">
                        <div className="flex-1 min-w-0">
                            <SheetTitle className="text-xl font-semibold tracking-tight truncate pr-2">{title}</SheetTitle>
                            {description && (
                                <SheetDescription className="mt-2 text-sm leading-relaxed">
                                    {description}
                                </SheetDescription>
                            )}
                        </div>
                        {headerActions && (
                            <div className="flex items-center gap-2 shrink-0">
                                {headerActions}
                            </div>
                        )}
                    </div>
                </SheetHeader>

                {/* Contenido del formulario */}
                <div className="flex-1 min-h-0 flex flex-col overflow-y-auto px-1">
                    <div className="flex-1 min-h-0 flex flex-col">
                        {children}
                    </div>
                </div>

                {/* Footer con botones de acción */}
                {footer && (
                    <SheetFooter className="border-t border-slate-200 dark:border-[#2b2b2b] pt-6 mt-6">
                        {footer}
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    )
}