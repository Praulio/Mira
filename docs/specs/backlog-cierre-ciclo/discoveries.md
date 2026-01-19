# Discoveries: Backlog Funcional + Cierre de Ciclo

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementación)

---

## Convenciones del Proyecto

- **Idioma UI**: Español (botones, labels, mensajes)
- **Idioma Código**: Inglés (variables, funciones)
- **Glassmorphism**: Usar `backdrop-blur-[40px]`, `bg-white/5`, `border-white/10`
- **Toasts**: Usar `sonner` con `toast.success()` y `toast.error()`
- **Server Actions**: Retornar `{ success: boolean, data?: T, error?: string }`

---

## Sesiones

### Session 0 - 2026-01-19

**Setup inicial**
- Implementation plan regenerado con formato simplificado: 19 tareas en 8 fases
- Formato nuevo: Input/Output/Comportamiento/Referencia (~5 líneas por tarea)
- Spec completo con flujos de usuario y edge cases

**Patrones identificados del codebase:**

1. **Server Actions:**
   - Siempre `'use server'` al inicio
   - Retornan `{ success: boolean, data?: T, error?: string }`
   - Usan `revalidatePath()` después de mutaciones
   - Validación con Zod antes de DB operations

2. **Drizzle ORM:**
   - Tipos inferidos: `typeof tasks.$inferSelect`
   - Enum con `pgEnum('name', ['val1', 'val2'])`
   - `boolean()` importado de `drizzle-orm/pg-core`
   - Migrations en `db/migrations/`

3. **Drag & Drop:**
   - `@dnd-kit/core` para DndContext
   - `@dnd-kit/sortable` para SortableContext y useSortable
   - Patrón: sensors → handleDragEnd → updateTaskStatus

4. **UI Patterns:**
   - Glassmorphism: `backdrop-blur-[40px]`, `bg-white/5`, `border-white/10`
   - Toasts con `sonner`: `toast.success()`, `toast.error()`
   - Dialogs con Radix UI: `Dialog`, `DialogContent`, `DialogHeader`
   - Cards con hover states y transitions

5. **Activity Feed:**
   - `activityActionEnum` define tipos de acción
   - `activity` table con `taskId`, `userId`, `action`, `metadata`
   - `ActivityItem` component renderiza cada entrada

**Archivos clave analizados:**
- `db/schema.ts` - Schema sin campos de completion (se agregarán)
- `app/actions/tasks.ts` - 5 actions existentes como patrón
- `app/actions/activity.ts` - getActivityFeed sin filtros (se agregarán)
- `components/kanban-board.tsx` - DndContext con handleDragEnd
- `components/task-card.tsx` - Card glassmorphism con menú
- `components/task-detail-dialog.tsx` - Modal de detalles
- `app/(dashboard)/dashboard/backlog/page.tsx` - Placeholder actual
- `app/(dashboard)/dashboard/activity/page.tsx` - Feed actual

**Próximos pasos:**
- Ejecutar `./ralph-loop.sh backlog-cierre-ciclo`
- Monitorear con `tail -f ralph-log.txt`
