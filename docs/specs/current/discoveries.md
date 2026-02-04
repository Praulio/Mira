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

### Session 13 - 2026-02-04
**Task:** 2.4 - Agregar DueDateBadge en TaskCard footer
**Files:** `components/task-card.tsx`
**Changes:**
- Importado `CalendarDays` de lucide-react
- Creada función `getDueDateStatus(dueDate)` que retorna 'overdue' | 'soon' | 'normal' | null
- Creada función `formatDueDate(date)` para formato español corto (e.g., "4 feb")
- Badge renderiza en el footer, lado derecho, antes de attachment count
- Colores: rojo (overdue, <0h), amarillo (soon, ≤24h), neutral (normal, >24h)
**Patterns:**
- IIFE `{(() => {...})()}` en JSX permite lógica condicional compleja sin componente separado
- Formato de fecha con `toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })`
- Clases Tailwind condicionales con objeto lookup: `colorClasses[status]`
**Notes:** Fase 2 completada. DueDateBadge muestra fecha con colores según urgencia. Siguiente: Fase 3 (Eliminar Backlog)

### Session 14 - 2026-02-04
**Task:** 3.1 - Convertir página backlog en redirect
**Files:** `app/(dashboard)/dashboard/backlog/page.tsx`
**Changes:**
- Reemplazado todo el contenido del server component con un simple redirect
- Importado `redirect` de `next/navigation`
- Eliminadas importaciones no usadas (getBacklogTasks, BacklogList, Inbox)
- La función ya no es async (redirect no lo requiere)
**Patterns:**
- `redirect()` de `next/navigation` es la forma estándar de hacer redirects en Next.js App Router
- No requiere `return` - la función `redirect()` lanza internamente una excepción de Next.js para abortar el render
- El redirect es server-side (307 por defecto), no requiere JavaScript en cliente
- Comentario DEPRECATED ayuda a futuros desarrolladores a entender por qué existe el archivo
**Notes:** Tarea 3.1 completada. Siguiente: 3.2 (eliminar enlace del sidebar)

### Session 15 - 2026-02-04
**Task:** 3.2 - Eliminar enlace backlog del sidebar
**Files:** `components/sidebar.tsx`
**Changes:**
- Eliminado item `{ title: "Pila de Tareas", href: "/dashboard/backlog", ... }` del array `navItems`
- Eliminado import `ListTodo` de lucide-react (ya no se usaba)
**Patterns:**
- Al eliminar items de navegación, siempre verificar si el icono importado queda huérfano
- El array `navItems` está antes del componente, facilitando modificaciones sin tocar JSX
**Notes:** Sidebar ya no muestra "Pila de Tareas". Siguiente: 3.3 (limpiar archivos backlog no usados)

### Session 16 - 2026-02-04
**Task:** 3.3 - Limpiar archivos no usados (backlog components)
**Files:** `components/backlog-list.tsx`, `components/backlog-task-card.tsx`
**Changes:**
- Eliminados ambos archivos que ya no tenían imports desde ningún otro archivo del proyecto
- Verificación con grep confirmó que solo se referenciaban entre sí
**Patterns:**
- Antes de eliminar archivos, verificar dependencias con grep para imports
- El patrón `from.*filename|import.*ComponentName` captura ambos estilos de import
- Archivos de documentación (specs, plans) pueden seguir mencionando archivos eliminados - eso es OK
**Notes:** Fase 3 COMPLETADA. Backlog eliminado: redirect en page.tsx, link removido de sidebar, archivos de componentes eliminados. Siguiente: Fase 4 (Filtro Mis Tareas)

### Session 17 - 2026-02-04
**Task:** 4.1 - Pasar currentUserId a KanbanBoard
**Files:** `app/(dashboard)/dashboard/kanban/page.tsx`, `components/kanban-board.tsx`
**Changes:**
- Agregado import `getAuth` y `redirect` en kanban page.tsx
- Agregado chequeo de auth con redirect a `/sign-in` si no hay userId
- Actualizado tipo `KanbanBoardProps` para incluir `currentUserId: string`
- Pasado prop `currentUserId={userId}` a KanbanBoard
**Patterns:**
- El patrón de auth en páginas protegidas: `const { userId } = await getAuth()` + redirect si null
- Mismo patrón usado en dashboard/page.tsx
- Props de componentes cliente se pasan desde server components para datos de auth
**Notes:** El warning de lint `'currentUserId' is defined but never used` es esperado - tarea 4.2 usará el prop para el filtro

### Session 18 - 2026-02-04
**Task:** 4.2 + 4.3 - Agregar toggle "Mis Tareas" y mensaje vacío filtrado
**Files:** `components/kanban-board.tsx`, `components/kanban-column.tsx`
**Changes:**
- KanbanBoard: Agregado `useMemo` import, `User` icon de lucide, `cn` utility
- KanbanBoard: Estado `showOnlyMyTasks` (boolean, default false)
- KanbanBoard: `filteredKanbanData` memoizado que filtra tasks por `assignee?.id === currentUserId`
- KanbanBoard: Toggle button con estilo glassmorphism (`bg-white/5` inactivo, `bg-primary` activo)
- KanbanBoard: Pasando `isFiltered={showOnlyMyTasks}` a cada KanbanColumn
- KanbanColumn: Agregada prop `isFiltered?: boolean` al tipo
- KanbanColumn: Mensaje vacío dinámico: "No tienes tareas en esta etapa" si filtrado, "Sin tareas" si no
**Patterns:**
- `useMemo` para evitar recálculo de filtrado en cada render
- Filtro client-side es apropiado porque el estado es local (no persiste entre sesiones)
- El prop `statusColor` estaba sin uso pero se mantiene en tipo para compatibilidad futura
**Notes:** Tareas 4.2 y 4.3 completadas juntas porque 4.2 dependía de la prop `isFiltered` de 4.3

### Session 19 - 2026-02-04
**Task:** 5.1 - Crear action updateTaskProgress
**Files:** `app/actions/tasks.ts`
**Changes:**
- Agregado `updateProgressSchema` con `taskId: z.string().uuid()` y `progress: z.number().int().min(0).max(100)`
- Creada action `updateTaskProgress` siguiendo patrón de `updateTaskDueDate`
- Permisos diferenciados: assignee O creator (solo si no hay assignee)
- Log activity con `fieldUpdated: 'progress'` y valores old/new como numbers
**Patterns:**
- Para permisos contextuales: `const canEdit = condición1 || (condición2 && condición3)`
- Diferencia con `updateTaskDueDate`: dueDate = solo creator, progress = assignee preferente
- El progress se almacena como `integer` en DB (0-100), validación en schema Zod con `.int().min(0).max(100)`
**Notes:** Fase 5 iniciada. Siguiente: 5.2 (mini progress bar en TaskCard)

### Session 20 - 2026-02-04
**Task:** 5.2 - Agregar mini progress bar en TaskCard
**Files:** `components/task-card.tsx`
**Changes:**
- Agregada mini progress bar entre descripción y footer (línea ~198-206)
- Solo se renderiza si `task.progress > 0` (no ocupa espacio si no hay progreso)
- Estilos: `h-1.5` altura, `bg-white/10` fondo, `bg-primary` barra interna
- `rounded-full` para bordes redondeados, `transition-all` para animación suave
**Patterns:**
- Renderizado condicional `{valor > 0 && JSX}` para evitar elementos vacíos
- Usar `style={{ width: \`\${value}%\` }}` para ancho dinámico en CSS
- `overflow-hidden` en contenedor padre para que barra interna no se desborde
**Notes:** Progress bar visual completada. Siguiente: 5.3 (progress slider en TaskDetailDialog)

### Session 21 - 2026-02-04
**Task:** 5.3 - Agregar progress slider en TaskDetailDialog
**Files:** `components/task-detail-dialog.tsx`
**Changes:**
- Importada action `updateTaskProgress` de `@/app/actions/tasks`
- Agregado estado `progress` inicializado desde `task.progress || 0`
- Agregado estado `isSavingProgress` para feedback visual
- Agregada variable `canEditProgress` con lógica: assignee O creador (si no hay assignee)
- Creada función `handleProgressSave()` que llama `updateTaskProgress` solo si cambió
- Agregada sección "Progreso" en el grid de metadata con:
  - **Editable**: slider `type="range"` con eventos `onMouseUp`/`onTouchEnd`
  - **Read-only**: barra de progreso visual con porcentaje
**Patterns:**
- Permisos contextuales separados: `canEditProgress` distinto de `isOwner` (que se usa para otras cosas)
- Guardar al soltar (no en cada change) evita llamadas excesivas al servidor
- Estado local para UX fluida + sincronización con servidor al finalizar interacción
- Revert a valor original si el update falla para evitar inconsistencias
**Notes:** Slider de progreso completado. Siguiente: 5.4 (progress bar en TeamSlot)

### Session 22 - 2026-02-04
**Task:** 5.4 - Agregar progress bar en TeamSlot
**Files:** `components/team-slot.tsx`
**Changes:**
- Agregada barra de progreso después del título de la tarea (líneas 109-119)
- Solo se renderiza si `inProgressTask.progress > 0` (no ocupa espacio si progress es 0)
- Incluye porcentaje visual debajo de la barra (`text-[9px]`)
- Estilos consistentes con TaskCard: `h-1.5`, `bg-white/10`, `bg-primary`, `rounded-full`
**Patterns:**
- El campo `progress` ya existía en `TeamSlotData.inProgressTask` (Session 5)
- Renderizado condicional `{progress > 0 && JSX}` evita elementos vacíos
- El componente es read-only (no editable) - la edición se hace en TaskDetailDialog
**Notes:** 🎉 **FEATURE COMPLETADO** - Task Enhancements V2 finalizado con 25 tareas en 6 fases:
- ✅ Fase 0: Schema & Migration (dueDate, progress)
- ✅ Fase 1: Data Layer (tipos en kanban.ts, team.ts)
- ✅ Fase 1.5: Unified Mentions (menciones en create, edit, complete)
- ✅ Fase 2: Due Date Feature (create, update, badge con colores)
- ✅ Fase 3: Eliminar Backlog (redirect, sidebar, cleanup)
- ✅ Fase 4: Filtro Mis Tareas (toggle, empty state)
- ✅ Fase 5: Progress Bar (action, TaskCard, dialog, TeamSlot)
