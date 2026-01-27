'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadAttachment } from '@/app/actions/attachments';
import { cn } from '@/lib/utils';

type FileDropzoneProps = {
  taskId: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
};

/**
 * FileDropzone - Drag and drop file upload component
 *
 * Allows users to upload files by dragging them into the dropzone
 * or clicking to open the file browser. Uses base64 encoding to send
 * files to the server action.
 */
export function FileDropzone({
  taskId,
  onUploadComplete,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  /**
   * Converts a File to base64 string
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64 || '');
      };
      reader.onerror = (error) => reject(error);
    });
  };

  /**
   * Handles file upload
   */
  const handleUpload = useCallback(
    async (files: FileList | File[]) => {
      if (disabled || isUploading) return;

      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setIsUploading(true);

      let successCount = 0;
      let errorCount = 0;

      for (const file of fileArray) {
        try {
          const fileBase64 = await fileToBase64(file);

          const result = await uploadAttachment({
            taskId,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            fileBase64,
          });

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            toast.error(result.error || 'Error al subir archivo');
          }
        } catch {
          errorCount++;
          toast.error(`Error al procesar ${file.name}`);
        }
      }

      setIsUploading(false);

      if (successCount > 0) {
        const message =
          successCount === 1
            ? 'Archivo subido correctamente'
            : `${successCount} archivos subidos correctamente`;
        toast.success(message);
        onUploadComplete?.();
      }

      if (errorCount > 0 && successCount > 0) {
        toast.warning(`${errorCount} archivo(s) no se pudieron subir`);
      }
    },
    [taskId, disabled, isUploading, onUploadComplete]
  );

  /**
   * Drag event handlers
   */
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      dragCounterRef.current++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleUpload(files);
      }
    },
    [disabled, handleUpload]
  );

  /**
   * Click handler to open file browser
   */
  const handleClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  /**
   * File input change handler
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files);
    }
    // Reset the input so the same file can be uploaded again
    e.target.value = '';
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/10'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:border-white/10',
        isUploading && 'pointer-events-none'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
      />

      <div className="flex flex-col items-center justify-center gap-2 py-6 px-4">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Subiendo archivos...</p>
          </>
        ) : (
          <>
            <Upload
              className={cn(
                'h-8 w-8 transition-transform',
                isDragging ? 'text-primary scale-110 animate-bounce' : 'text-muted-foreground'
              )}
            />
            <div className="text-center">
              <p className="text-sm text-foreground/80">
                {isDragging
                  ? 'Suelta los archivos aquí'
                  : 'Arrastra archivos aquí o haz clic para agregar'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Imágenes, videos o documentos
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
