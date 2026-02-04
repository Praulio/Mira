'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, PartyPopper, Link as LinkIconHeader, Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { completeTask } from '@/app/actions/tasks';
import { MentionInput, extractMentionIds } from '@/components/mention-input';
import { LinkInput } from '@/components/link-input';
import { PendingFilePicker } from '@/components/pending-file-picker';
import { fireConfetti, playCelebrationSound } from '@/lib/confetti';
import type { KanbanTaskData } from '@/app/actions/kanban';

type CompleteTaskModalProps = {
  task: KanbanTaskData;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

// Wrapper that uses key to reset form state when task changes
export function CompleteTaskModal({ task, isOpen, onClose, onComplete }: CompleteTaskModalProps) {
  if (!isOpen) return null;
  return (
    <CompleteTaskModalInner
      key={task.id}
      task={task}
      onClose={onClose}
      onComplete={onComplete}
    />
  );
}

function CompleteTaskModalInner({
  task,
  onClose,
  onComplete,
}: Omit<CompleteTaskModalProps, 'isOpen'>) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasContent = notes.trim().length > 0 || links.length > 0 || pendingFiles.length > 0;

  const handleClose = () => {
    if (hasContent) {
      const confirmed = confirm(
        '¿Estás seguro de cancelar? Se perderán las notas, links y archivos que has agregado.'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    // Extract mention IDs from notes
    const mentionIds = extractMentionIds(notes);

    const result = await completeTask({
      taskId: task.id,
      notes: notes.trim() || undefined,
      links: links.length > 0 ? links : undefined,
      mentions: mentionIds.length > 0 ? mentionIds : undefined,
    });

    if (result.success) {
      // Upload pending files if any
      if (pendingFiles.length > 0) {
        setUploadProgress({ current: 0, total: pendingFiles.length });

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          setUploadProgress({ current: i + 1, total: pendingFiles.length });

          try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('taskId', task.id);

            const response = await fetch('/api/attachments/upload', {
              method: 'POST',
              body: uploadFormData,
            });

            const uploadResult = await response.json();
            if (uploadResult.success) successCount++;
            else errorCount++;
          } catch {
            errorCount++;
          }
        }

        setUploadProgress(null);

        // Show appropriate toast based on upload results
        if (errorCount > 0 && successCount > 0) {
          toast.warning(`¡Tarea completada! ${successCount} archivo(s) subido(s), ${errorCount} fallido(s).`);
        } else if (errorCount > 0) {
          toast.warning('Tarea completada, pero los archivos no se pudieron subir.');
        } else {
          // Celebration with attachments
          fireConfetti();
          playCelebrationSound();
          toast.success('¡Tarea completada con adjuntos!');
        }
      } else {
        // Normal celebration (no attachments)
        fireConfetti();
        playCelebrationSound();
        toast.success('¡Tarea completada!');
      }

      router.refresh();
      onClose();
      onComplete?.();
    } else {
      toast.error(result.error || 'Error al completar la tarea');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card/40 p-0 shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <PartyPopper className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Completar tarea</h2>
              <p className="text-sm text-muted-foreground truncate max-w-[280px]">
                {task.title}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Notes Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Notas de cierre (opcional)
            </label>
            <MentionInput
              value={notes}
              onChange={setNotes}
              placeholder="Agrega contexto, instrucciones o usa @nombre para mencionar..."
            />
          </div>

          {/* Links Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <LinkIconHeader className="h-3 w-3" /> Adjuntar links (opcional)
            </label>
            <LinkInput links={links} onChange={setLinks} maxLinks={10} />
          </div>

          {/* Attachments Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Paperclip className="h-3 w-3" /> Adjuntar archivos (opcional)
            </label>
            <PendingFilePicker
              files={pendingFiles}
              onFilesChange={setPendingFiles}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/5">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadProgress
                  ? `Subiendo ${uploadProgress.current}/${uploadProgress.total}...`
                  : 'Completando...'}
              </>
            ) : (
              <>
                <PartyPopper className="h-4 w-4" />
                Completar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
