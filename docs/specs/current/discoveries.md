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

### Session 1 - 2026-01-22
**Task:** 0.1 - Instalar paquete googleapis
**Files:** package.json, package-lock.json
**Patterns:**
- Proyecto usa npm (no pnpm disponible en este entorno)
- googleapis v148.0.0 instalado con 57 paquetes adicionales
**Notes:**
- Import verificado: `const { google } = require('googleapis')` funciona correctamente
- 4 vulnerabilidades moderadas reportadas por npm audit (no críticas)

### Session 2 - 2026-01-22
**Task:** 0.2 - Agregar variables de entorno de ejemplo
**Files:** .env.example
**Patterns:**
- Variables de entorno documentadas con comentarios explicativos
- GOOGLE_SERVICE_ACCOUNT_KEY acepta JSON string (puede ser base64 o escaped)
- CRON_SECRET generado con openssl rand -hex 32
**Notes:**
- Lint tiene 12 warnings preexistentes pero 0 errores
- Build exitoso con Next.js 16.1.2 (Turbopack)
- Fase 0 completada, lista para Fase 1 (Schema y migraciones)

### Session 3 - 2026-01-22
**Task:** 1.1 - Agregar campos startedAt y parentTaskId a tabla tasks
**Files:** db/schema.ts
**Patterns:**
- Self-referencing FK requiere `AnyPgColumn` type import de drizzle-orm/pg-core
- Sintaxis: `uuid('parent_task_id').references((): AnyPgColumn => tasks.id, { onDelete: 'set null' })`
- Índice agregado para parentTaskId para queries de tareas derivadas
**Notes:**
- Campo startedAt: timestamp nullable, se llena cuando tarea pasa a In Progress
- Campo parentTaskId: uuid nullable, referencia a tarea padre para tareas derivadas
- onDelete: 'set null' mantiene la tarea hija si la padre se elimina
- Build y lint pasan sin errores

### Session 4 - 2026-01-22
**Task:** 1.2 - Crear tabla attachments
**Files:** db/schema.ts
**Patterns:**
- Seguir pattern de tabla activity para estructura y índices
- taskId con onDelete: 'cascade' para eliminar adjuntos cuando se elimina tarea
- uploadedBy con onDelete: 'cascade' para integridad con users
- Índices en taskId (búsqueda de adjuntos por tarea) y uploadedBy (auditoría)
**Notes:**
- Campos: id (uuid PK), taskId (FK cascade), driveFileId (text), name (text), mimeType (text), sizeBytes (int), uploadedBy (FK cascade), uploadedAt (timestamp)
- driveFileId almacena el ID del archivo en Google Drive para operaciones de descarga/eliminación
- sizeBytes como integer (máx ~2GB por archivo, suficiente para MVP)
- Build y lint pasan sin errores

### Session 5 - 2026-01-22
**Task:** 1.3 - Ejecutar migración
**Files:** db/migrations/0003_luxuriant_psynapse.sql (generated)
**Patterns:**
- `npm run db:generate` genera archivo SQL de migración automáticamente
- `drizzle-kit push --force` aplica cambios sin confirmación interactiva
- Migrations se numeran secuencialmente (0003 en este caso)
**Notes:**
- Migración aplicada a Neon DB exitosamente
- Cambios aplicados:
  - Tabla `attachments` creada con 8 columnas y 2 índices
  - Columna `started_at` agregada a `tasks`
  - Columna `parent_task_id` agregada a `tasks` con FK self-referencing
  - Índice `tasks_parent_task_idx` creado
- Fase 1 (Schema y Migraciones) completada
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 6 - 2026-01-22
**Task:** 2.1 - Modificar updateTaskStatus para capturar startedAt
**Files:** app/actions/tasks.ts
**Patterns:**
- Usar spread condicional `...(startedAtValue !== undefined && { startedAt: startedAtValue })` para solo actualizar campo cuando es necesario
- Usar `undefined` para distinguir "no cambiar" de "cambiar a null"
- Verificar currentTask.startedAt antes de capturar para evitar sobrescribir timestamp existente
**Notes:**
- startedAt se captura automáticamente al mover a in_progress (solo si no existe)
- startedAt se resetea a null al mover de vuelta a backlog o todo
- Si tarea ya tiene startedAt (re-entrada a in_progress), se mantiene el original
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 7 - 2026-01-22
**Task:** 2.2 - Bloquear drag desde Done en kanban-board
**Files:** components/kanban-board.tsx
**Patterns:**
- Validación de bloqueo se hace al inicio de handleDragEnd, después de encontrar la tarea
- Early return con toast.error() sigue el patrón existente de manejo de errores
- No se requiere actualización optimista porque el drag se bloquea antes de cualquier cambio de estado
**Notes:**
- Validación agregada en línea 155-159: si task.status === 'done', mostrar toast y return
- Mensaje en español: "Las tareas completadas no se pueden mover"
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 8 - 2026-01-22
**Task:** 2.3 - Crear función updateCompletedAt
**Files:** app/actions/tasks.ts
**Patterns:**
- Usar z.coerce.date() para parsear strings ISO a Date en Zod schemas
- Validación de ownership con operador OR: `assigneeId === userId || creatorId === userId`
- Refine de Zod para validación de fecha futura: `.refine((date) => date <= new Date(), 'mensaje')`
- Metadata de activity incluye old/new values para auditoría
**Notes:**
- Schema updateCompletedAtSchema valida taskId (uuid) y completedAt (date <= now)
- Función valida: auth, ownership (assignee OR creator), status === 'done'
- Activity action 'updated' con metadata.field = 'completedAt' para distinguir de otros updates
- Mensajes de error en español siguiendo convención UI del proyecto
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 9 - 2026-01-22
**Task:** 2.4 - Crear función createDerivedTask
**Files:** app/actions/tasks.ts
**Patterns:**
- Tareas derivadas heredan description y assignee del padre automáticamente
- Título por defecto: `Seguimiento: ${parentTask.title}` si no se proporciona
- Validar que tarea padre esté en status 'done' antes de crear derivada
- Usar campo parentTaskId para enlazar tarea hija con tarea padre
- Activity metadata incluye `derivedFrom` y `parentTaskTitle` para trazabilidad
**Notes:**
- Schema createDerivedTaskSchema valida parentTaskId (uuid requerido) y title (string opcional)
- Función valida: auth, existencia de padre, status padre === 'done'
- Tarea derivada se crea en status 'backlog' por defecto
- Se registran dos activities: 'created' (con metadata de derivación) y 'assigned' (si hay assignee)
- Mensajes de error en español siguiendo convención UI del proyecto
- Build y lint pasan sin errores (12 warnings preexistentes)
- Fase 2 (Backend - Tracking de Tiempos) completada

### Session 10 - 2026-01-22
**Task:** 3.1 - Crear cliente Google Drive
**Files:** lib/google-drive.ts (nuevo)
**Patterns:**
- Singleton pattern para cliente Drive: variable `driveClient` se inicializa una vez y se reutiliza
- Import de tipos específicos: `import { google, drive_v3 } from 'googleapis'`
- Scope mínimo necesario: `https://www.googleapis.com/auth/drive.file` (solo archivos creados por la app)
- GoogleAuth con credentials inline desde env var (no archivo JSON externo)
**Notes:**
- Funciones implementadas:
  - `getGoogleDriveClient()` - Singleton que parsea GOOGLE_SERVICE_ACCOUNT_KEY y crea cliente
  - `createTaskFolder(taskId)` - Crea o retorna carpeta existente bajo MIRA_FOLDER_ID
  - `uploadFileToDrive(taskId, fileName, mimeType, fileBuffer)` - Sube archivo a carpeta de tarea
  - `downloadFileFromDrive(driveFileId)` - Descarga archivo como Buffer
  - `deleteFileFromDrive(driveFileId)` - Elimina archivo individual
  - `deleteTaskFolder(taskId)` - Elimina carpeta completa de tarea con contenido
- Constante `MIRA_FOLDER_ID` exportada para uso en otras partes de la app
- Validación de env vars con mensajes de error claros
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 11 - 2026-01-22
**Task:** 3.2 - Crear Server Actions para attachments
**Files:** app/actions/attachments.ts (nuevo)
**Patterns:**
- Usar innerJoin para obtener datos de tablas relacionadas en una sola query (attachments + tasks para validar status)
- Validar MIME types server-side con array de tipos permitidos y z.refine()
- Base64 encoding para transferir archivos entre cliente y servidor
- Cleanup on failure: si DB insert falla después de subir a Drive, intentar eliminar el archivo subido
**Notes:**
- Funciones implementadas:
  - `uploadAttachment(input, fileData)` - Valida auth, mime type, status != done; sube a Drive; guarda en DB
  - `deleteAttachment(input)` - Valida auth, status != done; elimina de Drive y DB
  - `getTaskAttachments(input)` - Lista adjuntos de una tarea ordenados por uploadedAt
- MIME types soportados: imágenes (jpeg, png, gif, webp, svg), videos (mp4, mov, avi, webm), documentos (pdf, doc/x, xls/x, ppt/x, txt, md)
- Bloqueo de operaciones en tareas con status 'done' según spec
- Mensajes de error en español siguiendo convención UI del proyecto
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 12 - 2026-01-22
**Task:** 3.3 - Crear API route para descarga
**Files:** app/api/attachments/[id]/download/route.ts (nuevo)
**Patterns:**
- Next.js 16+ con App Router usa `params: Promise<{ id: string }>` y requiere `await params` para acceder a los valores
- Buffer no es directamente asignable a NextResponse body en Next.js 16, usar `new Uint8Array(buffer)` para conversión
- Content-Disposition header con `encodeURIComponent(filename)` para nombres de archivo con caracteres especiales
- Validar UUID format con regex antes de query a DB para evitar errores innecesarios
**Notes:**
- API route GET handler en `/api/attachments/[id]/download`
- Valida autenticación con getAuth() antes de cualquier operación
- Busca attachment en DB por ID, luego descarga de Drive con downloadFileFromDrive()
- Headers: Content-Type (mimeType), Content-Length, Content-Disposition (attachment), Cache-Control (private)
- Error handling con mensajes en español para errores 404 y 500
- Build y lint pasan sin errores (12 warnings preexistentes)
- Fase 3 (Backend - Google Drive Integration) completada

### Session 13 - 2026-01-22
**Task:** 4.1 - Crear helper formatDuration
**Files:** lib/format-duration.ts (nuevo)
**Patterns:**
- Helper functions en archivos separados bajo lib/ siguiendo pattern de lib/utils.ts
- Funciones aceptan Date | string | null | undefined para flexibilidad con diferentes fuentes de datos
- Documentación JSDoc con ejemplos de output para claridad
**Notes:**
- Función `formatDuration(startedAt, completedAt)` implementada:
  - Si startedAt es null → retorna "-"
  - Si duración negativa → retorna "-"
  - Si > 24h → "Xd Yh" (ej: "1d 4h")
  - Si 1-24h → "Xh Ym" (ej: "2h 30m")
  - Si < 1h → "Xm" (ej: "45m")
  - Si < 1m → "< 1m"
- Función auxiliar `getDurationMs()` para cálculos que necesitan el valor numérico
- completedAt opcional: si es null/undefined, usa new Date() (tiempo actual) para duración en vivo
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 14 - 2026-01-22
**Task:** 4.2 - Mostrar duración en TaskCard
**Files:** components/task-card.tsx, app/actions/kanban.ts
**Patterns:**
- Usar `useEffect` con `setInterval` para timer en vivo en tareas in_progress
- Usar `useState` con dummy counter para forzar re-render: `const [, forceUpdate] = useState(0)`
- Cleanup de interval en return de useEffect para evitar memory leaks
- Condicional triple en JSX para 3 estados: done (verde), in_progress (amber pulse), default (status dot)
- Clase `animate-pulse` de Tailwind para efecto de pulsación en tiempo vivo
**Notes:**
- Tarea 4.2 requería datos de startedAt/completedAt que no estaban en KanbanTaskData
- Se adelantó parte de 4.4 (agregar campos al tipo y query) para habilitar la funcionalidad
- Timer actualiza cada 60 segundos (60000ms) para balance entre precisión y performance
- Icono Clock de lucide-react agregado para indicador visual de duración
- Colores: emerald-400 para completado, amber-400 para en progreso
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 15 - 2026-01-22
**Task:** 4.3 - Agregar info de tiempos en TaskDetailDialog
**Files:** components/task-detail-dialog.tsx
**Patterns:**
- Usar `useUser` hook de `@clerk/nextjs` para obtener ID de usuario actual en cliente
- Ownership check: `user?.id === task.assignee?.id || user?.id === task.creator.id`
- Input type="datetime-local" para edición de fecha/hora sin librerías externas
- Atributo `max` en datetime-local limita fecha a <= ahora (previene fechas futuras)
- Footer con `justify-between` para separar acciones izquierda/derecha
**Notes:**
- Sección Information actualizada con:
  - Iniciado (startedAt) solo lectura, visible cuando existe
  - Completado (completedAt) editable solo por owner con datetime-local input
  - Duración prominente en bg-emerald-500/10 con formatDuration()
  - Timer en vivo con bg-amber-500/10 y animate-pulse para in_progress
- Botón "Crear tarea derivada" con GitBranch icon solo visible en tareas done
- Estado `completedAtInput` usa formato ISO slice(0,16) para compatibilidad con datetime-local
- Funciones handler: handleUpdateCompletedAt, handleCreateDerivedTask
- Imports agregados: useUser, Clock, GitBranch, updateCompletedAt, createDerivedTask, formatDuration
- Build y lint pasan sin errores (12 warnings preexistentes)

### Session 16 - 2026-01-22
**Task:** 5.1 - Crear componente FileDropzone
**Files:** components/file-dropzone.tsx (nuevo)
**Patterns:**
- No usar useCallback con React Compiler activo si las dependencias inferidas no coinciden con las manuales
- Drag & drop handlers simples sin memoización funcionan correctamente con React Compiler
- Convertir File a base64 con `Buffer.from(arrayBuffer).toString('base64')` para enviar a Server Action
- Mostrar lista de archivos en progreso con estado independiente del dropzone
**Notes:**
- Componente con drag & drop y click para selección de archivos
- Props: taskId (requerido), onUploadComplete (callback opcional), disabled (bloquea dropzone)
- Estados: isDragging (visual feedback), uploading (bloquea interacción), uploadingFiles (lista de nombres)
- Cuando disabled=true, muestra mensaje "Adjuntos bloqueados en tareas completadas"
- Subida secuencial de archivos con toast de éxito/error individual por archivo
- Callback onUploadComplete se ejecuta si al menos un archivo se subió correctamente
- Build y lint pasan sin errores (12 warnings preexistentes)
