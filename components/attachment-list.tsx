'use client';

import { useState } from 'react';
import {
  Download,
  Trash2,
  FileText,
  Image,
  Video,
  File,
  Loader2,
} from 'lucide-react';
import { deleteAttachment } from '@/app/actions/attachments';
import { toast } from 'sonner';

/**
 * Attachment data type (matches DB schema)
 */
type Attachment = {
  id: string;
  taskId: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: Date;
};

type AttachmentListProps = {
  attachments: Attachment[];
  onDelete?: () => void;
  readonly?: boolean;
};

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get icon component based on MIME type
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return Image;
  }
  if (mimeType.startsWith('video/')) {
    return Video;
  }
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation') ||
    mimeType.startsWith('text/')
  ) {
    return FileText;
  }
  return File;
}

/**
 * AttachmentList - List of attachments with download and delete
 *
 * Shows attachments with file icon, name, size, and action buttons.
 * Download links to the API route, delete calls server action.
 * When readonly=true, delete button is hidden.
 */
export function AttachmentList({ attachments, onDelete, readonly }: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (attachmentId: string, fileName: string) => {
    if (deletingId) return; // Prevent double-click

    setDeletingId(attachmentId);

    try {
      const result = await deleteAttachment({ attachmentId });

      if (result.success) {
        toast.success(`"${fileName}" eliminado`);
        onDelete?.();
      } else {
        toast.error(result.error || 'Error al eliminar el archivo');
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Error al eliminar el archivo');
    } finally {
      setDeletingId(null);
    }
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => {
        const IconComponent = getFileIcon(attachment.mimeType);
        const isDeleting = deletingId === attachment.id;

        return (
          <div
            key={attachment.id}
            className="group flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5"
          >
            {/* File icon */}
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 shrink-0">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground/90 truncate" title={attachment.name}>
                {attachment.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.sizeBytes)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Download button */}
              <a
                href={`/api/attachments/${attachment.id}/download`}
                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                title="Descargar"
                download
              >
                <Download className="h-4 w-4" />
              </a>

              {/* Delete button - only shown if not readonly */}
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleDelete(attachment.id, attachment.name)}
                  disabled={isDeleting}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-destructive transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Eliminar"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
