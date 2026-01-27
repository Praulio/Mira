'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { X, Calendar, User, AlignLeft, Trash2, Check, PartyPopper, Clock, GitBranch, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { updateTaskMetadata, assignTask, deleteTask, updateCompletedAt, createDerivedTask } from '@/app/actions/tasks';
import { getTaskAttachments } from '@/app/actions/attachments';
import { getTeamUsers } from '@/app/actions/users';
import type { KanbanTaskData } from '@/app/actions/kanban';
import { CompleteTaskModal } from './complete-task-modal';
import { FileDropzone } from './file-dropzone';
import { AttachmentList } from './attachment-list';
import { formatDuration } from '@/lib/format-duration';

// Extended task type to include time tracking fields (added by task 4.4)
type ExtendedKanbanTaskData = KanbanTaskData & {
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
};

type TaskDetailDialogProps = {
  task: ExtendedKanbanTaskData;
  isOpen: boolean;
  onClose: () => void;
};

// Wrapper that uses key to reset form state when task changes
export function TaskDetailDialog({ task, isOpen, onClose }: TaskDetailDialogProps) {
  if (!isOpen) return null;
  return <TaskDetailDialogInner key={task.id} task={task} onClose={onClose} />;
}

function TaskDetailDialogInner({ task, onClose }: Omit<TaskDetailDialogProps, 'isOpen'>) {
  const router = useRouter();
  const { user } = useUser();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id || null);
  const [teamUsers, setTeamUsers] = useState<{ id: string; name: string; imageUrl: string | null }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isUpdatingCompletedAt, setIsUpdatingCompletedAt] = useState(false);
  const [isCreatingDerived, setIsCreatingDerived] = useState(false);
  const [attachmentsList, setAttachmentsList] = useState<{
    id: string;
    taskId: string;
    driveFileId: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string;
    uploadedAt: Date;
  }[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(true);

  // Check if current user is owner (assignee or creator)
  const isOwner = user?.id === task.assignee?.id || user?.id === task.creator.id;
  const isDone = task.status === 'done';

  useEffect(() => {
    getTeamUsers().then(setTeamUsers);
  }, []);

  // Load attachments for the task
  const loadAttachments = useCallback(async () => {
    setIsLoadingAttachments(true);
    const result = await getTaskAttachments({ taskId: task.id });
    if (result.success && result.data) {
      setAttachmentsList(result.data);
    }
    setIsLoadingAttachments(false);
  }, [task.id]);

  // Initial load of attachments
  useEffect(() => {
    let cancelled = false;

    async function fetchAttachments() {
      setIsLoadingAttachments(true);
      const result = await getTaskAttachments({ taskId: task.id });
      if (!cancelled && result.success && result.data) {
        setAttachmentsList(result.data);
      }
      if (!cancelled) {
        setIsLoadingAttachments(false);
      }
    }

    fetchAttachments();

    return () => {
      cancelled = true;
    };
  }, [task.id]);

  async function handleSave() {
    setIsSaving(true);
    
    // 1. Update metadata if changed
    if (title !== task.title || description !== (task.description || '')) {
      const metaResult = await updateTaskMetadata({
        taskId: task.id,
        title,
        description: description || undefined,
      });
      if (!metaResult.success) {
        toast.error(metaResult.error || 'Failed to update details');
        setIsSaving(false);
        return;
      }
    }

    // 2. Update assignee if changed
    if (assigneeId !== (task.assignee?.id || null)) {
      const assignResult = await assignTask(task.id, assigneeId);
      if (!assignResult.success) {
        toast.error(assignResult.error || 'Failed to update assignee');
        setIsSaving(false);
        return;
      }
    }

    toast.success('Task updated');
    setIsSaving(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const result = await deleteTask({ taskId: task.id });
    if (result.success) {
      toast.success('Task deleted');
      router.refresh();
      onClose();
    } else {
      toast.error(result.error || 'Failed to delete');
    }
  }

  function handleCompleteSuccess() {
    // Close both the complete modal and the detail dialog
    setShowCompleteModal(false);
    router.refresh();
    onClose();
  }

  async function handleUpdateCompletedAt(newDate: string) {
    if (!isOwner || !isDone) return;

    setIsUpdatingCompletedAt(true);
    const result = await updateCompletedAt({
      taskId: task.id,
      completedAt: new Date(newDate),
    });

    if (result.success) {
      toast.success('Fecha de finalización actualizada');
      router.refresh();
    } else {
      toast.error(result.error || 'Error al actualizar fecha');
    }
    setIsUpdatingCompletedAt(false);
  }

  async function handleCreateDerivedTask() {
    if (!isDone) return;

    setIsCreatingDerived(true);
    const result = await createDerivedTask({
      parentTaskId: task.id,
    });

    if (result.success) {
      toast.success('Tarea derivada creada');
      router.refresh();
      onClose();
    } else {
      toast.error(result.error || 'Error al crear tarea derivada');
    }
    setIsCreatingDerived(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-card/40 p-0 shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full bg-status-${task.status.replace('_', '')}`} />
            <span className="text-xs font-black uppercase tracking-widest opacity-60">
              {task.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {task.status !== 'done' && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="rounded-full p-2 text-muted-foreground transition-all hover:bg-green-500/10 hover:text-green-400"
                title="Completar tarea"
              >
                <PartyPopper className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={handleDelete}
              className="rounded-full p-2 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto">
          {/* Title Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-3xl font-black tracking-tighter focus:outline-none placeholder:opacity-20 border-b border-transparent focus:border-primary/20 pb-2 transition-all"
              placeholder="Task title"
            />
          </div>

          {/* Grid for Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assignee Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <User className="h-3 w-3" /> Assignee
              </label>
              <div className="flex flex-wrap gap-2">
                {teamUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setAssigneeId(assigneeId === user.id ? null : user.id)}
                    className={`group relative flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all ${
                      assigneeId === user.id 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <img src={user.imageUrl || '/placeholder-avatar.png'} className="h-6 w-6 rounded-full object-cover" alt="" />
                    <span className="text-xs font-bold">{user.name.split(' ')[0]}</span>
                    {assigneeId === user.id && <Check className="h-3 w-3 stroke-[4px]" />}
                  </button>
                ))}
                {assigneeId === null && (
                  <div className="text-xs italic opacity-40 py-2">Unassigned</div>
                )}
              </div>
            </div>

            {/* Dates Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Information
              </label>
              <div className="space-y-2 text-xs font-bold">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="opacity-40">Creada</span>
                  <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="opacity-40">Última actualización</span>
                  <span>{new Date(task.updatedAt).toLocaleTimeString()}</span>
                </div>
                {/* Time tracking - only show if task has been started */}
                {task.startedAt && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="opacity-40">Iniciada</span>
                    <span>{new Date(task.startedAt).toLocaleString()}</span>
                  </div>
                )}
                {/* Completed at - editable for owners of done tasks */}
                {isDone && (
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="opacity-40">Completada</span>
                    {isOwner ? (
                      <input
                        type="datetime-local"
                        value={task.completedAt ? new Date(task.completedAt).toISOString().slice(0, 16) : ''}
                        onChange={(e) => handleUpdateCompletedAt(e.target.value)}
                        disabled={isUpdatingCompletedAt}
                        max={new Date().toISOString().slice(0, 16)}
                        className="bg-transparent border border-white/10 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-primary/50 disabled:opacity-50"
                      />
                    ) : (
                      <span>
                        {task.completedAt
                          ? new Date(task.completedAt).toLocaleString()
                          : '-'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Duration Section - only show if task has startedAt */}
            {task.startedAt && (
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Duración
                </label>
                <div className={`text-2xl font-black ${isDone ? 'text-green-400' : 'text-amber-400'}`}>
                  {formatDuration(task.startedAt, task.completedAt)}
                </div>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="space-y-4 pt-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <AlignLeft className="h-3 w-3" /> Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full bg-white/5 rounded-2xl border border-white/5 p-4 text-sm leading-relaxed focus:outline-none focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all resize-none"
              placeholder="Add more context to this task..."
            />
          </div>

          {/* Attachments Section */}
          <div className="space-y-4 pt-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Paperclip className="h-3 w-3" /> Adjuntos
              {attachmentsList.length > 0 && (
                <span className="ml-1 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
                  {attachmentsList.length}
                </span>
              )}
            </label>

            {/* FileDropzone - disabled for done tasks */}
            {!isDone && (
              <FileDropzone
                taskId={task.id}
                onUploadComplete={loadAttachments}
                disabled={isDone}
              />
            )}

            {/* Attachment List */}
            {isLoadingAttachments ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Cargando adjuntos...
              </div>
            ) : (
              <AttachmentList
                attachments={attachmentsList}
                onDelete={loadAttachments}
                readonly={isDone}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 flex justify-between gap-3 bg-white/5">
          {/* Left side: Create derived task button (only for done tasks) */}
          <div>
            {isDone && (
              <button
                onClick={handleCreateDerivedTask}
                disabled={isCreatingDerived}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl hover:bg-amber-400/20 transition-all disabled:opacity-50"
                title="Crear tarea derivada para continuar el trabajo"
              >
                <GitBranch className="h-4 w-4" />
                {isCreatingDerived ? 'Creando...' : 'Crear derivada'}
              </button>
            )}
          </div>
          {/* Right side: Close and Save buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {/* Complete Task Modal */}
      {showCompleteModal && (
        <CompleteTaskModal
          task={task}
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          onComplete={handleCompleteSuccess}
        />
      )}
    </div>
  );
}
