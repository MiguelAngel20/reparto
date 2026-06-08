import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import Button from "@/components/ui/Button"
import { AlertTriangle } from "lucide-react"

export interface ConfirmDialogProps {
    /**
     * Controla si el diálogo está abierto
     */
    open: boolean
    /**
     * Callback cuando se cierra el diálogo
     */
    onOpenChange: (open: boolean) => void
    /**
     * Título del diálogo
     */
    title: string
    /**
     * Mensaje de descripción/advertencia
     */
    message: string
    /**
     * Texto del botón de confirmar (por defecto "Aceptar")
     */
    confirmText?: string
    /**
     * Texto del botón de cancelar (por defecto "Cancelar")
     */
    cancelText?: string
    /**
     * Variante del botón de confirmar (por defecto "danger")
     */
    confirmVariant?: "danger" | "primary" | "default"
    /**
     * Callback que se ejecuta cuando se confirma
     */
    onConfirm: () => void
    /**
     * Si es true, muestra un estado de carga
     */
    loading?: boolean
}

/**
 * Componente de diálogo de confirmación moderno y centrado
 * Útil para confirmar acciones destructivas como eliminar
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Eliminar sucursal"
 *   message="¿Estás seguro de que deseas eliminar esta sucursal? Esta acción no se puede deshacer."
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    message,
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    confirmVariant = "danger",
    onConfirm,
    loading = false,
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/20">
                            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <DialogTitle className="text-left">{title}</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2 text-left text-base">
                        {message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="flex-1 sm:flex-initial"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={confirmVariant}
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 sm:flex-initial"
                    >
                        {loading ? "Eliminando..." : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

