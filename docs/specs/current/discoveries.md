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
