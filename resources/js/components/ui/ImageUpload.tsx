import * as React from "react"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import Button from "./Button"

export interface ImageUploadProps {
    /**
     * Valor actual (URL de la imagen o null)
     */
    value?: string | null
    /**
     * Callback cuando se selecciona una imagen
     */
    onChange?: (file: File | null) => void
    /**
     * Texto del label
     */
    label?: string
    /**
     * Descripción opcional
     */
    description?: string
    /**
     * Clases adicionales
     */
    className?: string
    /**
     * Si está deshabilitado
     */
    disabled?: boolean
}

/**
 * Componente moderno para cargar imágenes
 * Incluye preview, drag & drop, y diseño limpio
 */
export default function ImageUpload({
    value,
    onChange,
    label = "Foto / Logo",
    description,
    className,
    disabled = false,
}: ImageUploadProps) {
    const [preview, setPreview] = React.useState<string | null>(value || null)
    const [isDragging, setIsDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Actualizar preview cuando cambia el value
    React.useEffect(() => {
        setPreview(value || null)
    }, [value])

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith("image/")) {
            alert("Por favor selecciona una imagen válida")
            return
        }

        // Crear preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreview(reader.result as string)
        }
        reader.readAsDataURL(file)

        onChange?.(file)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleRemove = () => {
        setPreview(null)
        onChange?.(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className={cn("space-y-2", className)}>
            {label && (
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5 block">
                    {label}
                </label>
            )}
            {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {description}
                </p>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled}
            />

            {preview ? (
                <div className="relative group">
                    <div className="relative rounded-lg border-2 border-slate-200 dark:border-[#2b2b2b] overflow-hidden bg-slate-50 dark:bg-[#1f1f1f]">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                    </div>
                    <Button
                        type="button"
                        variant="danger"
                        iconOnly
                        leftIcon={<X className="h-4 w-4" />}
                        onClick={handleRemove}
                        disabled={disabled}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10"
                        tooltip="Eliminar imagen"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        leftIcon={<Upload className="h-4 w-4" />}
                        onClick={handleClick}
                        disabled={disabled}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-10 bg-white dark:bg-[#2a2a2a] border-2 border-slate-300 dark:border-[#3a3a3a] hover:bg-slate-50 dark:hover:bg-[#333333] font-medium"
                    >
                        Cambiar imagen
                    </Button>
                </div>
            ) : (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={handleClick}
                    className={cn(
                        "relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer",
                        isDragging
                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                            : "border-slate-300 dark:border-[#3a3a3a] hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-[#1f1f1f]/50",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-4 mb-4">
                            <ImageIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                            {isDragging ? "Suelta la imagen aquí" : "Haz clic para subir o arrastra"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            PNG, JPG o GIF (máx. 5MB)
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

