# Discoveries: Task Enhancements - Tracking de Tiempos y Adjuntos

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementación)

---

## Convenciones del Proyecto (heredadas)

- **Idioma UI**: Español (botones, labels, mensajes)
- **Idioma Código**: Inglés (variables, funciones)
- **Glassmorphism**: Usar `backdrop-blur-[40px]`, `bg-white/5`, `border-white/10`
- **Toasts**: Usar `sonner` con `toast.success()` y `toast.error()`
- **Server Actions**: Retornar `{ success: boolean, data?: T, error?: string }`
- **Drizzle**: Tipos inferidos `typeof tasks.$inferSelect`

---

## Sesiones

### Session 0 - 2026-01-22

**Setup inicial**
- Implementation plan generado: 23 tareas en 7 fases
- Feature incluye:
  - Tracking de tiempos (startedAt, completedAt, duración)
  - Bloqueo de tareas completadas
  - Tareas derivadas con parentTaskId
  - Adjuntos con Google Drive
  - Cron job de limpieza automática

**Dependencias a instalar:**
- `googleapis` para Google Drive API

**Variables de entorno requeridas:**
- `GOOGLE_SERVICE_ACCOUNT_KEY` - JSON de Service Account
- `GOOGLE_DRIVE_FOLDER_ID` - ID de carpeta raíz en Drive
- `CRON_SECRET` - Secret para validar cron jobs de Vercel

**Archivos nuevos a crear:**
- `lib/google-drive.ts`
- `lib/format-duration.ts`
- `app/actions/attachments.ts`
- `components/file-dropzone.tsx`
- `components/attachment-list.tsx`
- `app/api/attachments/[id]/download/route.ts`
- `app/api/cron/cleanup-attachments/route.ts`
- `vercel.json`

**Archivos a modificar:**
- `db/schema.ts` - agregar campos y tabla attachments
- `app/actions/tasks.ts` - startedAt capture, updateCompletedAt, createDerivedTask
- `app/actions/kanban.ts` - incluir startedAt y attachmentCount
- `components/kanban-board.tsx` - bloquear drag desde Done
- `components/task-card.tsx` - mostrar duración e icono clip
- `components/task-detail-dialog.tsx` - sección de tiempos y adjuntos
- `.env.example` - documentar nuevas variables

**Próximos pasos:**
- Ejecutar `./ralph-loop.sh`
- Monitorear con `tail -f ralph-log.txt`

### Session 1 - 2026-01-26

**Task:** 0.1 - Instalar paquete googleapis
**Files:** package.json, pnpm-lock.yaml
**Patterns:**
- pnpm add agrega a dependencies por defecto
- googleapis v170.1.0 instalado correctamente
**Notes:**
- Import funciona: `const { google } = require("googleapis")`
- Build y lint pasan sin errores nuevos

### Session 2 - 2026-01-26

**Task:** 0.2 - Agregar variables de entorno de ejemplo
**Files:** .env.example
**Patterns:**
- Variables de entorno server-side no llevan prefix NEXT_PUBLIC_
- Service Account keys pueden ser JSON string o base64 encoded
- CRON_SECRET se genera con `openssl rand -hex 32`
**Notes:**
- Variables agregadas: GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_FOLDER_ID, CRON_SECRET
- Incluye instrucciones de dónde obtener cada valor en comentarios
- La carpeta de Drive debe ser compartida con el Service Account email

### Session 3 - 2026-01-26

**Task:** 1.1 - Agregar campos startedAt y parentTaskId a tabla tasks
**Files:** db/schema.ts
**Patterns:**
- Self-referencing FK en Drizzle requiere `AnyPgColumn` type con callback: `(): AnyPgColumn => tasks.id`
- El import debe ser `type AnyPgColumn` (type-only import)
- Agregar índice en FKs que serán usadas en queries frecuentes (parentTaskId)
**Notes:**
- startedAt: timestamp nullable - se llena cuando tarea pasa a "in_progress"
- parentTaskId: uuid nullable - referencia a tarea padre si es derivada, onDelete: 'set null'
- Próximo paso: tarea 1.2 - Crear tabla attachments

### Session 4 - 2026-01-26

**Task:** 1.2 - Crear tabla attachments
**Files:** db/schema.ts
**Patterns:**
- Tabla attachments sigue patrón de tabla activity: uuid PK, FK a tasks, timestamps
- onDelete: 'cascade' en taskId para eliminar adjuntos automáticamente con la tarea
- Índice en taskId es crítico para queries "obtener adjuntos de tarea X"
- sizeBytes como integer soporta hasta ~2GB por archivo
**Notes:**
- Campos: id, taskId, driveFileId, name, mimeType, sizeBytes, uploadedBy, uploadedAt
- driveFileId almacena referencia al archivo en Google Drive (no el archivo)
- uploadedBy con cascade delete - si se elimina usuario, se eliminan sus uploads
- Próximo paso: tarea 1.3 - Ejecutar migración

### Session 5 - 2026-01-26

**Task:** 1.3 - Ejecutar migración
**Files:** db/migrations/0003_silly_stryfe.sql (generado)
**Patterns:**
- `pnpm db:generate` crea archivo SQL con cambios incrementales del schema
- `pnpm db:push` aplica cambios directamente a Neon DB (vs `db:migrate` que usa tabla de migraciones)
- "No changes detected" en push significa schema ya sincronizado
- Drizzle nombra migraciones con formato `XXXX_adjective_name.sql`
**Notes:**
- Migración incluye: tabla attachments, campos started_at y parent_task_id en tasks
- Índices creados: attachments_task_idx, attachments_uploaded_by_idx, tasks_parent_task_idx
- Foreign keys con cascade correcto: attachments->tasks (cascade), attachments->users (cascade), tasks->tasks (set null)
- Build y lint pasan sin errores nuevos (solo warnings pre-existentes)
- Próximo paso: tarea 2.1 - Modificar updateTaskStatus para capturar startedAt

### Session 6 - 2026-01-26

**Task:** 2.1 - Modificar updateTaskStatus para capturar startedAt
**Files:** app/actions/tasks.ts
**Patterns:**
- Usar `Partial<typeof tasks.$inferInsert>` para construir objetos de actualización dinámicos de forma type-safe
- Lógica condicional de timestamps debe ir dentro de la transacción para atomicidad
- El patrón de "captura solo si vacío" (`!currentTask.startedAt`) evita sobrescribir datos válidos
**Notes:**
- Captura `startedAt = new Date()` cuando `newStatus === 'in_progress'` y campo está vacío
- Resetea `startedAt = null` cuando se mueve a 'backlog' o 'todo' (el trabajo "reinicia")
- La función `completeTask` NO necesita modificación - si se completa sin pasar por in_progress, `startedAt` permanece null y la UI mostrará "-"
- Próximo paso: tarea 2.2 - Bloquear drag desde Done en kanban-board

### Session 7 - 2026-01-26

**Task:** 2.2 - Bloquear drag desde Done en kanban-board
**Files:** components/kanban-board.tsx
**Patterns:**
- Bloquear drag en `handleDragEnd` es más limpio que en `handleDragStart`
- En `handleDragEnd` ya tenemos acceso a `task.status` (el status original antes de cualquier cambio)
- El early return antes de la actualización optimista evita cualquier parpadeo de UI
- Incluir mensaje guía en el toast ("Crea una tarea derivada...") mejora UX
**Notes:**
- Check agregado después de verificar que la tarea existe y antes de cualquier actualización
- Mensaje: "Las tareas completadas no se pueden mover. Crea una tarea derivada si necesitas continuar el trabajo."
- El bloqueo es unidireccional: solo desde Done hacia otros status (el drop TO done ya estaba permitido y abre el CompleteTaskModal)
- Próximo paso: tarea 2.3 - Crear función updateCompletedAt

### Session 8 - 2026-01-26

**Task:** 2.3 - Crear función updateCompletedAt
**Files:** app/actions/tasks.ts
**Patterns:**
- `z.coerce.date()` convierte strings ISO-8601 a Date automáticamente (útil para inputs de formularios)
- Ownership validation se hace con OR: `assigneeId === userId || creatorId === userId`
- El refine de Zod permite validaciones custom con mensajes personalizados en español
- Registrar tanto oldValue como newValue en activity metadata para auditoría completa
**Notes:**
- Función solo edita completedAt de tareas ya en status 'done'
- Valida que fecha no sea en el futuro con `date <= new Date()`
- Mensajes de error en español para consistencia con UI
- La UI necesitará un DateTimePicker para usar esta función (Task 4.3)
- Próximo paso: tarea 2.4 - Crear función createDerivedTask

### Session 9 - 2026-01-26

**Task:** 2.4 - Crear función createDerivedTask
**Files:** app/actions/tasks.ts
**Patterns:**
- Las "tareas derivadas" usan `parentTaskId` para crear un thread sin "reabrir" la tarea completada
- Heredar campos del padre (description, assigneeId) ahorra tiempo al usuario
- El título por defecto "Continuación: {parentTitle}" indica claramente la relación
- metadata.derivedFrom permite rastrear el linaje de tareas en activity logs
**Notes:**
- La función recibe `{ parentTaskId, title? }` - título es opcional
- Nueva tarea comienza en 'backlog' (no hereda el status del padre)
- Si el padre tenía assignee, se registra activity de 'assigned' con metadata.inheritedFrom
- No se valida que el padre esté en 'done' - permite crear derivadas en cualquier momento
- Próximo paso: Fase 3 - Backend Google Drive Integration (3.1)

### Session 10 - 2026-01-26

**Task:** 3.1 - Crear cliente Google Drive
**Files:** lib/google-drive.ts (nuevo)
**Patterns:**
- Singleton pattern para el cliente de Drive evita recrear auth en cada request
- GoogleAuth con credentials directas (client_email, private_key) es más limpio que usar keyFile
- Soporte dual para JSON string y base64 encoded keys facilita uso en diferentes entornos
- Estructura de carpetas `Mira/tasks/{taskId}/` mantiene organización clara
**Notes:**
- Cliente exporta funciones: getGoogleDriveClient, getOrCreateTaskFolder, uploadFileToDrive, downloadFileFromDrive, deleteFileFromDrive, deleteTaskFolder, getFileMetadata
- MIRA_FOLDER_ID se exporta como constante para uso en otras partes
- findFolder y createFolder son funciones internas auxiliares
- El scope 'https://www.googleapis.com/auth/drive' permite acceso completo (lectura/escritura)
- Validación temprana de env vars con errores descriptivos
- Próximo paso: tarea 3.2 - Crear Server Actions para attachments

### Session 11 - 2026-01-26

**Task:** 3.2 - Crear Server Actions para attachments
**Files:** app/actions/attachments.ts (nuevo)
**Patterns:**
- Base64 encoding para enviar archivos via Server Actions evita complejidad de FormData multipart
- Lista de ALLOWED_MIME_TYPES validada server-side con Zod refine() - nunca confiar en cliente
- Cleanup pattern: si DB insert falla después de upload a Drive, intentar eliminar archivo huérfano
- innerJoin para obtener attachment con taskStatus en una sola query evita N+1
**Notes:**
- Funciones exportadas: uploadAttachment, deleteAttachment, getTaskAttachments, deleteAllTaskAttachments
- uploadAttachment bloquea si task.status === 'done' con mensaje "No se pueden agregar adjuntos a tareas completadas"
- deleteAttachment también bloquea para tareas completadas
- deleteAllTaskAttachments es función interna para cleanup - no requiere auth check ya que será llamada internamente
- Lint warning corregido: import `and` no usado fue removido
- Próximo paso: tarea 3.3 - Crear API route para descarga

### Session 12 - 2026-01-26

**Task:** 3.3 - Crear API route para descarga
**Files:** app/api/attachments/[id]/download/route.ts (nuevo)
**Patterns:**
- API Routes (route.ts) necesarias para control directo de HTTP headers como Content-Disposition
- `Buffer` de Node.js no es compatible con `NextResponse` body - convertir a `new Uint8Array(buffer)`
- Validación de UUID con regex antes de query a DB evita queries innecesarias
- E2E bypass de auth con header `x-e2e-test: true` para consistencia con lib/mock-auth.ts
**Notes:**
- GET handler streams archivo desde Google Drive con headers correctos
- Content-Disposition: attachment fuerza descarga (no inline preview)
- Sanitización de filename previene inyección de headers (reemplaza caracteres especiales con `_`)
- Cache-Control: private, max-age=3600 permite caching por 1 hora en browser
- Error 502 Bad Gateway para errores de Google Drive (upstream dependency)
- Próximo paso: Fase 4 - UI Tracking de Tiempos (4.1)

### Session 13 - 2026-01-26

**Task:** 4.1 - Crear helper formatDuration
**Files:** lib/format-duration.ts (nuevo)
**Patterns:**
- Type coercion flexible con `Date | string | null | undefined` para compatibilidad con datos de DB
- Función pura sin side effects - ideal para testing unitario
- Cascada de condiciones: días → horas → minutos → <1m para formato progresivo
- Helper auxiliar `isTaskInProgress` para evitar duplicar lógica en componentes
**Notes:**
- formatDuration(startedAt, completedAt) retorna strings como "2h 30m", "1d 4h", "45m", "<1m"
- Si no hay startedAt retorna "-" (tarea nunca pasó por In Progress)
- Si no hay completedAt calcula tiempo transcurrido hasta ahora (live timer)
- Diferencia negativa o cero retorna "-" (edge case de datos inconsistentes)
- Próximo paso: tarea 4.2 - Mostrar duración en TaskCard

### Session 14 - 2026-01-26

**Task:** 4.2 - Mostrar duración en TaskCard
**Files:** components/task-card.tsx
**Patterns:**
- La regla `react-hooks/set-state-in-effect` prohíbe llamar setState síncronamente en useEffect
- Patrón para live timers: usar contador (`liveCounter`) que el interval incrementa, forzando re-renders
- `useMemo` para valores estáticos que dependen de props evita recálculos innecesarios
- Type assertion para extender el tipo KanbanTaskData con campos opcionales (`startedAt`, `completedAt`)
**Notes:**
- TaskCard ahora muestra duración con icono Clock en tareas done (verde) e in_progress (amber pulsante)
- El timer se actualiza cada 60 segundos para tareas in_progress
- Si no hay startedAt o duración es "-", se muestra el status dot original
- Requiere que tarea 4.4 agregue startedAt/completedAt al tipo KanbanTaskData para funcionar completamente
- Próximo paso: tarea 4.3 - Agregar info de tiempos en TaskDetailDialog

### Session 15 - 2026-01-26

**Task:** 4.3 - Agregar info de tiempos en TaskDetailDialog
**Files:** components/task-detail-dialog.tsx
**Patterns:**
- Extensión de tipos con `&`: `ExtendedKanbanTaskData = KanbanTaskData & { startedAt?, completedAt? }` permite agregar campos opcionales sin modificar el tipo base
- Clerk `useUser()` hook para obtener userId en componentes cliente - la validación real ocurre server-side
- HTML5 `datetime-local` input con `max={new Date().toISOString().slice(0, 16)}` previene fechas futuras de forma nativa
- Ownership check: `user?.id === task.assignee?.id || user?.id === task.creator.id`
**Notes:**
- Sección "Information" ahora muestra: Creada, Última actualización, Iniciada (si startedAt), Completada (editable si owner + done)
- Nueva sección "Duración" con `formatDuration()` - texto grande verde (done) o amber (in_progress)
- Input datetime-local para completedAt solo visible para owners de tareas done
- Botón "Crear derivada" en footer para tareas done - usa `createDerivedTask` server action
- Labels traducidos a español: Creada, Última actualización, Iniciada, Completada, Duración, Cerrar, Guardar
- Requiere que tarea 4.4 agregue startedAt/completedAt al tipo KanbanTaskData para funcionar completamente
- Próximo paso: tarea 4.4 - Actualizar query getKanbanData para incluir startedAt

### Session 16 - 2026-01-26

**Task:** 4.4 - Actualizar query getKanbanData para incluir startedAt
**Files:** app/actions/kanban.ts
**Patterns:**
- Agregar campos al tipo `KanbanTaskData` permite que los componentes que lo consumen tengan tipado correcto
- El select de Drizzle acepta nuevos campos sin romper queries existentes
- Agregar tanto `startedAt` como `completedAt` al tipo centralizado elimina necesidad de extensiones de tipo (`& { startedAt?, completedAt? }`) en componentes
**Notes:**
- Type KanbanTaskData ahora incluye: `startedAt: Date | null`, `completedAt: Date | null`
- Query select actualizada con `startedAt: tasks.startedAt` y `completedAt: tasks.completedAt`
- Objeto retornado en el map incluye ambos campos
- Con esta tarea completada, TaskCard y TaskDetailDialog tienen acceso directo a los datos sin extensiones de tipo
- Fase 4 (UI Tracking de Tiempos) completada - próximo paso: Fase 5 (UI Adjuntos)

### Session 17 - 2026-01-26

**Task:** 5.1 - Crear componente FileDropzone
**Files:** components/file-dropzone.tsx (nuevo)
**Patterns:**
- Drag counter con `useRef` evita flickering por eventos bubbling en elementos nested
- `FileReader.readAsDataURL()` retorna `data:mime;base64,{content}` - split por coma para obtener solo el base64
- `accept` attribute en input file mejora UX pero NO es validación de seguridad (server-side validation es obligatoria)
- Reset de `e.target.value = ''` permite subir el mismo archivo múltiples veces
**Notes:**
- Props: `{ taskId, onUploadComplete?, disabled? }`
- Soporta múltiples archivos simultáneos con feedback de progreso
- Accesibilidad: `role="button"`, `tabIndex={0}`, keyboard handlers para Enter/Space
- Estados visuales: default (gris), dragover (primary/blue), uploading (spinner), disabled (opacity 50%)
- Toast success/error/warning según resultado de uploads
- Próximo paso: tarea 5.2 - Crear componente AttachmentList

### Session 18 - 2026-01-26

**Task:** 5.2 - Crear componente AttachmentList
**Files:** components/attachment-list.tsx (nuevo)
**Patterns:**
- Mapeo de MIME types a iconos: `image/*` → ImageIcon, `video/*` → Film, `application/pdf` → FileText, etc.
- Formateo de bytes con logaritmos: `Math.floor(Math.log(bytes) / Math.log(1024))` para obtener el índice de unidad
- Colores semánticos por tipo de archivo: azul=imágenes, rojo=PDF, verde=Excel, etc.
- Patrón `group-hover:opacity-100` para mostrar botones de acción solo en hover
**Notes:**
- Props: `{ attachments, onDelete?, readonly? }`
- Descarga abre nueva pestaña con `/api/attachments/[id]/download`
- Eliminación usa `window.confirm()` para confirmación simple (no custom modal)
- Estado `deletingId` previene múltiples clicks en el mismo botón
- Si readonly=true, el botón de eliminar no se renderiza
- Próximo paso: tarea 5.3 - Agregar icono clip en TaskCard

### Session 19 - 2026-01-26

**Task:** 5.3 - Agregar icono clip en TaskCard
**Files:** app/actions/kanban.ts, components/task-card.tsx
**Patterns:**
- Subquery de COUNT en Drizzle: `sql<number>\`(SELECT COUNT(*) FROM table WHERE condition)\`.as('alias')`
- PostgreSQL puede retornar BigInt para COUNT, usar `Number(value) || 0` para asegurar tipo number
- El índice en `attachments.taskId` hace la subquery eficiente (no N+1 queries)
- Lucide tiene icono `Paperclip` ideal para indicador de adjuntos
**Notes:**
- Campo `attachmentCount: number` agregado a tipo KanbanTaskData
- Import `sql` de drizzle-orm para subqueries con template literals type-safe
- Icono clip + contador mostrado solo si attachmentCount > 0
- Se limpió type assertion redundante de startedAt/completedAt (ya estaban en el tipo desde tarea 4.4)
- Footer reorganizado: [Assignee] ... [Clip+Count | Duration/Status]
- Próximo paso: tarea 5.4 - Integrar adjuntos en TaskDetailDialog

### Session 20 - 2026-01-26

**Task:** 5.4 - Integrar adjuntos en TaskDetailDialog
**Files:** components/task-detail-dialog.tsx
**Patterns:**
- Para cargar datos async en useEffect sin violar `set-state-in-effect`, definir función async inline dentro del effect
- Usar flag `cancelled` en cleanup function para evitar state updates en componentes desmontados
- `useCallback` sigue siendo útil para callbacks pasados a componentes hijos (onUploadComplete, onDelete)
- Patrón de badge en labels: `<span className="ml-1 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>`
**Notes:**
- Sección "Adjuntos" agregada después de "Description" con icono Paperclip
- FileDropzone oculto completamente para tareas done (no solo disabled)
- AttachmentList recibe `readonly={isDone}` para ocultar botones de delete
- loadAttachments callback usado para refresh después de upload/delete
- El estado isLoadingAttachments muestra "Cargando adjuntos..." mientras carga inicial
- Badge con contador de adjuntos en el label de la sección
- Próximo paso: tarea 5.5 - Actualizar query para incluir attachmentCount
