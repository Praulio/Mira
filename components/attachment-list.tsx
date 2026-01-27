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
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
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
 * Check if MIME type is a text file that can be previewed
 */
function isTextFile(mimeType: string): boolean {
  const textTypes = [
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'text/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
  ];
  return textTypes.includes(mimeType) || mimeType.startsWith('text/');
}

/**
 * Check if file is a Markdown file based on MIME type or extension
 */
function isMarkdownFile(mimeType: string, fileName: string): boolean {
  const markdownMimes = ['text/markdown', 'text/x-markdown'];
  const hasMarkdownMime = markdownMimes.includes(mimeType);
  const hasMarkdownExt = fileName.toLowerCase().endsWith('.md');
  return hasMarkdownMime || hasMarkdownExt;
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
 * TextPreviewLightbox component for viewing text files
 * Supports Markdown rendering and copy to clipboard
 */
function TextPreviewLightbox({
  attachment,
  onClose,
}: {
  attachment: Attachment;
  onClose: () => void;
}) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isMarkdown = isMarkdownFile(attachment.mimeType, attachment.name);

  // Fetch text content
  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/attachments/${attachment.id}/download`);
        if (!response.ok) {
          throw new Error('Error al cargar el archivo');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [attachment.id]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Error al copiar al portapapeles');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
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

      {/* Copy button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleCopy();
        }}
        disabled={isLoading || !!error}
        className="absolute top-4 right-16 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
        title="Copiar todo"
      >
        {copied ? (
          <Check className="h-6 w-6 text-green-400" />
        ) : (
          <Copy className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Download button */}
      <a
        href={`/api/attachments/${attachment.id}/download`}
        download={attachment.name}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-28 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        title="Descargar"
      >
        <Download className="h-6 w-6 text-white" />
      </a>

      {/* Content container */}
      <div
        className="w-full max-w-4xl max-h-[85vh] bg-zinc-900/95 rounded-xl overflow-hidden border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 bg-zinc-800/50">
          <p className="text-white font-medium truncate">{attachment.name}</p>
          <p className="text-xs text-white/50 mt-0.5">
            {isMarkdown ? 'Markdown' : attachment.mimeType}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(85vh-60px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">{error}</p>
            </div>
          ) : isMarkdown ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <pre className="text-sm text-white/90 whitespace-pre-wrap font-mono leading-relaxed">
              {content}
            </pre>
          )}
        </div>
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
  const [textPreviewAttachment, setTextPreviewAttachment] = useState<Attachment | null>(null);

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
   * Opens lightbox for image attachments or text preview for text files
   */
  const handlePreview = (attachment: Attachment) => {
    if (isImage(attachment.mimeType)) {
      setLightboxAttachment(attachment);
    } else if (isTextFile(attachment.mimeType)) {
      setTextPreviewAttachment(attachment);
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
            const canPreview = isTextFile(attachment.mimeType);

            return (
              <div
                key={attachment.id}
                className={cn(
                  'group flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5 transition-colors hover:border-white/10',
                  isDeleting && 'opacity-50 pointer-events-none',
                  canPreview && 'cursor-pointer'
                )}
                onClick={() => canPreview && handlePreview(attachment)}
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
                    {canPreview && ' • Clic para ver'}
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

      {/* Text Preview Lightbox */}
      {textPreviewAttachment && (
        <TextPreviewLightbox
          attachment={textPreviewAttachment}
          onClose={() => setTextPreviewAttachment(null)}
        />
      )}
    </div>
  );
}
