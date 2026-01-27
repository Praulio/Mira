'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Trash2,
  FileText,
  Film,
  File,
  Loader2,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
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
 * Check if MIME type is an image
 */
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Lightbox component for fullscreen image viewing
 */
function Lightbox({
  attachment,
  attachments,
  onClose,
  onNavigate,
}: {
  attachment: Attachment;
  attachments: Attachment[];
  onClose: () => void;
  onNavigate: (attachment: Attachment) => void;
}) {
  const imageAttachments = attachments.filter((a) => isImage(a.mimeType));
  const currentIndex = imageAttachments.findIndex((a) => a.id === attachment.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < imageAttachments.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(imageAttachments[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, imageAttachments, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(imageAttachments[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, imageAttachments, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, handlePrev, handleNext]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        title="Cerrar (Esc)"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Download button */}
      <a
        href={`/api/attachments/${attachment.id}/download`}
        download={attachment.name}
        onClick={(e) => {
          e.stopPropagation();
          // Close modal after triggering download
          setTimeout(() => onClose(), 100);
        }}
        className="absolute top-4 right-16 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        title="Descargar"
      >
        <Download className="h-6 w-6 text-white" />
      </a>

      {/* Previous button */}
      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Anterior"
        >
          <ChevronLeft className="h-8 w-8 text-white" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Siguiente"
        >
          <ChevronRight className="h-8 w-8 text-white" />
        </button>
      )}

      {/* Image */}
      <img
        src={`/api/attachments/${attachment.id}/download`}
        alt={attachment.name}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* File name and counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-white text-sm font-medium">{attachment.name}</p>
        {imageAttachments.length > 1 && (
          <p className="text-white/60 text-xs mt-1">
            {currentIndex + 1} / {imageAttachments.length}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * AttachmentList - Displays a list of file attachments with preview, download and delete actions
 *
 * Shows thumbnail preview for images, file icon for other types.
 * Click on images to open fullscreen lightbox.
 * Delete button is hidden when readonly is true.
 */
export function AttachmentList({
  attachments,
  onDelete,
  readonly = false,
}: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxAttachment, setLightboxAttachment] = useState<Attachment | null>(null);

  /**
   * Handles file download by opening the download API endpoint
   */
  const handleDownload = (attachment: Attachment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    window.open(`/api/attachments/${attachment.id}/download`, '_blank');
  };

  /**
   * Handles attachment deletion with confirmation
   */
  const handleDelete = async (attachment: Attachment, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  /**
   * Opens lightbox for image attachments
   */
  const handlePreview = (attachment: Attachment) => {
    if (isImage(attachment.mimeType)) {
      setLightboxAttachment(attachment);
    }
  };

  if (attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No hay adjuntos
      </p>
    );
  }

  // Separate images and other files for grid layout
  const imageAttachments = attachments.filter((a) => isImage(a.mimeType));
  const otherAttachments = attachments.filter((a) => !isImage(a.mimeType));

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {imageAttachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {imageAttachments.map((attachment) => {
            const isDeleting = deletingId === attachment.id;

            return (
              <div
                key={attachment.id}
                className={cn(
                  'group relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer transition-all hover:border-white/20',
                  isDeleting && 'opacity-50 pointer-events-none'
                )}
                onClick={() => handlePreview(attachment)}
              >
                {/* Thumbnail */}
                <img
                  src={`/api/attachments/${attachment.id}/download`}
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>

                {/* File name overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white truncate" title={attachment.name}>
                    {attachment.name}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDownload(attachment, e)}
                    className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white"
                    title="Descargar"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>

                  {!readonly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(attachment, e)}
                      disabled={isDeleting}
                      className="h-7 w-7 bg-black/50 hover:bg-red-600/80 text-white"
                      title="Eliminar"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Other Files List */}
      {otherAttachments.length > 0 && (
        <div className="space-y-2">
          {otherAttachments.map((attachment) => {
            const Icon = getFileIcon(attachment.mimeType);
            const iconColor = getFileIconColor(attachment.mimeType);
            const isDeleting = deletingId === attachment.id;

            return (
              <div
                key={attachment.id}
                className={cn(
                  'group flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5 transition-colors hover:border-white/10',
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
                    onClick={(e) => handleDownload(attachment, e)}
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
                      onClick={(e) => handleDelete(attachment, e)}
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
      )}

      {/* Lightbox */}
      {lightboxAttachment && (
        <Lightbox
          attachment={lightboxAttachment}
          attachments={attachments}
          onClose={() => setLightboxAttachment(null)}
          onNavigate={setLightboxAttachment}
        />
      )}
    </div>
  );
}
