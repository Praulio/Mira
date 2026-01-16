'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { createTask } from '@/app/actions/tasks';

/**
 * CreateTaskDialog - Simple dialog for creating new tasks
 * 
 * Following React Best Practices:
 * - Client Component for form interaction
 * - Minimal state management (Best Practice 5.1)
 * - Lazy state initialization (Best Practice 5.5)
 * - Server Action for data mutation
 */
export function CreateTaskDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success('Task created successfully');
      setIsOpen(false);
      // Reset form
      (e.target as HTMLFormElement).reset();
    } else {
      toast.error(result.error || 'Failed to create task');
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        data-testid="create-task-button"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
      >
        <Plus className="h-4 w-4 stroke-[3px]" />
        New Task
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/40 p-8 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Create New Task
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
              Title <span className="text-primary">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={200}
              data-testid="task-title-input"
              className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              placeholder="What needs to be done?"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={2000}
              data-testid="task-description-input"
              className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              placeholder="Add some details..."
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="submit-task-button"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-black text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
