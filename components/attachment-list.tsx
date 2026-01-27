'use client';

import { useState } from 'react';
import {
  Download,
  Trash2,
  Image as ImageIcon,
  FileText,
  Film,
  File,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteAttachment } from '@/app/actions/attachments';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Type representing an attachment record from the database
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
 * AttachmentList - Displays a list of file attachments with download and delete actions
 *
 * Shows file icon based on MIME type, file name, size, and action buttons.
 * Delete button is hidden when readonly is true.
 */
export function AttachmentList({
  attachments,
  onDelete,
  readonly = false,
}: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Handles file download by opening the download API endpoint
   */
  const handleDownload = (attachment: Attachment) => {
    window.open(`/api/attachments/${attachment.id}/download`, '_blank');
  };

  /**
   * Handles attachment deletion with confirmation
   */
  const handleDelete = async (attachment: Attachment) => {
    if (deletingId) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar "${attachment.name}"?`
    );

    if (!confirmed) return;

    setDeletingId(attachment.id);

    try {
      const result = await deleteAttachment({ attachmentId: attachment.id });

      if (result.success) {
        toast.success('Adjunto eliminado');
        onDelete?.();
      } else {
        toast.error(result.error || 'Error al eliminar adjunto');
      }
    } catch {
      toast.error('Error al eliminar adjunto');
    } finally {
      setDeletingId(null);
    }
  };

  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No hay adjuntos
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => {
        const Icon = getFileIcon(attachment.mimeType);
        const iconColor = getFileIconColor(attachment.mimeType);
        const isDeleting = deletingId === attachment.id;

        return (
          <div
            key={attachment.id}
            className={cn(
              'group flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5 transition-colors',
              isDeleting && 'opacity-50 pointer-events-none'
            )}
          >
            {/* File Icon */}
            <Icon className={cn('h-5 w-5 shrink-0', iconColor)} />

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={attachment.name}>
                {attachment.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.sizeBytes)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Download Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(attachment)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Descargar"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Delete Button - only shown if not readonly */}
              {!readonly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(attachment)}
                  disabled={isDeleting}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  title="Eliminar"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
