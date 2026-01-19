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

### Session 1 - 2026-01-19
**Task:** 0.1 - Instalar canvas-confetti y crear lib/confetti.ts
**Files:** `lib/confetti.ts` (nuevo), `package.json` (dependencias)
**Patterns:**
- "use client" obligatorio para archivos que usan APIs del navegador
- Guard `typeof window === "undefined"` para SSR safety
- Web Audio API como alternativa ligera a archivos de sonido
- `prefers-reduced-motion` para accesibilidad
**Notes:**
- Error de lint en `task-detail-dialog.tsx:29` fue arreglado en sesión 2

### Session 2 - 2026-01-19
**Task:** 1.1 - Agregar campos de completion a tabla tasks en schema.ts
**Files:** `db/schema.ts`, `components/task-detail-dialog.tsx`
**Patterns:**
- `.$type<T>()` en Drizzle para tipar campos JSONB en TypeScript
- Patrón "Key Reset": usar `key={task.id}` para resetear estado de form cuando cambia la entidad
- Wrapper component pattern: componente exterior maneja open/close, interior maneja el form
**Notes:**
- Se corrigió error preexistente de "setState in effect" usando key pattern
- Los campos JSONB con `.$type<string[]>()` dan type safety sin cambiar el SQL
- Próxima tarea: agregar 'completed' y 'mentioned' al activityActionEnum (1.2)

### Session 3 - 2026-01-19
**Task:** 1.2 - Agregar 'completed' y 'mentioned' a activityActionEnum
**Files:** `db/schema.ts`, `app/actions/activity.ts`, `components/activity-item.tsx`
**Patterns:**
- Al modificar un pgEnum, también hay que actualizar tipos manuales que lo usan (como `ActivityData`)
- Switch exhaustiveness: TypeScript fuerza a cubrir todos los casos del union type
- Agregar casos al switch de íconos y mensajes cuando se extiende un enum
**Notes:**
- El tipo `ActivityData.action` era un union literal hardcodeado, se actualizó para incluir nuevos valores
- Se agregaron íconos: `PartyPopper` (completed), `AtSign` (mentioned)
- Se agregaron mensajes en español: "completó la tarea" y "te mencionó en"
- Próxima tarea: generar y aplicar migración (1.3)

### Session 4 - 2026-01-19
**Task:** 1.3 - Generar y aplicar migración
**Files:** `db/migrations/0002_true_luminals.sql` (nuevo)
**Patterns:**
- `pnpm drizzle-kit generate` crea archivos SQL versionados automáticamente desde el schema
- `pnpm drizzle-kit push --force` aplica cambios sin prompt interactivo
- Cargar variables de entorno manualmente para CLI: `export $(cat .env.local | grep -v '^#' | xargs)`
- El archivo `.env.local` es el estándar en Next.js para credenciales locales
**Notes:**
- La migración 0002 contiene: 2 nuevos valores de enum + 5 nuevas columnas en tasks
- El nombre de migración (`0002_true_luminals.sql`) es auto-generado por Drizzle
- Próxima tarea: crear toggleTaskCritical action (2.1)

### Session 5 - 2026-01-19
**Task:** 2.1 - Action toggleTaskCritical en tasks.ts
**Files:** `app/actions/tasks.ts`
**Patterns:**
- Validación de "1 crítica por usuario" requiere query adicional antes del update
- El check se hace solo al activar (`!currentTask.isCritical`), no al desactivar
- Usar `creatorId` (no `assigneeId`) para la regla de unicidad - el creador es el dueño del backlog personal
**Notes:**
- Zod schema simple: solo requiere taskId UUID
- Mensaje de error en español siguiendo convención del proyecto
- No se crea activity log para cambio de crítico (no especificado en spec)
- Próxima tarea: crear completeTask action (2.2)

### Session 6 - 2026-01-19
**Task:** 2.2 - Action completeTask en tasks.ts
**Files:** `app/actions/tasks.ts`
**Patterns:**
- Para menciones, crear actividad 'mentioned' con `userId` del mencionado (no del que menciona)
- Guardar `mentionedBy` en metadata para poder mostrar "X te mencionó"
- Revalidar `/activity` además de las otras rutas
- Schema Zod con `.max()` en arrays: `z.array(z.string().url()).max(10)`
**Notes:**
- La action valida URLs con Zod antes de guardar en DB
- Límite de 2000 caracteres en notas (consistente con description)
- Las menciones son array de IDs de usuario (no el formato @[name](id) que es solo para UI)
- Próxima tarea: agregar filtro a getActivityFeed (2.3)

### Session 7 - 2026-01-19
**Task:** 2.3 - Agregar filtro a getActivityFeed en activity.ts
**Files:** `app/actions/activity.ts`
**Patterns:**
- `and()` de drizzle-orm combina múltiples condiciones WHERE
- Parámetro con default (`filter = 'all'`) mantiene compatibilidad con llamadas existentes
- Para 'mentions': buscar `action='mentioned' AND userId=currentUser` porque las menciones se crean con el userId del mencionado
- `.where(undefined)` no agrega WHERE - permite queries condicionales elegantes
**Notes:**
- Se exporta nuevo tipo `ActivityFilter` para uso en componentes de UI
- El filtro 'completed' solo busca `action='completed'`, no incluye otras acciones
- El filtro 'mentions' requiere auth - si no hay usuario retorna array vacío
- Próxima tarea: componente MentionInput (3.1)
