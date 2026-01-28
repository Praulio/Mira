'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Film, File, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Maximum file size in bytes (50MB)
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Maximum number of pending files
 */
const MAX_FILES = 10;

/**
 * Allowed MIME type patterns
 */
const ALLOWED_TYPES = [
  'image/',
  'video/',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/',
];

type PendingFilePickerProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

/**
 * Formats bytes to human-readable size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Returns the appropriate icon component based on MIME type
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return ImageIcon;
  }
  if (mimeType.startsWith('video/')) {
    return Film;
  }
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('text') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation')
  ) {
    return FileText;
  }
  return File;
}

/**
 * Returns the icon color class based on MIME type
 */
function getFileIconColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'text-blue-400';
  }
  if (mimeType.startsWith('video/')) {
    return 'text-purple-400';
  }
  if (mimeType === 'application/pdf') {
    return 'text-red-400';
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return 'text-green-400';
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return 'text-orange-400';
  }
  return 'text-muted-foreground';
}

/**
 * Checks if a file type is allowed
 */
function isAllowedType(mimeType: string): boolean {
  return ALLOWED_TYPES.some((allowed) => mimeType.startsWith(allowed));
}

/**
 * PendingFilePicker - Component for selecting files before upload
 *
 * Allows users to select files via drag & drop or file browser.
 * Files are stored in memory until the parent component uploads them.
 * Validates file size and type on the client side.
 */
export function PendingFilePicker({
  files,
  onFilesChange,
  disabled = false,
}: PendingFilePickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  /**
   * Validates and adds files to the pending list
   */
  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      if (disabled) return;

      const fileArray = Array.from(newFiles);
      const validFiles: File[] = [];

      for (const file of fileArray) {
        // Check max files limit
        if (files.length + validFiles.length >= MAX_FILES) {
          toast.error(`Máximo ${MAX_FILES} archivos permitidos`);
          break;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`"${file.name}" excede el límite de 50MB`);
          continue;
        }

        // Check file type
        if (!isAllowedType(file.type)) {
          toast.error(`"${file.name}" no es un tipo de archivo permitido`);
          continue;
        }

        // Check for duplicates by name
        const isDuplicate = files.some((f) => f.name === file.name && f.size === file.size);
        if (isDuplicate) {
          toast.warning(`"${file.name}" ya está en la lista`);
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        onFilesChange([...files, ...validFiles]);
      }
    },
    [files, onFilesChange, disabled]
  );

  /**
   * Removes a file from the pending list
   */
  const removeFile = useCallback(
    (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    },
    [files, onFilesChange]
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

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        addFiles(droppedFiles);
      }
    },
    [disabled, addFiles]
  );

  /**
   * Click handler to open file browser
   */
  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  /**
   * File input change handler
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/10'
            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:border-white/10'
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

        <div className="flex flex-col items-center justify-center gap-1.5 py-4 px-4">
          <Upload
            className={cn(
              'h-6 w-6 transition-transform',
              isDragging ? 'text-primary scale-110' : 'text-muted-foreground'
            )}
          />
          <p className="text-xs text-muted-foreground text-center">
            {isDragging ? 'Suelta aquí' : 'Arrastra archivos o haz clic'}
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, index) => {
            const Icon = getFileIcon(file.type);
            const iconColor = getFileIconColor(file.type);

            return (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5"
              >
                <Icon className={cn('h-4 w-4 shrink-0', iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={disabled}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50"
                  title="Quitar archivo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* File count indicator */}
      {files.length > 0 && (
        <p className="text-[10px] text-muted-foreground text-right">
          {files.length} de {MAX_FILES} archivos
        </p>
      )}
    </div>
  );
}
