---
title: "feat: Grid Adaptativo de Miembros + Historial de Tareas Completadas"
type: feat
date: 2026-02-04
brainstorm: docs/brainstorms/2026-02-04-team-cards-adaptativo-y-archivo-done-brainstorm.md
---

# Grid Adaptativo de Miembros + Historial de Tareas Completadas

## Overview

Dos mejoras relacionadas al dashboard y kanban:

1. **Grid Adaptativo**: Eliminar placeholders "Espacio X Disponible" del dashboard de equipo. Las cards de miembros reales se distribuyen cubriendo todo el espacio disponible.

2. **Historial de Tareas**: La columna Done solo muestra tareas de los últimos 7 días. Nueva página `/kanban/historial` con navegación por días, filtro por usuario, y expansión inline de detalles.

---

## Archivos Afectados

### Feature 1: Grid Adaptativo

| Archivo | Cambio |
|---------|--------|
| `app/(dashboard)/dashboard/page.tsx` | Eliminar array fijo de 8 slots |
| `components/team-slot.tsx` | Eliminar render de slot vacío |
| `app/actions/team.ts` | Evaluar límite de usuarios |
| `app/globals.css` | Ajustar animaciones del grid |

### Feature 2: Historial de Tareas

| Archivo | Cambio |
|---------|--------|
| `app/actions/kanban.ts` | Agregar filtro de 7 días en Done |
| `components/kanban-column.tsx` | Agregar botón "Ver historial" |
| `app/(dashboard)/dashboard/kanban/historial/page.tsx` | **NUEVO** - Página de historial |
| `components/historial-view.tsx` | **NUEVO** - Vista con navegación |
| `components/historial-task-card.tsx` | **NUEVO** - Card expandible |
| `app/actions/tasks.ts` | Nueva función `getHistorialData()` |

---

## Decisiones Técnicas

### Cálculo de "Últimos 7 días"

```sql
-- Incluye hoy completo + 6 días anteriores
completedAt >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '6 days'
```

### Filtro por Usuario

Filtra por `assigneeId` (quien tenía asignada la tarea), no por quien ejecutó la completion.

### Límite de Usuarios

Se elimina el `.limit(8)` actual. Si hay más de 20 usuarios, se agregará paginación/scroll en fase futura.

### Expansión Inline

- Solo una tarea expandida a la vez (accordion)
- Muestra: descripción, notas de completion, links, duración
- Solo lectura (sin acciones)

---

## Implementation Phases

### Phase 1: Grid Adaptativo

#### 1.1 Modificar Dashboard Page

**Archivo:** `app/(dashboard)/dashboard/page.tsx`

```tsx
// ANTES (líneas 27-30)
const slotsToRender = Array.from({ length: 8 }, (_, i) => {
  return teamSlots[i] || null
})

// DESPUÉS
// Usar teamSlots directamente sin padding
```

```tsx
// ANTES (línea 47)
<div className="dashboard-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">

// DESPUÉS
<div className="dashboard-grid grid gap-6" style={{
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
}}>
```

```tsx
// ANTES (líneas 48-54)
{slotsToRender.map((slotData, index) => (
  <TeamSlot
    key={slotData?.user.id || `empty-${index}`}
    data={slotData}
    slotNumber={index + 1}
  />
))}

// DESPUÉS
{teamSlots.map((slotData) => (
  <TeamSlot
    key={slotData.user.id}
    data={slotData}
  />
))}
```

#### 1.2 Limpiar TeamSlot Component

**Archivo:** `components/team-slot.tsx`

```tsx
// ELIMINAR líneas 12-26 (renderizado de slot vacío)
// El componente ahora siempre recibe data !== null

// ANTES
interface TeamSlotProps {
  data: TeamSlotData | null
  slotNumber: number
}

// DESPUÉS
interface TeamSlotProps {
  data: TeamSlotData
}
```

#### 1.3 Agregar Empty State al Dashboard

**Archivo:** `app/(dashboard)/dashboard/page.tsx`

```tsx
// Agregar después de obtener teamSlots
{teamSlots.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
    <p className="text-lg font-medium text-muted-foreground">No hay miembros en este equipo</p>
    <p className="text-sm text-muted-foreground/60">Los miembros aparecerán aquí cuando se asignen al área</p>
  </div>
) : (
  <div className="dashboard-grid ...">
    {/* Grid de miembros */}
  </div>
)}
```

#### 1.4 Actualizar Animaciones CSS

**Archivo:** `app/globals.css`

```css
/* ANTES (líneas 264-276) - Delays hardcodeados hasta nth-child(8) */

/* DESPUÉS - Delay dinámico */
.dashboard-grid > * {
  animation: fade-in-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards;
  animation-delay: calc(var(--item-index, 0) * 0.05s);
}
```

Y en el componente:

```tsx
{teamSlots.map((slotData, index) => (
  <div style={{ '--item-index': index } as React.CSSProperties}>
    <TeamSlot key={slotData.user.id} data={slotData} />
  </div>
))}
```

#### 1.5 Remover Límite de Query (Opcional)

**Archivo:** `app/actions/team.ts`

```typescript
// ANTES (línea 52)
.limit(8);

// DESPUÉS - Sin límite o con límite más alto
.limit(50); // O remover completamente
```

---

### Phase 2: Filtro de 7 Días en Done

#### 2.1 Modificar Query de Kanban

**Archivo:** `app/actions/kanban.ts`

```typescript
import { gte, and } from 'drizzle-orm';

// En getKanbanData(), modificar query para Done
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
sevenDaysAgo.setHours(0, 0, 0, 0);

// Filtrar tareas Done por fecha
const recentDoneTasks = allTasks.filter(task =>
  task.status === 'done' &&
  task.completedAt &&
  new Date(task.completedAt) >= sevenDaysAgo
);

// O mejor: hacer query separada para Done
const doneTasks = await db
  .select({ /* campos */ })
  .from(tasks)
  .where(
    and(
      eq(tasks.area, area),
      eq(tasks.status, 'done'),
      gte(tasks.completedAt, sevenDaysAgo)
    )
  )
  .orderBy(desc(tasks.completedAt));
```

#### 2.2 Agregar Botón "Ver Historial"

**Archivo:** `components/kanban-column.tsx`

```tsx
// Después de la lista de TaskCards (aprox línea 98)
{id === 'done' && (
  <Link
    href="/dashboard/kanban/historial"
    className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
  >
    <History className="h-4 w-4" />
    Ver historial completo
  </Link>
)}
```

---

### Phase 3: Página de Historial

#### 3.1 Crear Server Action

**Archivo:** `app/actions/tasks.ts`

```typescript
// historial.ts

export interface HistorialFilters {
  date: Date;
  userId?: string;
}

export interface HistorialData {
  tasks: HistorialTask[];
  users: { id: string; name: string; imageUrl: string | null }[];
  hasOlderTasks: boolean;
  hasNewerTasks: boolean;
}

export async function getHistorialData(
  filters: HistorialFilters
): Promise<HistorialData> {
  const area = await getCurrentArea();

  // Calcular rango del día
  const startOfDay = new Date(filters.date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(filters.date);
  endOfDay.setHours(23, 59, 59, 999);

  // Query tareas del día
  const conditions = [
    eq(tasks.area, area),
    eq(tasks.status, 'done'),
    gte(tasks.completedAt, startOfDay),
    lte(tasks.completedAt, endOfDay),
  ];

  if (filters.userId) {
    conditions.push(eq(tasks.assigneeId, filters.userId));
  }

  const dayTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      assigneeImage: users.imageUrl,
      completedAt: tasks.completedAt,
      startedAt: tasks.startedAt,
      completionNotes: tasks.completionNotes,
      completionLinks: tasks.completionLinks,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(and(...conditions))
    .orderBy(desc(tasks.completedAt));

  // Obtener usuarios del área para filtro
  const areaUsers = await db
    .select({ id: users.id, name: users.name, imageUrl: users.imageUrl })
    .from(users)
    .where(eq(users.area, area));

  // Verificar si hay tareas más antiguas/nuevas
  const [olderTask] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(
      eq(tasks.area, area),
      eq(tasks.status, 'done'),
      lt(tasks.completedAt, startOfDay)
    ))
    .limit(1);

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const hasNewerTasks = endOfDay < today;

  return {
    tasks: dayTasks,
    users: areaUsers,
    hasOlderTasks: !!olderTask,
    hasNewerTasks,
  };
}
```

#### 3.2 Crear Página de Historial

**Archivo:** `app/(dashboard)/dashboard/kanban/historial/page.tsx`

```tsx
import { getHistorialData } from '@/app/actions/tasks';
import { HistorialView } from '@/components/historial-view';
import { getAuth } from '@/lib/mock-auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ date?: string; user?: string }>;
};

export default async function HistorialPage({ searchParams }: PageProps) {
  const auth = await getAuth();
  if (!auth) redirect('/login');

  const params = await searchParams;

  // Parsear fecha de URL o usar hoy
  const date = params.date
    ? new Date(params.date)
    : new Date();

  // Validar fecha
  if (isNaN(date.getTime())) {
    redirect('/dashboard/kanban/historial');
  }

  const historialData = await getHistorialData({
    date,
    userId: params.user,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Historial de Tareas</h2>
          <p className="text-muted-foreground">
            Tareas completadas por día
          </p>
        </div>
      </div>

      <HistorialView
        initialData={historialData}
        initialDate={date}
        initialUserId={params.user}
      />
    </div>
  );
}
```

#### 3.3 Crear Componente de Vista

**Archivo:** `components/historial-view.tsx`

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HistorialTaskCard } from './historial-task-card';
import type { HistorialData } from '@/app/actions/tasks';

interface HistorialViewProps {
  initialData: HistorialData;
  initialDate: Date;
  initialUserId?: string;
}

export function HistorialView({
  initialData,
  initialDate,
  initialUserId
}: HistorialViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(initialDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));

    startTransition(() => {
      const params = new URLSearchParams();
      params.set('date', newDate.toISOString().split('T')[0]);
      if (initialUserId) params.set('user', initialUserId);
      router.push(`/dashboard/kanban/historial?${params.toString()}`);
    });
  };

  const handleUserFilter = (userId: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams();
      params.set('date', initialDate.toISOString().split('T')[0]);
      if (userId) params.set('user', userId);
      router.push(`/dashboard/kanban/historial?${params.toString()}`);
    });
  };

  const isToday = new Date().toDateString() === initialDate.toDateString();

  return (
    <div className="space-y-6">
      {/* Navegación de fecha */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
        <button
          onClick={() => navigateDay('prev')}
          disabled={!initialData.hasOlderTasks || isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            'hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="hidden sm:inline">Día anterior</span>
        </button>

        <div className="flex items-center gap-2 text-center">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="text-lg font-semibold capitalize">
            {formatDate(initialDate)}
          </span>
          {isToday && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
              Hoy
            </span>
          )}
        </div>

        <button
          onClick={() => navigateDay('next')}
          disabled={!initialData.hasNewerTasks || isToday || isPending}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
            'hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
          )}
        >
          <span className="hidden sm:inline">Día siguiente</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Filtro por usuario */}
      <div className="flex items-center gap-3">
        <User className="h-4 w-4 text-muted-foreground" />
        <select
          value={initialUserId || ''}
          onChange={(e) => handleUserFilter(e.target.value || null)}
          disabled={isPending}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos los usuarios</option>
          {initialData.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de tareas */}
      {isPending ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : initialData.tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            No hay tareas completadas este día
          </p>
          <p className="text-sm text-muted-foreground/60">
            Navega a otro día para ver el historial
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialData.tasks.map((task) => (
            <HistorialTaskCard
              key={task.id}
              task={task}
              isExpanded={expandedTaskId === task.id}
              onToggle={() => setExpandedTaskId(
                expandedTaskId === task.id ? null : task.id
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 3.4 Crear Componente de Card Expandible

**Archivo:** `components/historial-task-card.tsx`

```tsx
'use client';

import { ChevronDown, ChevronRight, Clock, Link as LinkIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface HistorialTask {
  id: string;
  title: string;
  description: string | null;
  assigneeName: string | null;
  assigneeImage: string | null;
  completedAt: Date | null;
  startedAt: Date | null;
  completionNotes: string | null;
  completionLinks: string[] | null;
}

interface HistorialTaskCardProps {
  task: HistorialTask;
  isExpanded: boolean;
  onToggle: () => void;
}

export function HistorialTaskCard({ task, isExpanded, onToggle }: HistorialTaskCardProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = () => {
    if (!task.startedAt || !task.completedAt) return null;
    const start = new Date(task.startedAt);
    const end = new Date(task.completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const duration = getDuration();

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:bg-white/[0.07]">
      {/* Header clickeable */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{task.title}</p>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {task.assigneeName && (
              <div className="flex items-center gap-1.5">
                {task.assigneeImage ? (
                  <Image
                    src={task.assigneeImage}
                    alt={task.assigneeName}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-muted" />
                )}
                <span>{task.assigneeName}</span>
              </div>
            )}
            <span>·</span>
            <span>{formatTime(task.completedAt)}</span>
            {duration && (
              <>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{duration}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Indicadores de contenido */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {task.completionNotes && <FileText className="h-4 w-4" />}
          {task.completionLinks && task.completionLinks.length > 0 && (
            <LinkIcon className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="border-t border-white/5 bg-white/[0.02] p-4 space-y-4">
          {/* Descripción */}
          {task.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Descripción
              </p>
              <p className="text-sm text-foreground/80">{task.description}</p>
            </div>
          )}

          {/* Notas de completion */}
          {task.completionNotes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Notas de cierre
              </p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {task.completionNotes}
              </p>
            </div>
          )}

          {/* Links */}
          {task.completionLinks && task.completionLinks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Enlaces
              </p>
              <div className="space-y-1.5">
                {task.completionLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Sin contenido adicional */}
          {!task.description && !task.completionNotes && (!task.completionLinks || task.completionLinks.length === 0) && (
            <p className="text-sm text-muted-foreground italic">
              No hay información adicional para esta tarea
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Acceptance Criteria

### Feature 1: Grid Adaptativo

- [x] Cards de miembros se distribuyen cubriendo el espacio disponible
- [x] No se muestran placeholders "Espacio X Disponible"
- [x] Grid es responsive (1 col mobile, 2+ cols tablet/desktop)
- [x] Empty state cuando hay 0 miembros en el área
- [x] Animaciones funcionan con cualquier cantidad de cards

### Feature 2: Historial de Tareas

- [x] Columna Done solo muestra tareas de últimos 7 días
- [x] Contador de Done refleja solo tareas visibles
- [x] Botón "Ver historial" visible en columna Done
- [x] Página `/kanban/historial` muestra tareas por día
- [x] Navegación con flechas ← → entre días funciona
- [x] Flecha derecha deshabilitada cuando es hoy
- [x] Flecha izquierda deshabilitada cuando no hay más tareas
- [x] Filtro por usuario funciona y persiste en URL
- [x] Click en tarea expande detalles inline
- [x] Solo una tarea puede estar expandida a la vez
- [x] Loading state visible al navegar entre días

---

## Testing Plan

### Grid Adaptativo

1. **0 usuarios**: Verificar empty state
2. **1 usuario**: Card ocupa espacio adecuado
3. **4 usuarios**: Grid 2x2 en desktop
4. **8+ usuarios**: Grid se adapta sin overflow
5. **Resize ventana**: Grid reflow correcto

### Historial

1. **Día con tareas**: Lista correcta
2. **Día sin tareas**: Empty state
3. **Navegación límite**: Flechas se deshabilitan
4. **Filtro usuario**: Solo muestra sus tareas
5. **Expansión**: Detalles visibles, accordion funciona
6. **URL directa**: Deep linking funciona

---

## References

- Brainstorm: `docs/brainstorms/2026-02-04-team-cards-adaptativo-y-archivo-done-brainstorm.md`
- Dashboard actual: `app/(dashboard)/dashboard/page.tsx:27-55`
- TeamSlot: `components/team-slot.tsx:12-26`
- Kanban actions: `app/actions/kanban.ts:58-161`
- Kanban column: `components/kanban-column.tsx:60-101`
- Activity filters (patrón): `components/activity-filters.tsx:46-65`
