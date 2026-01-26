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
