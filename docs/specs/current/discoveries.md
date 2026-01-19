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

### Session 8 - 2026-01-19
**Task:** 3.1 - Componente MentionInput
**Files:** `components/mention-input.tsx` (nuevo)
**Patterns:**
- Trigger character detection: detectar "@" en textarea y mostrar dropdown posicionado
- Formato de mención: `@[name](userId)` permite extraer IDs con regex simple
- useCallback debe declararse antes de usarse en otros useCallbacks (hoisting issue en React hooks)
- No usar `setSelectedIndex` en useEffect - resetear dentro del handler de onChange para evitar cascading renders
- Regex para extraer IDs: `/@\[[^\]]+\]\(([^)]+)\)/g` captura el grupo de userId
**Notes:**
- El componente expone `extractMentionIds(text)` como helper para extraer IDs del texto
- Navegación con teclado: ArrowUp/Down para seleccionar, Enter/Tab para confirmar, Escape para cerrar
- El dropdown se cierra automáticamente al hacer click fuera (event listener en document)
- Props simples: `{ value, onChange, placeholder }` - controlled component pattern
- Próxima tarea: componente LinkInput (3.2)

### Session 9 - 2026-01-19
**Task:** 3.2 - Componente LinkInput
**Files:** `components/link-input.tsx` (nuevo)
**Patterns:**
- `new URL()` para validación: más robusto que regex, valida formato y estructura según estándares web
- Auto-prefix `https://`: si no hay protocolo, agregarlo automáticamente mejora UX sin comprometer validación
- `getDomain()` helper: extraer hostname para mostrar URLs de forma legible en chips
- `group-hover:` para mostrar botón de eliminar solo al hover del contenedor padre
**Notes:**
- Componente controlado: recibe `links[]` y notifica cambios con `onChange`
- Validación inline con estado de error que se limpia al escribir
- Detecta duplicados y muestra mensaje apropiado
- Enter en input dispara handleAdd automáticamente
- Próxima tarea: componente CompleteTaskModal (3.3)

### Session 10 - 2026-01-19
**Task:** 3.3 - Componente CompleteTaskModal
**Files:** `components/complete-task-modal.tsx` (nuevo)
**Patterns:**
- Confirmación de contenido: usar `confirm()` nativo antes de cerrar si hay notas o links escritos
- Efectos de celebración: llamar `fireConfetti()` y `playCelebrationSound()` DESPUÉS de verificar `result.success`
- Wrapper con key pattern: `<ModalInner key={task.id} />` resetea estado del form cuando cambia la tarea
- Alias de imports: `Link as LinkIconHeader` para evitar conflicto con el tipo Link de next/link
**Notes:**
- El modal es reutilizable: puede ser llamado desde KanbanBoard (Fase 5) y desde TaskDetailDialog (Fase 7)
- Props incluyen `onComplete` callback opcional para notificar al componente padre después de completar
- El texto está en español siguiendo convención del proyecto (Cancelar, Completar, etc.)
- Próxima tarea: componente BacklogTaskCard (4.1)

### Session 11 - 2026-01-19
**Task:** 4.1 - Componente BacklogTaskCard
**Files:** `components/backlog-task-card.tsx` (nuevo)
**Patterns:**
- `useSortable` vs `useDraggable`: usar `useSortable` para listas verticales reordenables, incluye automáticamente animaciones de reordenamiento
- Grip handle separado: aplicar `listeners` y `attributes` SOLO al grip, no a toda la card - permite clicks sin iniciar drag
- Tipo extendido: `BacklogTaskData = KanbanTaskData & { isCritical: boolean }` para agregar campo sin modificar tipo base
- Estilos condicionales con template literals: clases de borde y sombra cambian según `task.isCritical`
**Notes:**
- El componente exporta `BacklogTaskData` para uso en BacklogList
- Menú tiene 2 opciones: toggle crítico (con validación server-side de 1 por usuario) y eliminar
- Los mensajes de toast están en español siguiendo convención del proyecto
- Próxima tarea: componente BacklogList con DndContext (4.2)

### Session 12 - 2026-01-19
**Task:** 4.2 - Componente BacklogList con DndContext
**Files:** `components/backlog-list.tsx` (nuevo)
**Patterns:**
- `SortableContext` + `verticalListSortingStrategy`: para listas verticales reordenables con animaciones suaves
- `arrayMove` de @dnd-kit/sortable: función helper inmutable para reordenar arrays en React state
- `closestCenter` vs `closestCorners`: center es mejor para listas verticales, corners para grids/tableros
- Estado local sin persistencia: el spec indica que el orden visual no persiste, así que usamos useState sin server action
**Notes:**
- El componente recibe `initialTasks` pero el estado es local - refresh resetea al orden original (críticas primero + fecha)
- DragOverlay muestra la card siendo arrastrada con `rotate-2 scale-105` para feedback visual
- Empty state incluido con mensaje "No hay tareas en el backlog" y sugerencia de crear una nueva
- Próxima tarea: actualizar backlog/page.tsx (4.3)

### Session 13 - 2026-01-19
**Task:** 4.3 - Actualizar backlog/page.tsx
**Files:** `app/(dashboard)/dashboard/backlog/page.tsx`, `app/actions/kanban.ts`, `components/backlog-task-card.tsx`
**Patterns:**
- `getBacklogTasks()` agregada a `kanban.ts` siguiendo el mismo patrón que `getKanbanData()`
- Ordenamiento en Drizzle: `orderBy(desc(tasks.isCritical), asc(tasks.createdAt))` - críticas primero, luego FIFO por fecha
- Tipo centralizado: `BacklogTaskData` ahora exportado desde `kanban.ts`, re-exportado en `backlog-task-card.tsx`
- Contador de tareas con pluralización: `{tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}`
**Notes:**
- La página es un Server Component async que fetcha datos directamente
- El header muestra contador de tareas estilizado con glassmorphism
- El componente `BacklogList` recibe `initialTasks` y maneja el drag & drop visual
- Próxima tarea: agregar estado y modal en KanbanBoard (5.1)
