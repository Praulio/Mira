# Implementation Plan: Task Enhancements - Tracking de Tiempos y Adjuntos

Generado desde: `plans/feat-task-enhancements-tracking-attachments.md`
Fecha: 2026-01-22

---

## Fase 0: Preparación y Dependencias

- [x] **0.1** Instalar paquete googleapis
  - Input: package.json actual
  - Output: googleapis instalado
  - Comando: `pnpm add googleapis`
  - Verificación: import funciona sin error

- [x] **0.2** Agregar variables de entorno de ejemplo
  - Input: .env.example actual
  - Output: Variables GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_FOLDER_ID, CRON_SECRET agregadas
  - Referencia: ver .env.example líneas 1-18

Validación Fase 0:
• Build pasa (`pnpm build`)
• Variables documentadas en .env.example

---

## Fase 1: Schema y Migraciones

- [x] **1.1** Agregar campos startedAt y parentTaskId a tabla tasks
  - Input: db/schema.ts línea 53 (después de completionMentions)
  - Output: Campos startedAt (timestamp nullable) y parentTaskId (uuid self-reference) agregados
  - Comportamiento: parentTaskId referencia tasks.id con onDelete: 'set null'
  - Referencia: ver db/schema.ts:42-60 para pattern existente

- [x] **1.2** Crear tabla attachments
  - Input: db/schema.ts (después de tabla activity, línea 76)
  - Output: Tabla con id, taskId, driveFileId, name, mimeType, sizeBytes, uploadedBy, uploadedAt
  - Comportamiento: taskId FK a tasks con cascade delete, índice en taskId
  - Referencia: ver db/schema.ts:65-76 para pattern de tabla activity

- [x] **1.3** Ejecutar migración
  - Input: Schema actualizado
  - Output: Tablas actualizadas en Neon DB
  - Comando: `pnpm db:generate && pnpm db:push`
  - Verificación: Campos visibles en Drizzle Studio

Validación Fase 1:
• Build pasa
• `pnpm db:studio` muestra campos started_at, parent_task_id en tasks
• Tabla attachments existe

---

## Fase 2: Backend - Tracking de Tiempos

- [x] **2.1** Modificar updateTaskStatus para capturar startedAt
  - Input: app/actions/tasks.ts función updateTaskStatus (buscar .set({ status:)
  - Output: Captura startedAt=now() si newStatus='in_progress' y !currentTask.startedAt
  - Comportamiento: Si vuelve a backlog/todo, resetear startedAt=null
  - Referencia: ver app/actions/tasks.ts líneas 180-286

- [x] **2.2** Bloquear drag desde Done en kanban-board
  - Input: components/kanban-board.tsx función handleDragEnd
  - Output: Si task.status === 'done', mostrar toast.error y return early
  - Comportamiento: Mensaje "Las tareas completadas no se pueden mover"
  - Referencia: ver components/kanban-board.tsx:127-214

- [x] **2.3** Crear función updateCompletedAt
  - Input: app/actions/tasks.ts (nueva función)
  - Output: Función que valida ownership y actualiza completedAt
  - Props: { taskId: string, completedAt: Date }
  - Comportamiento: Solo assignee o creator pueden editar, validar fecha <= now()
  - Referencia: ver pattern de completeTask en mismo archivo

- [x] **2.4** Crear función createDerivedTask
  - Input: app/actions/tasks.ts (nueva función)
  - Output: Función que crea tarea con parentTaskId
  - Props: { parentTaskId: string, title?: string }
  - Comportamiento: Hereda description, assignee del padre. Registra activity con metadata.derivedFrom
  - Referencia: ver createTask para pattern de inserción

Validación Fase 2:
• Build pasa
• Mover tarea a In Progress registra startedAt en DB
• Drag desde Done muestra toast de error
• API de updateCompletedAt valida ownership

---

## Fase 3: Backend - Google Drive Integration

- [x] **3.1** Crear cliente Google Drive
  - Input: Nuevo archivo lib/google-drive.ts
  - Output: Función getGoogleDriveClient() y constante MIRA_FOLDER_ID
  - Comportamiento: Usa googleapis con Service Account credentials de env
  - Referencia: ver lib/mock-auth.ts para pattern de singleton

- [x] **3.2** Crear Server Actions para attachments
  - Input: Nuevo archivo app/actions/attachments.ts
  - Output: Funciones uploadAttachment, deleteAttachment, getTaskAttachments
  - Comportamiento: uploadAttachment crea carpeta por taskId, valida mime types, bloquea si status=done
  - Referencia: ver app/actions/tasks.ts para patterns de Server Actions

- [x] **3.3** Crear API route para descarga
  - Input: Nuevo archivo app/api/attachments/[id]/download/route.ts
  - Output: GET handler que streams archivo desde Drive
  - Comportamiento: Valida auth, busca attachment en DB, descarga de Drive, retorna con headers
  - Referencia: ver app/api/webhooks/clerk/route.ts para pattern de API route

Validación Fase 3:
• Build pasa
• uploadAttachment sube archivo a Drive (test manual con curl o script)
• deleteAttachment elimina de Drive y DB

---

## Fase 4: UI - Tracking de Tiempos

- [x] **4.1** Crear helper formatDuration
  - Input: Nuevo archivo lib/format-duration.ts
  - Output: Función formatDuration(startedAt, completedAt) → "2h 30m" o "1d 4h"
  - Comportamiento: Si no hay startedAt retorna '-', si >24h muestra días
  - Referencia: ver lib/utils.ts para pattern de helpers

- [x] **4.2** Mostrar duración en TaskCard
  - Input: components/task-card.tsx footer (líneas 140-165)
  - Output: Span con duración verde si done, amber pulsante si in_progress
  - Comportamiento: Reemplaza status dot por duración formateada cuando aplica
  - Referencia: ver components/task-card.tsx:140-165

- [x] **4.3** Agregar info de tiempos en TaskDetailDialog
  - Input: components/task-detail-dialog.tsx sección Information (líneas 166-181)
  - Output: Mostrar startedAt, completedAt (editable si owner), duración calculada
  - Comportamiento: DateTimePicker para completedAt solo si isOwner, botón crear derivada si done
  - Referencia: ver components/task-detail-dialog.tsx:166-196

- [x] **4.4** Actualizar query getKanbanData para incluir startedAt
  - Input: app/actions/kanban.ts función getKanbanData
  - Output: Incluir startedAt en select de tasks
  - Referencia: ver app/actions/kanban.ts

Validación Fase 4:
• Build pasa
• Cards en Done muestran "Xh Xm"
• Cards en In Progress muestran tiempo con pulso
• Modal muestra fechas y permite editar completedAt al owner

---

## Fase 5: UI - Adjuntos

- [x] **5.1** Crear componente FileDropzone
  - Input: Nuevo archivo components/file-dropzone.tsx
  - Output: Componente con drag&drop y file input
  - Props: { taskId, onUploadComplete, disabled? }
  - Comportamiento: Arrastra/click → llama uploadAttachment → toast resultado → callback
  - Referencia: ver components/link-input.tsx para pattern de input con lista

- [ ] **5.2** Crear componente AttachmentList
  - Input: Nuevo archivo components/attachment-list.tsx
  - Output: Lista de adjuntos con iconos, tamaño, download, delete
  - Props: { attachments, onDelete, readonly? }
  - Comportamiento: Icono según mimeType, botón download link a API, delete con confirmación
  - Referencia: ver components/link-input.tsx para pattern de lista con delete

- [ ] **5.3** Agregar icono clip en TaskCard
  - Input: components/task-card.tsx footer
  - Output: Icono Paperclip + count si task tiene adjuntos
  - Comportamiento: Mostrar solo si attachmentCount > 0
  - Nota: Requiere agregar attachmentCount al type KanbanTaskData

- [ ] **5.4** Integrar adjuntos en TaskDetailDialog
  - Input: components/task-detail-dialog.tsx (después de descripción)
  - Output: Sección "Adjuntos" con FileDropzone + AttachmentList
  - Comportamiento: Dropzone disabled si status=done, lista readonly si done
  - Referencia: ver estructura de secciones existentes en el dialog

- [ ] **5.5** Actualizar query para incluir attachmentCount
  - Input: app/actions/kanban.ts
  - Output: Agregar subquery count de attachments por task
  - Referencia: ver pattern de select existente

Validación Fase 5:
• Build pasa
• Modal permite subir archivos con drag&drop
• Lista muestra adjuntos con opción de descargar/eliminar
• Cards muestran icono clip con contador

---

## Fase 6: Cron Job Cleanup

- [ ] **6.1** Crear configuración vercel.json
  - Input: vercel.json (crear o actualizar)
  - Output: Cron job configurado para /api/cron/cleanup-attachments a las 3am UTC
  - Referencia: Vercel docs cron syntax

- [ ] **6.2** Crear API route del cron
  - Input: Nuevo archivo app/api/cron/cleanup-attachments/route.ts
  - Output: GET handler que elimina adjuntos de tareas done +3 días
  - Comportamiento: Valida CRON_SECRET, busca tareas, elimina de Drive y DB, elimina carpetas
  - Referencia: ver app/api/webhooks/clerk/route.ts para pattern de validación de secret

Validación Fase 6:
• Build pasa
• Endpoint responde con stats cuando se llama con CRON_SECRET correcto
• Endpoint retorna 401 sin secret

---

## Fase 7: QA/Testing - Pruebas de Integración con Playwright

- [ ] **7.1** Crear tests E2E para tracking de tiempos
  - Input: Nuevo archivo tests/e2e/task-time-tracking.spec.ts
  - Output: Tests que verifican flujo completo de tracking
  - Comportamiento: Crear tarea → drag a In Progress → verificar startedAt → completar → verificar duración
  - Referencia: ver tests/e2e/ para patterns existentes de Playwright

- [ ] **7.2** Crear tests E2E para bloqueo de tareas Done
  - Input: Nuevo archivo tests/e2e/task-done-blocking.spec.ts
  - Output: Tests que verifican que tareas Done no se pueden mover
  - Comportamiento: Completar tarea → intentar drag → verificar toast error → verificar posición no cambió

- [ ] **7.3** Crear tests E2E para adjuntos
  - Input: Nuevo archivo tests/e2e/task-attachments.spec.ts
  - Output: Tests que verifican upload, download y delete de adjuntos
  - Comportamiento: Subir archivo → verificar en lista → descargar → eliminar → verificar eliminado
  - Nota: Requiere mock de Google Drive API o test account

- [ ] **7.4** Crear tests E2E para edición de completedAt
  - Input: Nuevo archivo tests/e2e/task-completed-at-edit.spec.ts
  - Output: Tests que verifican permisos de edición
  - Comportamiento: Owner puede editar → no-owner no puede → fecha se guarda correctamente

Validación Fase 7:
• Todos los tests E2E pasan (`pnpm test:e2e`)
• Coverage de flujos críticos: tracking, bloqueo, adjuntos, permisos
• Sin flaky tests

---

## Fase 8: Peer Review - Auditoría de Seguridad

- [ ] **8.1** Auditar integración Google Drive
  - Input: lib/google-drive.ts, app/actions/attachments.ts
  - Output: Reporte de seguridad documentado en discoveries.md
  - Verificar: Credentials no expuestas, validación de inputs, manejo de errores seguros
  - Checklist: No secrets en logs, sanitización de nombres de archivo, límites de request

- [ ] **8.2** Auditar API routes y Server Actions
  - Input: app/api/attachments/*, app/api/cron/*, app/actions/attachments.ts
  - Output: Confirmación de validación de auth en todos los endpoints
  - Verificar: Auth requerida, ownership validado, CRON_SECRET verificado, no IDOR vulnerabilities

- [ ] **8.3** Auditar manejo de archivos
  - Input: Componentes de upload y download
  - Output: Confirmación de validación de mime types y tamaños
  - Verificar: Mime types validados server-side, no path traversal, Content-Disposition headers seguros

- [ ] **8.4** Review final de código
  - Input: Todos los archivos modificados/creados en este feature
  - Output: PR aprobado o lista de cambios requeridos
  - Comportamiento: Usar agente security-sentinel para scan automatizado + review manual
  - Referencia: compound-engineering:review:security-sentinel

Validación Fase 8:
• Sin vulnerabilidades críticas o altas identificadas
• Todos los endpoints protegidos con auth
• Credentials manejadas correctamente (env vars, no hardcoded)
• PR listo para merge

---

## Summary

| Fase | Tareas | Descripción |
|------|--------|-------------|
| 0 | 2 | Preparación y dependencias |
| 1 | 3 | Schema y migraciones |
| 2 | 4 | Backend tracking de tiempos |
| 3 | 3 | Backend Google Drive |
| 4 | 4 | UI tracking de tiempos |
| 5 | 5 | UI adjuntos |
| 6 | 2 | Cron job cleanup |
| 7 | 4 | QA/Testing - Playwright E2E |
| 8 | 4 | Peer Review - Auditoría de seguridad |
| **Total** | **31** | |
