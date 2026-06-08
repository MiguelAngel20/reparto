import { toast } from "sonner"
import { CheckCircle2, Edit2, Trash2, XCircle } from "lucide-react"

/**
 * Hook personalizado para mostrar toasts reutilizables
 * Proporciona funciones específicas para crear, editar y eliminar
 */
export function useToast() {
    /**
     * Muestra un toast de éxito al crear un registro
     * @param message - Mensaje personalizado (opcional)
     * @param title - Título personalizado (opcional, por defecto "Creado exitosamente")
     */
    const showCreateSuccess = (message?: string, title: string = "Creado exitosamente") => {
        toast.success(title, {
            description: message || "El registro se ha creado correctamente",
            icon: <CheckCircle2 className="h-5 w-5" />,
            duration: 4000,
        })
    }

    /**
     * Muestra un toast de éxito al editar un registro
     * @param message - Mensaje personalizado (opcional)
     * @param title - Título personalizado (opcional, por defecto "Editado exitosamente")
     */
    const showEditSuccess = (message?: string, title: string = "Editado exitosamente") => {
        toast.success(title, {
            description: message || "Los cambios se han guardado correctamente",
            icon: <Edit2 className="h-5 w-5" />,
            duration: 4000,
        })
    }

    /**
     * Muestra un toast de éxito al eliminar un registro
     * @param message - Mensaje personalizado (opcional)
     * @param title - Título personalizado (opcional, por defecto "Eliminado exitosamente")
     */
    const showDeleteSuccess = (message?: string, title: string = "Eliminado exitosamente") => {
        toast.success(title, {
            description: message || "El registro se ha eliminado correctamente",
            icon: <Trash2 className="h-5 w-5" />,
            duration: 4000,
        })
    }

    /**
     * Muestra un toast de error genérico
     * @param message - Mensaje de error
     * @param title - Título del error (opcional, por defecto "Error")
     */
    const showError = (message: string, title: string = "Error") => {
        toast.error(title, {
            description: message,
            icon: <XCircle className="h-5 w-5" />,
            duration: 4000,
        })
    }

    /**
     * Muestra un toast de información
     * @param message - Mensaje informativo
     * @param title - Título (opcional)
     */
    const showInfo = (message: string, title?: string) => {
        toast.info(title || "Información", {
            description: message,
            duration: 3000,
        })
    }

    /**
     * Muestra un toast de éxito genérico
     * @param message - Mensaje de éxito
     * @param title - Título (opcional, por defecto "Éxito")
     */
    const showSuccess = (message?: string, title: string = "Éxito") => {
        toast.success(title, {
            description: message || "Operación completada correctamente",
            icon: <CheckCircle2 className="h-5 w-5" />,
            duration: 4000,
        })
    }

    return {
        showCreateSuccess,
        showEditSuccess,
        showDeleteSuccess,
        showError,
        showInfo,
        showSuccess,
    }
}

