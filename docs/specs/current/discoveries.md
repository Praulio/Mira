# Discoveries: Task Enhancements V2

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementación)

---

## Convenciones del Proyecto (heredadas del feature anterior)

- **Idioma UI**: Español (botones, labels, mensajes)
- **Idioma Código**: Inglés (variables, funciones)
- **Glassmorphism**: Usar `backdrop-blur-[40px]`, `bg-white/5`, `border-white/10`
- **Toasts**: Usar `sonner` con `toast.success()` y `toast.error()`
- **Server Actions**: Retornar `{ success: boolean, data?: T, error?: string }`
- **Drizzle**: Tipos inferidos `typeof tasks.$inferSelect`

---

## Decisiones de Diseño (del brainstorm)

| Decisión | Valor |
|----------|-------|
| Due Date - Umbral amarillo | ≤24 horas |
| Due Date - Permisos edición | Solo CREADOR |
| Progress - Permisos edición | Assignee O creador (si no hay assignee) |
| Progress - Guardado | Al soltar slider (onMouseUp/onTouchEnd) |
| Filtro - Ubicación | Encima de columnas, alineado derecha |
| Filtro - Persistencia | NO persiste (estado local) |

---

## Sesiones

### Session 0 - 2026-02-04

**Setup inicial**
- Implementation plan generado: 19 tareas en 6 fases
- Feature incluye:
  - Due Date con indicadores visuales (rojo/amarillo)
  - Eliminar página backlog (redirect a kanban)
  - Filtro "Mis Tareas" toggle en Kanban
  - Progress bar slider 0-100%

**Schema changes:**
- `dueDate: timestamp('due_date')` - nullable
- `progress: integer('progress').default(0)` - 0-100

**Archivos nuevos a crear:**
- Ninguno (solo modificaciones)

**Archivos a modificar:**
- `db/schema.ts` - agregar campos
- `app/actions/tasks.ts` - nuevas actions
- `app/actions/kanban.ts` - actualizar tipos y queries
- `app/actions/team.ts` - agregar progress
- `components/task-card.tsx` - due date badge, progress bar
- `components/team-slot.tsx` - progress bar
- `components/kanban-board.tsx` - filtro toggle
- `components/kanban-column.tsx` - mensaje vacío filtrado
- `components/create-task-dialog.tsx` - date picker
- `components/task-detail-dialog.tsx` - date picker, progress slider
- `components/sidebar.tsx` - remover enlace backlog
- `app/(dashboard)/dashboard/backlog/page.tsx` - convertir a redirect

**Próximos pasos:**
- Ejecutar `./ralph-loop.sh`
- Monitorear con `tail -f ralph-log.txt`

### Session 1 - 2026-02-04
**Task:** 0.1 - Agregar campos dueDate y progress al schema de tasks
**Files:** `db/schema.ts`
**Changes:**
- Agregado `dueDate: timestamp('due_date')` después de `parentTaskId`
- Agregado `progress: integer('progress').default(0)` después de `dueDate`
**Patterns:**
- Los campos timestamp sin `.notNull()` son nullable por defecto
- `integer().default(0)` crea el default a nivel de DB
**Notes:** Build pasa sin errores. Siguiente paso es generar y aplicar la migración Drizzle (tarea 0.2)

### Session 2 - 2026-02-04
**Task:** 0.2 - Generar y aplicar migración Drizzle
**Files:** Base de datos (Neon PostgreSQL)
**Changes:**
- DROP TABLE `notifications` CASCADE
- DROP COLUMN `description_mentions` de tasks (32 registros)
- DROP TYPE `notification_type`
**Investigation:**
- `description_mentions` era un campo **no implementado** - nunca se usaba
- Sistema de menciones funciona via tabla `activity` con `action: 'mentioned'`
- Menciones se crean al **completar** task, no al crear/editar descripción
- Campo `completionMentions` en schema SÍ se usa correctamente
**Patterns:**
- Para ejecutar drizzle-kit con env vars de .env.local: `DATABASE_URL=$(grep "^DATABASE_URL=" .env.local | cut -d'=' -f2-) npx drizzle-kit push --force`
- La flag `--force` evita el prompt interactivo que bloqueaba Ralph
**Notes:** Fase 0 completada. Build pasa. Siguiente: Fase 1 - Data Layer (actualizar tipos)

### Session 3 - 2026-02-04
**Task:** 1.1 - Actualizar tipo KanbanTaskData con dueDate y progress
**Files:** `app/actions/kanban.ts`
**Changes:**
- Agregado `dueDate: Date | null` al tipo KanbanTaskData (línea 32)
- Agregado `progress: number` al tipo KanbanTaskData (línea 33)
**Patterns:**
- Los tipos TypeScript se definen separados de las queries
- El `as KanbanTaskData` (type assertion) permite que el build pase aunque el objeto no tenga todos los campos
- La próxima tarea (1.2) debe actualizar la query para retornar los campos reales
**Notes:** Tarea 1.1 completada - solo actualiza el tipo. Task 1.2 actualizará la query.

### Session 4 - 2026-02-04
**Task:** 1.2 - Actualizar query getKanbanData para incluir nuevos campos
**Files:** `app/actions/kanban.ts`
**Changes:**
- Agregado `dueDate: tasks.dueDate` al select de la query (línea 87)
- Agregado `progress: tasks.progress` al select de la query (línea 88)
- Agregado `dueDate: task.dueDate` al objeto retornado (línea 127)
- Agregado `progress: task.progress ?? 0` al objeto retornado (línea 128)
**Patterns:**
- Los campos de Drizzle en el select se acceden como `tasks.campo`
- Para campos que pueden ser `null` pero tienen default en DB, usar `?? valorDefault` para garantizar tipo correcto
- El patrón de `getKanbanData` es: query → map con segunda query para creator → agrupar por status
**Notes:** Ahora los datos de dueDate y progress fluyen correctamente desde DB hasta el componente. Siguiente: 1.3 actualizar TeamSlotData

### Session 5 - 2026-02-04
**Task:** 1.3 - Actualizar TeamSlotData para incluir progress
**Files:** `app/actions/team.ts`
**Changes:**
- Agregado `progress: number` al tipo `TeamSlotData.inProgressTask` (línea 24)
- Agregado `progress: tasks.progress` al select de la query (línea 70)
- Transformación del objeto retornado con `progress: inProgressTask.progress ?? 0` para garantizar tipo `number`
**Patterns:**
- Cuando Drizzle retorna objeto nullable y el tipo exige campos non-null, usar spread con override: `{ ...obj, campo: obj.campo ?? default }`
- El patrón de `getTeamViewData` es: query users → Promise.all map → query in_progress task por user
**Notes:** Fase 1 completada. Data Layer actualizado para dueDate y progress en Kanban y Team View. Siguiente: Fase 1.5 (Unified Mentions)

### Session 6 - 2026-02-04
**Task:** 1.5.2 - Actualizar createTask para aceptar mentions
**Files:** `app/actions/tasks.ts`
**Changes:**
- Agregado `mentions: z.array(z.string()).optional()` a `createTaskSchema` (línea 28)
- Actualizado `createTask` para extraer `mentions` de validationResult.data
- Cambiado insert de task para incluir `mentions: mentions || null`
- Envuelto toda la lógica de creación en transacción `db.transaction()`
- Agregado loop para crear actividades `action: 'mentioned'` por cada usuario mencionado
- Agregado `context: 'creation'` en metadata para diferenciar de menciones al completar
**Patterns:**
- Las actividades 'mentioned' siempre tienen `userId` = el mencionado (para que aparezca en "Mis Menciones")
- El campo `mentionedBy` en metadata indica quién hizo la mención
- Contexto en metadata diferencia origen: 'creation', 'edit', o ausente (completar tarea)
- Envolver en transacción cuando hay múltiples inserts relacionados
**Notes:** Ahora las menciones funcionan desde la creación de tareas. Siguiente: 1.5.3 (menciones al editar descripción)

### Session 7 - 2026-02-04
**Task:** 1.5.3 - Actualizar updateTaskMetadata para procesar mentions
**Files:** `app/actions/tasks.ts`
**Changes:**
- Agregado `mentions: z.array(z.string()).optional()` a `updateTaskMetadataSchema` (línea 91)
- Actualizado `updateTaskMetadata` para extraer `mentions` de validationResult.data
- Agregado update de campo `mentions` en `updateData` si se proporciona
- Implementado **diff de menciones**: `newMentions = mentions.filter(m => !existingMentions.includes(m))`
- Solo se crean activities 'mentioned' para menciones NUEVAS (evita spam)
- Agregado `context: 'edit'` en metadata para diferenciar origen
- Agregado `revalidatePath('/activity')` para refrescar vista de actividad
**Patterns:**
- **Diff de menciones**: Obtener existentes del task actual, filtrar las nuevas con `Array.filter()`
- El campo `mentions` en DB es `jsonb.$type<string[]>()`, TypeScript lo ve como `unknown`, cast a `string[] | null`
- `fieldsUpdated` en metadata del activity ahora incluye `mentions: boolean` para trazabilidad
**Notes:** Menciones funcionan al editar descripción. Siguiente: 1.5.5 (MentionInput en CreateTaskDialog)

### Session 8 - 2026-02-04
**Task:** 1.5.5 - Agregar MentionInput a CreateTaskDialog
**Files:** `components/create-task-dialog.tsx`
**Changes:**
- Importado `MentionInput` y `extractMentionIds` de `@/components/mention-input`
- Agregado estado controlado `description` con `useState('')`
- Reemplazado textarea de descripción con componente `MentionInput`
- Extraído `mentionIds` usando `extractMentionIds(description)` antes de llamar `createTask()`
- Pasado `mentions: mentionIds.length > 0 ? mentionIds : undefined` a `createTask()`
- Agregado `setDescription('')` al resetear el formulario
**Patterns:**
- `MentionInput` requiere estado controlado (`value` + `onChange`)
- El patrón es: componente controla estado → al submit extrae IDs → pasa a server action
- Mismo patrón usado en `CompleteTaskModal` (línea 8, 39, 59)
**Notes:** Ahora al crear tareas con @menciones, los usuarios mencionados verán la mención en "Mis Menciones". Siguiente: 1.5.6 (MentionInput en TaskDetailDialog)

### Session 9 - 2026-02-04
**Task:** 1.5.6 - Agregar MentionInput a TaskDetailDialog
**Files:** `components/task-detail-dialog.tsx`
**Changes:**
- Importado `MentionInput` y `extractMentionIds` de `@/components/mention-input`
- Reemplazado `<textarea>` de descripción con `<MentionInput>` (líneas 328-334 → componente MentionInput)
- En `handleSave()`, extraído `mentionIds` con `extractMentionIds(description)`
- Pasado `mentions: mentionIds.length > 0 ? mentionIds : undefined` a `updateTaskMetadata()`
- Placeholder actualizado a español: "Agrega más contexto a esta tarea... Usa @ para mencionar"
**Patterns:**
- El estado `description` ya existía en el componente (línea 39)
- Integración más simple que CreateTaskDialog porque no hay reset de formulario
- La lógica de diff de menciones (crear activities solo para nuevas) ya está en el servidor (Session 7)
**Notes:** ¡Fase 1.5 COMPLETADA! Menciones unificadas funcionan en creación, edición y completado de tareas. Siguiente: Fase 2 (Due Date Feature)

### Session 10 - 2026-02-04
**Task:** 2.1 - Agregar dueDate a createTaskSchema y createTask action
**Files:** `app/actions/tasks.ts`
**Changes:**
- Agregado `dueDate: z.coerce.date().optional()` al `createTaskSchema` (línea 29)
- Actualizado destructuring para extraer `dueDate` de `validationResult.data`
- Agregado `dueDate: dueDate || null` al insert de la tarea
**Patterns:**
- `z.coerce.date()` convierte automáticamente strings ISO a Date objects
- `.optional()` permite crear tareas sin fecha de entrega
- El campo ya existe en el schema de DB (Session 1) y fluye a KanbanTaskData (Session 4)
**Notes:** Tarea 2.1 completada. La action `createTask` ahora acepta dueDate. Siguiente: 2.2 (crear action updateTaskDueDate)

### Session 11 - 2026-02-04
**Task:** 2.2 - Crear action updateTaskDueDate
**Files:** `app/actions/tasks.ts`
**Changes:**
- Agregado `updateDueDateSchema` con `taskId: z.string().uuid()` y `dueDate: z.coerce.date().nullable()`
- Creada action `updateTaskDueDate` siguiendo patrón de `updateCompletedAt`
- Permiso estricto: solo `creatorId === userId` puede editar (no assignee)
- Logs activity con `fieldUpdated: 'dueDate'` y valores old/new en ISO format
**Patterns:**
- Para campos opcionales que pueden ser null, usar `.nullable()` en vez de `.optional()`
- `z.coerce.date().nullable()` permite pasar `null` explícitamente para limpiar el campo
- Usar `?.toISOString() || null` para serializar fechas en metadata de activity
- Diferencia clave con `updateCompletedAt`: Due Date solo creador, CompletedAt permite assignee O creator
**Notes:** Tarea 2.2 completada. Siguiente: 2.3 (date picker en CreateTaskDialog para dueDate)

### Session 12 - 2026-02-04
**Task:** 2.3 - Agregar date picker en CreateTaskDialog
**Files:** `components/create-task-dialog.tsx`
**Changes:**
- Agregado estado `dueDate` con `useState('')` (string para input type="date")
- Agregado input `type="date"` después del campo descripción
- Propiedad `min` usa `new Date().toISOString().split('T')[0]` para evitar fechas pasadas
- Pasado `dueDate: dueDate ? new Date(dueDate) : undefined` a `createTask()`
- Agregado `setDueDate('')` al reset del formulario
**Patterns:**
- Input type="date" usa formato string `YYYY-MM-DD`, se convierte a Date al enviar
- El atributo `min` en date inputs acepta formato ISO date (solo fecha, sin hora)
- Mismo estilo visual que otros inputs del formulario para consistencia
**Notes:** Tarea 2.3 completada. Siguiente: 2.4 (DueDateBadge en TaskCard)
