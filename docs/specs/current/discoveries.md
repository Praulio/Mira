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
