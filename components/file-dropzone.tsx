'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadAttachment } from '@/app/actions/attachments';
import { toast } from 'sonner';

type FileDropzoneProps = {
  taskId: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
};

/**
 * FileDropzone - Drag and drop file upload component
 *
 * Supports drag & drop and click to select files.
 * Uploads files to Google Drive via server action.
 * Shows upload progress and error states.
 */
export function FileDropzone({ taskId, onUploadComplete, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const uploadFile = async (file: File): Promise<boolean> => {
    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      const result = await uploadAttachment(
        {
          taskId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
        base64
      );

      if (result.success) {
        toast.success(`"${file.name}" subido correctamente`);
        return true;
      } else {
        toast.error(result.error || 'Error al subir el archivo');
        return false;
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Error al subir "${file.name}"`);
      return false;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (disabled || files.length === 0) return;

    setUploading(true);
    const fileArray = Array.from(files);
    setUploadingFiles(fileArray.map(f => f.name));

    let successCount = 0;

    for (const file of fileArray) {
      const success = await uploadFile(file);
      if (success) {
        successCount++;
      }
      // Update remaining files
      setUploadingFiles(prev => prev.filter(name => name !== file.name));
    }

    setUploading(false);
    setUploadingFiles([]);

    if (successCount > 0) {
      onUploadComplete?.();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input to allow re-selecting same file
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  if (disabled) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl border border-dashed border-white/10 bg-white/5 text-muted-foreground text-sm">
        <Upload className="h-4 w-4" />
        <span>Adjuntos bloqueados en tareas completadas</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Dropzone area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${isDragging
            ? 'border-primary/50 bg-primary/10'
            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">
              Subiendo {uploadingFiles.length} archivo{uploadingFiles.length !== 1 ? 's' : ''}...
            </span>
          </>
        ) : (
          <>
            <Upload className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                Arrastra archivos aquí o{' '}
              </span>
              <span className="text-sm text-primary hover:underline">
                haz clic para agregar
              </span>
            </div>
          </>
        )}
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-1">
          {uploadingFiles.map((fileName, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5"
            >
              <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
              <span className="flex-1 text-sm text-muted-foreground truncate">
                {fileName}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
