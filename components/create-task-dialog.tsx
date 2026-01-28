'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Check, Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createTask } from '@/app/actions/tasks';
import { getTeamUsers } from '@/app/actions/users';
import { PendingFilePicker } from '@/components/pending-file-picker';

/**
 * CreateTaskDialog - Simple dialog for creating new tasks
 */
export function CreateTaskDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamUsers, setTeamUsers] = useState<{ id: string; name: string; imageUrl: string | null }[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch team users when dialog opens
  useEffect(() => {
    if (isOpen) {
      getTeamUsers().then(setTeamUsers);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    // Call server action
    const result = await createTask({
      title,
      description: description || undefined,
      assigneeId: selectedAssigneeId || undefined,
    });

    if (!result.success) {
      setIsSubmitting(false);
      toast.error(result.error || 'Error al crear la tarea');
      return;
    }

    // Upload pending files if any
    const taskId = result.data?.id;
    if (pendingFiles.length > 0 && taskId) {
      setUploadProgress({ current: 0, total: pendingFiles.length });

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        setUploadProgress({ current: i + 1, total: pendingFiles.length });

        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('taskId', taskId);

          const response = await fetch('/api/attachments/upload', {
            method: 'POST',
            body: uploadFormData,
          });

          const uploadResult = await response.json();

          if (uploadResult.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      setUploadProgress(null);

      // Show appropriate toast based on upload results
      if (errorCount > 0 && successCount > 0) {
        toast.warning(
          `Tarea creada. ${successCount} archivo(s) subido(s), ${errorCount} fallido(s).`
        );
      } else if (errorCount > 0 && successCount === 0) {
        toast.warning('Tarea creada, pero los archivos no se pudieron subir.');
      } else {
        toast.success('Tarea creada con adjuntos');
      }
    } else {
      toast.success('Tarea creada exitosamente');
    }

    setIsSubmitting(false);
    setIsOpen(false);
    setSelectedAssigneeId(null);
    setPendingFiles([]);
    // Reset form
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-testid="create-task-button"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
      >
        <Plus className="h-4 w-4 stroke-[3px]" />
        Nueva Tarea
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-8 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Crear Nueva Tarea
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Título <span className="text-primary">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={200}
              data-testid="task-title-input"
              className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              placeholder="¿Qué hay que hacer?"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              data-testid="task-description-input"
              className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none overflow-y-auto max-h-40"
              placeholder="Agrega algunos detalles..."
            />
          </div>

          {/* Assignee Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Asignar a
            </label>
            <div className="grid grid-cols-4 gap-2">
              {teamUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedAssigneeId(selectedAssigneeId === user.id ? null : user.id)}
                  className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                    selectedAssigneeId === user.id
                      ? 'bg-primary/20 ring-1 ring-primary/50'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="relative h-10 w-10">
                    <img
                      src={user.imageUrl || '/placeholder-avatar.png'}
                      alt={user.name}
                      className={`h-full w-full rounded-full object-cover ring-2 transition-all ${
                        selectedAssigneeId === user.id ? 'ring-primary' : 'ring-transparent'
                      }`}
                    />
                    {selectedAssigneeId === user.id && (
                      <div className="absolute -right-1 -top-1 rounded-full bg-primary p-0.5 text-primary-foreground shadow-lg">
                        <Check className="h-3 w-3 stroke-[4px]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold truncate w-full text-center opacity-80 group-hover:opacity-100">
                    {user.name.split(' ')[0]}
                  </span>
                </button>
              ))}
              {teamUsers.length === 0 && (
                <p className="col-span-4 text-center py-4 text-xs text-muted-foreground italic">
                  No se encontraron miembros del equipo
                </p>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              Adjuntos
            </label>
            <PendingFilePicker
              files={pendingFiles}
              onFilesChange={setPendingFiles}
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-muted-foreground transition-all hover:bg-white/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="submit-task-button"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-black text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress
                    ? `Subiendo ${uploadProgress.current}/${uploadProgress.total}...`
                    : 'Creando...'}
                </>
              ) : (
                'Crear Tarea'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
