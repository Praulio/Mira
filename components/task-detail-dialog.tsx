'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Calendar, User, AlignLeft, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { updateTaskMetadata, assignTask, deleteTask } from '@/app/actions/tasks';
import { getTeamUsers } from '@/app/actions/users';
import type { KanbanTaskData } from '@/app/actions/kanban';

type TaskDetailDialogProps = {
  task: KanbanTaskData;
  isOpen: boolean;
  onClose: () => void;
};

export function TaskDetailDialog({ task, isOpen, onClose }: TaskDetailDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id || null);
  const [teamUsers, setTeamUsers] = useState<{ id: string; name: string; imageUrl: string | null }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getTeamUsers().then(setTeamUsers);
      setTitle(task.title);
      setDescription(task.description || '');
      setAssigneeId(task.assignee?.id || null);
    }
  }, [isOpen, task]);

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
    setIsEditing(false);
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

  if (!isOpen) return null;

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
                  <span className="opacity-40">Created</span>
                  <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="opacity-40">Last Updated</span>
                  <span>{new Date(task.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
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
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/5">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
