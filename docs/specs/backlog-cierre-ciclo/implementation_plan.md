# Implementation Plan: Backlog Funcional + Cierre de Ciclo

Generado desde: `specs/backlog-y-cierre-ciclo.md`
Fecha: 2026-01-19

---

## Fase 0: Dependencies & Setup

> Instalar dependencias necesarias y crear utilidades base.

- [ ] **0.1** Instalar canvas-confetti para animación de celebración

📋 **Context:**
- Why: Necesitamos confetti al completar tareas
- Current: No existe la dependencia
- Target: canvas-confetti instalado y disponible

📁 **Files:**
- Primary: `package.json`

🔧 **Changes:**
```bash
pnpm add canvas-confetti
pnpm add -D @types/canvas-confetti
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores
- [ ] `canvas-confetti` aparece en package.json dependencies

---

- [ ] **0.2** Crear lib/confetti.ts con función de celebración

📋 **Context:**
- Why: Centralizar lógica de confetti con respeto a prefers-reduced-motion
- Current: No existe
- Target: Función exportable `fireConfetti()`

📁 **Files:**
- Primary: `lib/confetti.ts` (NUEVO)

🔧 **Changes:**
- AFTER:
```typescript
import confetti from 'canvas-confetti';

/**
 * Fire confetti celebration animation
 * Respects prefers-reduced-motion setting
 */
export function fireConfetti() {
  // Check for reduced motion preference
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
  }

  // Fire confetti from both sides
  const defaults = {
    spread: 60,
    ticks: 100,
    gravity: 0.8,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#00D4FF', '#7C3AED', '#10B981', '#F59E0B', '#EF4444'],
  };

  confetti({
    ...defaults,
    particleCount: 40,
    origin: { x: 0.2, y: 0.6 },
    angle: 60,
  });

  confetti({
    ...defaults,
    particleCount: 40,
    origin: { x: 0.8, y: 0.6 },
    angle: 120,
  });
}

/**
 * Play celebration sound
 * Only plays if not muted and reduced-motion is off
 */
export function playCelebrationSound() {
  if (typeof window === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // Simple beep using Web Audio API
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Audio not supported, fail silently
  }
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores
- [ ] Archivo existe en `lib/confetti.ts`

---

## Fase 1: Database Schema

> Agregar campos necesarios a la base de datos.

- [ ] **1.1** Agregar import de boolean en schema.ts

📋 **Context:**
- Why: boolean no está importado actualmente
- Current: import { pgTable, text, timestamp, integer, uuid, pgEnum, jsonb, index }
- Target: Agregar boolean al import

📁 **Files:**
- Primary: `db/schema.ts`

🔧 **Changes:**
- Location: Línea 1
- BEFORE:
```typescript
import { pgTable, text, timestamp, integer, uuid, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
```
- AFTER:
```typescript
import { pgTable, text, timestamp, integer, uuid, pgEnum, jsonb, index, boolean } from 'drizzle-orm/pg-core';
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **1.2** Agregar nuevos valores al enum activityActionEnum

📋 **Context:**
- Why: Necesitamos 'completed' y 'mentioned' para nuevos tipos de actividad
- Current: Solo tiene created, status_changed, assigned, updated, deleted
- Target: Agregar completed y mentioned

📁 **Files:**
- Primary: `db/schema.ts`

🔧 **Changes:**
- Location: Líneas 16-22
- BEFORE:
```typescript
export const activityActionEnum = pgEnum('activity_action', [
  'created',
  'status_changed',
  'assigned',
  'updated',
  'deleted'
]);
```
- AFTER:
```typescript
export const activityActionEnum = pgEnum('activity_action', [
  'created',
  'status_changed',
  'assigned',
  'updated',
  'deleted',
  'completed',
  'mentioned'
]);
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

⚠️ **Pitfalls:**
- Drizzle puede requerir migración manual para el enum

---

- [ ] **1.3** Agregar campos de completion a tabla tasks

📋 **Context:**
- Why: Almacenar datos de completar tarea (notas, links, menciones, crítico)
- Current: tasks solo tiene campos básicos
- Target: Agregar isCritical, completedAt, completionNotes, completionLinks, completionMentions

📁 **Files:**
- Primary: `db/schema.ts`

🔧 **Changes:**
- Location: Líneas 40-48, dentro de pgTable('tasks', ...), antes de createdAt
- BEFORE:
```typescript
  creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
```
- AFTER:
```typescript
  creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Completion fields
  isCritical: boolean('is_critical').default(false).notNull(),
  completedAt: timestamp('completed_at'),
  completionNotes: text('completion_notes'),
  completionLinks: jsonb('completion_links').$type<string[]>(),
  completionMentions: jsonb('completion_mentions').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **1.4** Generar y aplicar migración de Drizzle

📋 **Context:**
- Why: Sincronizar schema con base de datos
- Current: Schema modificado pero no aplicado
- Target: Migración aplicada exitosamente

📁 **Files:**
- Primary: Terminal commands

🔧 **Changes:**
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

✅ **Validation:**
- [ ] Migración generada sin errores
- [ ] Push aplicado exitosamente
- [ ] `pnpm build` pasa

⚠️ **Pitfalls:**
- Si hay datos existentes, el campo isCritical necesita default
- Enum changes pueden requerir DROP/CREATE manual

---

## Fase 2: Server Actions

> Crear las server actions necesarias.

- [ ] **2.1** Crear server action toggleTaskCritical

📋 **Context:**
- Why: Permitir marcar/desmarcar tarea como crítica (máx 1 por usuario)
- Current: No existe
- Target: Función que toggle isCritical con validación

📁 **Files:**
- Primary: `app/actions/tasks.ts`

🔧 **Changes:**
- Location: Al final del archivo, después de assignTask
- AFTER (agregar):
```typescript
/**
 * Zod schema for toggle critical
 */
const toggleCriticalSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
});

/**
 * Server Action: Toggle task critical status
 *
 * Enforces the rule: only 1 critical task per user globally.
 * If marking as critical and user already has one, returns error.
 */
export async function toggleTaskCritical(
  input: z.infer<typeof toggleCriticalSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    const { userId } = await getAuth();

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validationResult = toggleCriticalSchema.safeParse(input);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error.issues[0]?.message || 'Invalid input' };
    }

    const { taskId } = validationResult.data;

    // Fetch current task
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!currentTask) {
      return { success: false, error: 'Task not found' };
    }

    // If trying to mark as critical, check if user already has one
    if (!currentTask.isCritical) {
      const [existingCritical] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.creatorId, userId),
            eq(tasks.isCritical, true)
          )
        )
        .limit(1);

      if (existingCritical) {
        return {
          success: false,
          error: 'Ya tienes una tarea crítica. Desmarca la actual primero.'
        };
      }
    }

    // Toggle the critical status
    const [updatedTask] = await db
      .update(tasks)
      .set({
        isCritical: !currentTask.isCritical,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId))
      .returning();

    revalidatePath('/');
    revalidatePath('/dashboard/backlog');
    revalidatePath('/dashboard/kanban');

    return { success: true, data: updatedTask };
  } catch (error) {
    console.error('Error toggling critical status:', error);
    return { success: false, error: 'Failed to update critical status' };
  }
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **2.2** Crear server action completeTask

📋 **Context:**
- Why: Completar tarea con notas, links y menciones
- Current: No existe
- Target: Función que marca tarea done y guarda completion data

📁 **Files:**
- Primary: `app/actions/tasks.ts`

🔧 **Changes:**
- Location: Después de toggleTaskCritical
- AFTER (agregar):
```typescript
/**
 * Zod schema for complete task
 */
const completeTaskSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
  notes: z.string().max(2000).optional(),
  links: z.array(z.string().url()).max(10).optional(),
  mentions: z.array(z.string()).optional(),
});

/**
 * Server Action: Complete a task with optional notes, links, and mentions
 *
 * - Sets status to 'done'
 * - Stores completion data
 * - Creates 'completed' activity
 * - Creates 'mentioned' activity for each mention
 */
export async function completeTask(
  input: z.infer<typeof completeTaskSchema>
): Promise<ActionResponse<typeof tasks.$inferSelect>> {
  try {
    const { userId } = await getAuth();

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const validationResult = completeTaskSchema.safeParse(input);
    if (!validationResult.success) {
      return { success: false, error: validationResult.error.issues[0]?.message || 'Invalid input' };
    }

    const { taskId, notes, links, mentions } = validationResult.data;

    // Fetch current task
    const [currentTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!currentTask) {
      return { success: false, error: 'Task not found' };
    }

    // Execute in transaction
    const result = await db.transaction(async (tx) => {
      // Update task
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          status: 'done',
          completedAt: new Date(),
          completionNotes: notes || null,
          completionLinks: links || null,
          completionMentions: mentions || null,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        throw new Error('Failed to update task');
      }

      // Log 'completed' activity
      await tx.insert(activity).values({
        taskId: updatedTask.id,
        userId,
        action: 'completed',
        metadata: {
          taskTitle: updatedTask.title,
          notes: notes || null,
          links: links || null,
          mentions: mentions || null,
        },
      });

      // Log 'mentioned' activity for each mentioned user
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          await tx.insert(activity).values({
            taskId: updatedTask.id,
            userId: mentionedUserId,
            action: 'mentioned',
            metadata: {
              mentionedBy: userId,
              taskTitle: updatedTask.title,
              context: notes || null,
            },
          });
        }
      }

      return updatedTask;
    });

    revalidatePath('/');
    revalidatePath('/dashboard/backlog');
    revalidatePath('/dashboard/kanban');
    revalidatePath('/dashboard/activity');

    return { success: true, data: result };
  } catch (error) {
    console.error('Error completing task:', error);
    return { success: false, error: 'Failed to complete task' };
  }
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **2.3** Actualizar tipo ActivityData para nuevos actions

📋 **Context:**
- Why: El tipo actual no incluye 'completed' ni 'mentioned'
- Current: Solo tiene los 5 tipos originales
- Target: Agregar los 2 nuevos tipos

📁 **Files:**
- Primary: `app/actions/activity.ts`

🔧 **Changes:**
- Location: Líneas 10-11, tipo action en ActivityData
- BEFORE:
```typescript
export type ActivityData = {
  id: string
  action: 'created' | 'status_changed' | 'assigned' | 'updated' | 'deleted'
```
- AFTER:
```typescript
export type ActivityData = {
  id: string
  action: 'created' | 'status_changed' | 'assigned' | 'updated' | 'deleted' | 'completed' | 'mentioned'
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **2.4** Agregar imports necesarios para filtro en activity.ts

📋 **Context:**
- Why: Necesitamos getAuth y operadores and/or para filtrar
- Current: No están importados
- Target: Agregar imports

📁 **Files:**
- Primary: `app/actions/activity.ts`

🔧 **Changes:**
- Location: Líneas 3-5, imports
- BEFORE:
```typescript
import { db } from '@/db'
import { activity, users, tasks } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
```
- AFTER:
```typescript
import { db } from '@/db'
import { activity, users, tasks } from '@/db/schema'
import { desc, eq, and } from 'drizzle-orm'
import { getAuth } from '@/lib/mock-auth'
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **2.5** Agregar tipo ActivityFilter y actualizar getActivityFeed

📋 **Context:**
- Why: Necesitamos filtrar por todos, completados, o mis menciones
- Current: Siempre retorna todo
- Target: Aceptar filtro opcional

📁 **Files:**
- Primary: `app/actions/activity.ts`

🔧 **Changes:**
- Location: Antes de la función getActivityFeed y modificar la función
- BEFORE:
```typescript
export async function getActivityFeed(): Promise<ActivityData[]> {
  try {
    // Fetch activity with user and task data in one query
    const activityData = await db
      .select({
```
- AFTER:
```typescript
export type ActivityFilter = 'all' | 'completed' | 'mentions';

export async function getActivityFeed(filter: ActivityFilter = 'all'): Promise<ActivityData[]> {
  try {
    const { userId } = await getAuth();

    // Build where clause based on filter
    let whereClause;
    if (filter === 'completed') {
      whereClause = eq(activity.action, 'completed');
    } else if (filter === 'mentions' && userId) {
      whereClause = and(
        eq(activity.action, 'mentioned'),
        eq(activity.userId, userId)
      );
    }

    // Fetch activity with user and task data in one query
    const activityData = await db
      .select({
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **2.6** Agregar where clause a la query de getActivityFeed

📋 **Context:**
- Why: La query necesita usar el whereClause que construimos
- Current: No tiene where
- Target: Agregar .where(whereClause)

📁 **Files:**
- Primary: `app/actions/activity.ts`

🔧 **Changes:**
- Location: En la query, después de .leftJoin(tasks...)
- BEFORE:
```typescript
      .from(activity)
      .leftJoin(users, eq(activity.userId, users.id))
      .leftJoin(tasks, eq(activity.taskId, tasks.id))
      .orderBy(desc(activity.createdAt))
      .limit(20)
```
- AFTER:
```typescript
      .from(activity)
      .leftJoin(users, eq(activity.userId, users.id))
      .leftJoin(tasks, eq(activity.taskId, tasks.id))
      .where(whereClause)
      .orderBy(desc(activity.createdAt))
      .limit(20)
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

## Fase 3: Complete Task Modal Components

> Crear componentes para el modal de completar tarea.

- [ ] **3.1** Crear componente MentionInput

📋 **Context:**
- Why: Input que detecta @ y muestra dropdown de usuarios
- Current: No existe
- Target: Componente funcional con autocomplete

📁 **Files:**
- Primary: `components/mention-input.tsx` (NUEVO)

🔧 **Changes:**
- AFTER:
```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { getTeamUsers } from '@/app/actions/users';

type User = {
  id: string;
  name: string;
  imageUrl: string | null;
};

type MentionInputProps = {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
};

export function MentionInput({ value, onChange, placeholder }: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getTeamUsers().then(setUsers);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    // Check if we just typed @
    const textBeforeCursor = newValue.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && textAfterAt.length < 20) {
        setFilter(textAfterAt.toLowerCase());
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }

    // Extract mentions from text
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const extractedMentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newValue)) !== null) {
      extractedMentions.push(match[2]);
    }

    setMentions(extractedMentions);
    onChange(newValue, extractedMentions);
  }

  function handleSelectUser(user: User) {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = value.slice(cursorPosition);

    const newValue =
      value.slice(0, lastAtIndex) +
      `@[${user.name}](${user.id}) ` +
      textAfterCursor;

    const newMentions = [...mentions, user.id];
    setMentions(newMentions);
    onChange(newValue, newMentions);
    setShowDropdown(false);
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(filter) && !mentions.includes(u.id)
  );

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-white/5 rounded-xl border border-white/10 p-4 text-sm leading-relaxed focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all resize-none"
      />

      {showDropdown && filteredUsers.length > 0 && (
        <div className="absolute left-4 top-full mt-1 w-64 rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl backdrop-blur-xl z-50">
          {filteredUsers.slice(0, 5).map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelectUser(user)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/10 transition-colors"
            >
              <img
                src={user.imageUrl || '/placeholder-avatar.png'}
                alt={user.name}
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="text-sm font-medium">{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **3.2** Crear componente LinkInput

📋 **Context:**
- Why: Input para agregar URLs con lista y eliminación
- Current: No existe
- Target: Componente con validación de URL

📁 **Files:**
- Primary: `components/link-input.tsx` (NUEVO)

🔧 **Changes:**
- AFTER:
```typescript
'use client';

import { useState } from 'react';
import { Plus, X, Link as LinkIcon } from 'lucide-react';

type LinkInputProps = {
  links: string[];
  onChange: (links: string[]) => void;
  maxLinks?: number;
};

export function LinkInput({ links, onChange, maxLinks = 10 }: LinkInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  function isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  function handleAdd() {
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setError('Ingresa una URL');
      return;
    }

    let url = trimmed;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (!isValidUrl(url)) {
      setError('URL inválida');
      return;
    }

    if (links.includes(url)) {
      setError('Este link ya fue agregado');
      return;
    }

    if (links.length >= maxLinks) {
      setError(`Máximo ${maxLinks} links`);
      return;
    }

    onChange([...links, url]);
    setInputValue('');
    setError('');
  }

  function handleRemove(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="https://ejemplo.com"
            className="w-full bg-white/5 rounded-xl border border-white/10 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={links.length >= maxLinks}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map((link, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-xs"
            >
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-[200px]"
              >
                {new URL(link).hostname}
              </a>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-muted-foreground hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">{links.length}/{maxLinks} links</p>
    </div>
  );
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **3.3** Crear componente CompleteTaskModal

📋 **Context:**
- Why: Modal principal para completar tareas con todos los campos
- Current: No existe
- Target: Modal funcional con MentionInput, LinkInput, y confetti

📁 **Files:**
- Primary: `components/complete-task-modal.tsx` (NUEVO)

🔧 **Changes:**
- AFTER:
```typescript
'use client';

import { useState } from 'react';
import { X, PartyPopper, Link as LinkIcon, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { MentionInput } from './mention-input';
import { LinkInput } from './link-input';
import { completeTask } from '@/app/actions/tasks';
import { fireConfetti, playCelebrationSound } from '@/lib/confetti';

type CompleteTaskModalProps = {
  task: { id: string; title: string };
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
};

export function CompleteTaskModal({ task, isOpen, onClose, onComplete }: CompleteTaskModalProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleComplete() {
    setIsSubmitting(true);

    const result = await completeTask({
      taskId: task.id,
      notes: notes || undefined,
      links: links.length > 0 ? links : undefined,
      mentions: mentions.length > 0 ? mentions : undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      fireConfetti();
      playCelebrationSound();
      toast.success('Tarea completada');
      setNotes('');
      setMentions([]);
      setLinks([]);
      onClose();
      onComplete?.();
      router.refresh();
    } else {
      toast.error(result.error || 'Error al completar la tarea');
    }
  }

  function handleCancel() {
    if (notes || links.length > 0) {
      if (!confirm('Tienes contenido sin guardar. Descartar?')) return;
    }
    setNotes('');
    setMentions([]);
    setLinks([]);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card/40 shadow-2xl backdrop-blur-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <PartyPopper className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Completar Tarea</h3>
              <p className="text-sm text-muted-foreground truncate max-w-[280px]">{task.title}</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <AtSign className="h-3 w-3" /> Notas de cierre (opcional)
            </label>
            <MentionInput
              value={notes}
              onChange={(value, extractedMentions) => {
                setNotes(value);
                setMentions(extractedMentions);
              }}
              placeholder="Agrega contexto, instrucciones o usa @nombre para mencionar..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <LinkIcon className="h-3 w-3" /> Adjuntar links (opcional)
            </label>
            <LinkInput links={links} onChange={setLinks} />
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/5">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-green-500 text-white rounded-xl text-sm font-black shadow-lg shadow-green-500/20 hover:bg-green-600 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? 'Completando...' : (
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
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

## Fase 4: Backlog Page Components

> Crear componentes para la página de backlog funcional.

- [ ] **4.1** Crear componente BacklogTaskCard

📋 **Context:**
- Why: Card de tarea para backlog con toggle de crítico
- Current: No existe
- Target: Card con funcionalidad de crítico y drag handle

📁 **Files:**
- Primary: `components/backlog-task-card.tsx` (NUEVO)

🔧 **Changes:**
- AFTER:
```typescript
'use client';

import { useState } from 'react';
import { User, MoreVertical, Trash2, Star, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteTask, toggleTaskCritical } from '@/app/actions/tasks';
import { TaskDetailDialog } from './task-detail-dialog';
import type { KanbanTaskData } from '@/app/actions/kanban';

type BacklogTaskCardProps = {
  task: KanbanTaskData & { isCritical?: boolean };
};

export function BacklogTaskCard({ task }: BacklogTaskCardProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isTogglingCritical, setIsTogglingCritical] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Estas seguro de eliminar esta tarea?')) return;
    setIsDeleting(true);
    const result = await deleteTask({ taskId: task.id });
    setIsDeleting(false);
    if (result.success) {
      toast.success('Tarea eliminada');
      router.refresh();
    } else {
      toast.error(result.error || 'Error al eliminar');
    }
  }

  async function handleToggleCritical(e: React.MouseEvent) {
    e.stopPropagation();
    setIsTogglingCritical(true);
    const result = await toggleTaskCritical({ taskId: task.id });
    setIsTogglingCritical(false);
    if (result.success) {
      toast.success(task.isCritical ? 'Prioridad removida' : 'Marcada como crítica');
      router.refresh();
    } else {
      toast.error(result.error || 'Error al cambiar prioridad');
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative flex items-center gap-4 rounded-xl p-4 backdrop-blur-[40px] transition-all ${
          task.isCritical ? 'border-2 border-red-500/50 bg-red-500/5' : 'border border-white/10 bg-white/5'
        } ${isDeleting ? 'opacity-50 scale-95' : ''} hover:bg-white/10`}
      >
        <div {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
          <GripVertical className="h-5 w-5" />
        </div>

        <div className="flex-1 cursor-pointer" onClick={() => setShowDetail(true)}>
          <div className="flex items-center gap-2">
            {task.isCritical && (
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 rounded-full">
                Crítico
              </span>
            )}
            <h4 className="font-semibold text-foreground">{task.title}</h4>
          </div>
          {task.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {task.assignee ? (
            <img src={task.assignee.imageUrl || '/placeholder-avatar.png'} alt={task.assignee.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        <button
          onClick={handleToggleCritical}
          disabled={isTogglingCritical}
          className={`p-2 rounded-full transition-all ${
            task.isCritical ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10'
          }`}
        >
          <Star className={`h-4 w-4 ${task.isCritical ? 'fill-current' : ''}`} />
        </button>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl backdrop-blur-xl z-50" onMouseLeave={() => setShowMenu(false)}>
              <button onClick={handleDelete} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
      <TaskDetailDialog task={task} isOpen={showDetail} onClose={() => setShowDetail(false)} />
    </>
  );
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **4.2** Crear componente BacklogList

📋 **Context:**
- Why: Lista sortable para el backlog con drag & drop visual
- Current: No existe
- Target: Lista con @dnd-kit/sortable

📁 **Files:**
- Primary: `components/backlog-list.tsx` (NUEVO)

🔧 **Changes:**
- AFTER:
```typescript
'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { BacklogTaskCard } from './backlog-task-card';
import { ListTodo } from 'lucide-react';
import type { KanbanTaskData } from '@/app/actions/kanban';

type BacklogTask = KanbanTaskData & { isCritical?: boolean };

type BacklogListProps = {
  initialTasks: BacklogTask[];
};

export function BacklogList({ initialTasks }: BacklogListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<BacklogTask | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTasks((items) => {
      const oldIndex = items.findIndex((t) => t.id === active.id);
      const newIndex = items.findIndex((t) => t.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          <ListTodo className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold">No hay tareas en el backlog</h3>
        <p className="mt-1 text-sm text-muted-foreground">Crea una nueva tarea para empezar</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.map((task) => (<BacklogTaskCard key={task.id} task={task} />))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeTask ? (<div className="opacity-80 rotate-2"><BacklogTaskCard task={activeTask} /></div>) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **4.3** Reemplazar página de backlog con componentes funcionales

📋 **Context:**
- Why: Reemplazar skeleton con lista real de tareas
- Current: Solo muestra placeholder
- Target: Muestra BacklogList con datos reales

📁 **Files:**
- Primary: `app/(dashboard)/dashboard/backlog/page.tsx`

🔧 **Changes:**
- BEFORE (archivo completo):
```typescript
// Force dynamic rendering since this requires authentication
export const dynamic = 'force-dynamic'

export default function BacklogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pila de Tareas</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Prioriza el trabajo pendiente
        </p>
      </div>

      {/* Placeholder for Backlog list (future task) */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <div className="h-10 w-10 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700" />
              <div className="flex-1">
                <div className="h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-1 h-3 w-32 rounded bg-neutral-100 dark:bg-neutral-900" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```
- AFTER:
```typescript
import { db } from '@/db';
import { tasks, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { BacklogList } from '@/components/backlog-list';

export const dynamic = 'force-dynamic';

async function getBacklogTasks() {
  const backlogTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      isCritical: tasks.isCritical,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      assigneeImageUrl: users.imageUrl,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.status, 'backlog'))
    .orderBy(desc(tasks.isCritical), desc(tasks.createdAt));

  return backlogTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as 'backlog' | 'todo' | 'in_progress' | 'done',
    isCritical: t.isCritical,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    assignee: t.assigneeId ? { id: t.assigneeId, name: t.assigneeName || 'Unknown', imageUrl: t.assigneeImageUrl } : null,
  }));
}

export default async function BacklogPage() {
  const backlogTasks = await getBacklogTasks();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pila de Tareas</h2>
        <p className="text-muted-foreground">
          {backlogTasks.length} tarea{backlogTasks.length !== 1 ? 's' : ''} pendiente{backlogTasks.length !== 1 ? 's' : ''}
        </p>
      </div>
      <BacklogList initialTasks={backlogTasks} />
    </div>
  );
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores
- [ ] Página muestra lista real de tareas

---

## Fase 5: Integrar Modal en Kanban

> Abrir modal de completar cuando se arrastra tarea a Done.

- [ ] **5.1** Agregar import de CompleteTaskModal al KanbanBoard

📋 **Context:**
- Why: Necesitamos el modal de completar
- Current: No está importado
- Target: Import agregado

📁 **Files:**
- Primary: `components/kanban-board.tsx`

🔧 **Changes:**
- Location: Agregar import después de TaskCard
- BEFORE:
```typescript
import { TaskCard } from './task-card';
import type { KanbanData, KanbanTaskData } from '@/app/actions/kanban';
```
- AFTER:
```typescript
import { TaskCard } from './task-card';
import { CompleteTaskModal } from './complete-task-modal';
import type { KanbanData, KanbanTaskData } from '@/app/actions/kanban';
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **5.2** Agregar estado para modal en KanbanBoard

📋 **Context:**
- Why: Necesitamos trackear la tarea pendiente y si el modal está abierto
- Current: No existe
- Target: Estados showCompleteModal y pendingCompleteTask

📁 **Files:**
- Primary: `components/kanban-board.tsx`

🔧 **Changes:**
- Location: Después de const [kanbanData, setKanbanData]
- BEFORE:
```typescript
  const [kanbanData, setKanbanData] = useState<KanbanData>(initialData);

  // Sincronizar estado local
```
- AFTER:
```typescript
  const [kanbanData, setKanbanData] = useState<KanbanData>(initialData);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [pendingCompleteTask, setPendingCompleteTask] = useState<{
    task: KanbanTaskData;
    oldStatus: 'backlog' | 'todo' | 'in_progress' | 'done';
  } | null>(null);

  // Sincronizar estado local
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **5.3** Modificar handleDragEnd para abrir modal en drop a done

📋 **Context:**
- Why: En vez de actualizar directo, abrir modal si es drop a done
- Current: Siempre actualiza estado directo
- Target: Si newStatus === 'done', abrir modal

📁 **Files:**
- Primary: `components/kanban-board.tsx`

🔧 **Changes:**
- Location: En handleDragEnd, después de verificar que el status cambió
- BEFORE:
```typescript
    const oldStatus = task.status;

    // OPTIMISTIC UPDATE: Immediately update local state
```
- AFTER:
```typescript
    const oldStatus = task.status;

    // If dropping to 'done', open complete modal
    if (newStatus === 'done') {
      setKanbanData((prev) => {
        const oldColumnTasks = prev[oldStatus].filter((t) => t.id !== taskId);
        const updatedTask = { ...task, status: newStatus };
        const newColumnTasks = [...prev[newStatus], updatedTask];
        return { ...prev, [oldStatus]: oldColumnTasks, [newStatus]: newColumnTasks };
      });
      setPendingCompleteTask({ task, oldStatus });
      setShowCompleteModal(true);
      return;
    }

    // OPTIMISTIC UPDATE: Immediately update local state
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **5.4** Agregar handlers y renderizar CompleteTaskModal en KanbanBoard

📋 **Context:**
- Why: Necesitamos handlers para cuando el modal se cierra o completa
- Current: No existen
- Target: Handlers y modal renderizado

📁 **Files:**
- Primary: `components/kanban-board.tsx`

🔧 **Changes:**
- Location: Agregar funciones antes del return, y modal después de DragOverlay
- AFTER (agregar funciones antes del return):
```typescript
  function handleCompleteModalClose() {
    if (pendingCompleteTask) {
      const { task, oldStatus } = pendingCompleteTask;
      setKanbanData((prev) => {
        const doneColumnTasks = prev.done.filter((t) => t.id !== task.id);
        const oldColumnTasks = [...prev[oldStatus], task];
        return { ...prev, done: doneColumnTasks, [oldStatus]: oldColumnTasks };
      });
    }
    setPendingCompleteTask(null);
    setShowCompleteModal(false);
  }

  function handleCompleteSuccess() {
    setPendingCompleteTask(null);
    setShowCompleteModal(false);
    router.refresh();
  }
```

- AFTER (agregar modal después de </DndContext>):
```typescript
      {pendingCompleteTask && (
        <CompleteTaskModal
          task={pendingCompleteTask.task}
          isOpen={showCompleteModal}
          onClose={handleCompleteModalClose}
          onComplete={handleCompleteSuccess}
        />
      )}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores
- [ ] Al arrastrar a Done se abre el modal

---

## Fase 6: Activity Filters

> Agregar filtros al feed de actividad.

- [ ] **6.1** Crear componente ActivityFilters

📋 **Context:**
- Why: Tabs para filtrar actividad
- Current: No existe
- Target: Componente con tabs Todos/Completados/Mis Menciones

📁 **Files:**
- Primary: `components/activity-filters.tsx` (NUEVO)

🔧 **Changes:**
- AFTER:
```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ActivityFilter } from '@/app/actions/activity';

const filters: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Completados' },
  { value: 'mentions', label: 'Mis Menciones' },
];

export function ActivityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = (searchParams.get('filter') as ActivityFilter) || 'all';

  function handleFilterChange(filter: ActivityFilter) {
    const params = new URLSearchParams(searchParams);
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    router.push(`/dashboard/activity?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => handleFilterChange(filter.value)}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
            currentFilter === filter.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **6.2** Actualizar activity page para usar filtros

📋 **Context:**
- Why: Página debe leer filtro de URL y pasarlo a getActivityFeed
- Current: Siempre muestra todos
- Target: Lee searchParams y filtra

📁 **Files:**
- Primary: `app/(dashboard)/dashboard/activity/page.tsx`

🔧 **Changes:**
- BEFORE (archivo completo):
```typescript
import { getActivityFeed } from '@/app/actions/activity'
import { ActivityItem } from '@/components/activity-item'
import { Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const activities = await getActivityFeed()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Feed de Actividad</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Cambios recientes en todas las tareas
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {activities.length > 0 ? (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
              <Activity className="h-8 w-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Aún no hay actividad
            </h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              La actividad de tareas aparecerá aquí cuando el equipo trabaje
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```
- AFTER:
```typescript
import { getActivityFeed, type ActivityFilter } from '@/app/actions/activity'
import { ActivityItem } from '@/components/activity-item'
import { ActivityFilters } from '@/components/activity-filters'
import { Activity, PartyPopper, AtSign } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ filter?: ActivityFilter }> };

export default async function ActivityPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = params.filter || 'all';
  const activities = await getActivityFeed(filter);

  const emptyState = {
    all: { icon: <Activity className="h-8 w-8 text-muted-foreground" />, title: 'Aún no hay actividad', description: 'La actividad de tareas aparecerá aquí cuando el equipo trabaje' },
    completed: { icon: <PartyPopper className="h-8 w-8 text-muted-foreground" />, title: 'No hay tareas completadas', description: 'Las tareas completadas aparecerán aquí' },
    mentions: { icon: <AtSign className="h-8 w-8 text-muted-foreground" />, title: 'No tienes menciones', description: 'Cuando alguien te mencione en una tarea, aparecerá aquí' },
  }[filter];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feed de Actividad</h2>
          <p className="text-muted-foreground">Cambios recientes en todas las tareas</p>
        </div>
        <ActivityFilters />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {activities.length > 0 ? (
          <div className="divide-y divide-white/5">
            {activities.map((activity) => (<ActivityItem key={activity.id} activity={activity} />))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">{emptyState.icon}</div>
            <h3 className="text-lg font-bold">{emptyState.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{emptyState.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **6.3** Actualizar ActivityItem para mostrar datos de completion

📋 **Context:**
- Why: Mostrar notas y links cuando action es 'completed'
- Current: No maneja el tipo completed
- Target: Muestra notas, links y iconos nuevos

📁 **Files:**
- Primary: `components/activity-item.tsx`

🔧 **Changes:**
- Location: Agregar imports y casos para completed/mentioned
- BEFORE (imports):
```typescript
import {
  CheckCircle2,
  ArrowRightCircle,
  UserPlus,
  Edit3,
  Trash2
} from 'lucide-react'
```
- AFTER:
```typescript
import {
  CheckCircle2,
  ArrowRightCircle,
  UserPlus,
  Edit3,
  Trash2,
  PartyPopper,
  AtSign,
  Link as LinkIcon
} from 'lucide-react'
```

- Location: Agregar casos en getActionIcon
- AFTER (agregar al switch):
```typescript
    case 'completed':
      return <PartyPopper className="h-5 w-5 text-emerald-500" />
    case 'mentioned':
      return <AtSign className="h-5 w-5 text-cyan-500" />
```

- Location: Agregar casos en getActivityMessage
- AFTER (agregar al switch):
```typescript
    case 'completed': {
      const taskTitle = metadata?.taskTitle as string | undefined
      return taskTitle ? `completó la tarea "${taskTitle}"` : 'completó una tarea'
    }
    case 'mentioned': {
      const taskTitle = metadata?.taskTitle as string | undefined
      return taskTitle ? `te mencionó en "${taskTitle}"` : 'te mencionó en una tarea'
    }
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **6.4** Agregar renderizado de notas y links en ActivityItem

📋 **Context:**
- Why: Mostrar notas y links cuando hay datos de completion
- Current: Solo muestra mensaje básico
- Target: Renderiza notas y links como chips

📁 **Files:**
- Primary: `components/activity-item.tsx`

🔧 **Changes:**
- Location: Después del timestamp, antes del cierre de </div>
- AFTER (agregar):
```typescript
        {activity.action === 'completed' && activity.metadata && (
          <div className="mt-3 space-y-2">
            {activity.metadata.notes && (
              <p className="text-sm text-muted-foreground bg-white/5 rounded-lg p-3 border-l-2 border-emerald-500/50">
                {String(activity.metadata.notes)}
              </p>
            )}
            {activity.metadata.links && Array.isArray(activity.metadata.links) && activity.metadata.links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(activity.metadata.links as string[]).map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-primary transition-colors">
                    <LinkIcon className="h-3 w-3" />
                    {new URL(link).hostname}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        {activity.action === 'mentioned' && activity.metadata?.context && (
          <p className="mt-2 text-sm text-muted-foreground bg-cyan-500/5 rounded-lg p-3 border-l-2 border-cyan-500/50">
            {String(activity.metadata.context)}
          </p>
        )}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

## Fase 7: Complete Button in TaskDetailDialog

> Agregar botón para completar tarea desde el modal de detalles.

- [ ] **7.1** Agregar import y estado de CompleteTaskModal en TaskDetailDialog

📋 **Context:**
- Why: Necesitamos poder abrir el modal de completar desde detalles
- Current: No tiene esta funcionalidad
- Target: Import y estado para el modal

📁 **Files:**
- Primary: `components/task-detail-dialog.tsx`

🔧 **Changes:**
- Location: Agregar imports
- BEFORE:
```typescript
import { X, Calendar, User, AlignLeft, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { updateTaskMetadata, assignTask, deleteTask } from '@/app/actions/tasks';
```
- AFTER:
```typescript
import { X, Calendar, User, AlignLeft, Trash2, Check, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { updateTaskMetadata, assignTask, deleteTask } from '@/app/actions/tasks';
import { CompleteTaskModal } from './complete-task-modal';
```

- Location: Agregar estado
- BEFORE:
```typescript
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
```
- AFTER:
```typescript
  const [isSaving, setIsSaving] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **7.2** Agregar botón de completar en header del TaskDetailDialog

📋 **Context:**
- Why: Botón visible para completar tarea
- Current: Solo tiene delete y close
- Target: Agregar botón de completar antes de delete

📁 **Files:**
- Primary: `components/task-detail-dialog.tsx`

🔧 **Changes:**
- Location: En el header, antes del botón delete
- BEFORE:
```typescript
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
```
- AFTER:
```typescript
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
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores

---

- [ ] **7.3** Renderizar CompleteTaskModal en TaskDetailDialog

📋 **Context:**
- Why: Mostrar el modal cuando se hace click en completar
- Current: No existe
- Target: Renderizar modal al final del componente

📁 **Files:**
- Primary: `components/task-detail-dialog.tsx`

🔧 **Changes:**
- Location: Antes del cierre del div principal del modal
- BEFORE:
```typescript
        </div>
      </div>
    </div>
  );
}
```
- AFTER:
```typescript
        </div>
      </div>

      <CompleteTaskModal
        task={task}
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onComplete={() => { setShowCompleteModal(false); onClose(); }}
      />
    </div>
  );
}
```

✅ **Validation:**
- [ ] `pnpm build` pasa sin errores
- [ ] Botón de completar visible en modal de detalles

---

## Summary

| Fase | Tareas | Descripción |
|------|--------|-------------|
| 0 | 2 | Dependencies & Setup |
| 1 | 4 | Database Schema |
| 2 | 6 | Server Actions |
| 3 | 3 | Complete Task Modal Components |
| 4 | 3 | Backlog Page Components |
| 5 | 4 | Integrate Modal in Kanban |
| 6 | 4 | Activity Filters |
| 7 | 3 | Complete Button in TaskDetailDialog |
| **Total** | **29** | |
