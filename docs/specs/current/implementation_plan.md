# Implementation Plan: Sistema de Notificaciones

Generado desde: `plans/feat-notification-system.md`
Fecha: 2026-01-28

---

## Fase 0: Dependencias, Setup y Validación Playwright

- [x] **0.1** Instalar dependencias: nodemailer, @types/nodemailer, @radix-ui/react-popover
  - Input: package.json actual
  - Output: Paquetes instalados en node_modules
  - Comando: `pnpm add nodemailer @radix-ui/react-popover && pnpm add -D @types/nodemailer`

- [x] **0.2** Agregar variables de entorno a .env.example
  - Input: .env.example actual
  - Output: Variables GMAIL_USER, GMAIL_APP_PASSWORD, NEXT_PUBLIC_APP_URL agregadas
  - Referencia: ver .env.example para formato existente

- [x] **0.3** Validar que Playwright funciona correctamente
  - Input: playwright.config.ts existente, e2e/ directorio con specs existentes
  - Output: Ejecutar `pnpm exec playwright install --with-deps chromium` para asegurar browser instalado. Luego ejecutar `pnpm test:e2e --headed e2e/critical-flow.spec.ts` y verificar que el navegador se abre, la página carga y los tests corren (pass o fail es irrelevante, lo importante es que Playwright EJECUTA los tests y abre el browser).
  - Comportamiento: Si Playwright no puede abrir el browser o falla con error de configuración → RALPH_BLOCKED. Documentar el resultado exacto (stdout/stderr) en discoveries.md. NO marcar como completada si no se ve output real de ejecución de tests.
  - Referencia: ver playwright.config.ts, e2e/critical-flow.spec.ts

Validación Fase 0:
• Build pasa (`pnpm build`)
• Variables documentadas en .env.example
• Playwright ejecuta tests y abre browser (output de test runner visible en discoveries)

---

## Fase 1: Schema y Migración

- [x] **1.1** Agregar tabla notifications y enum notificationTypeEnum a schema
  - Input: db/schema.ts línea 97 (después de tabla attachments)
  - Output: Enum `notification_type` ('assigned', 'mentioned') y tabla `notifications` con columns: id (uuid PK), recipientId (text FK users CASCADE), actorId (text FK users CASCADE), taskId (uuid FK tasks CASCADE), type (enum), isRead (boolean default false), createdAt (timestamp)
  - Comportamiento: Índices en recipientId, (recipientId + isRead) compuesto, createdAt
  - Referencia: ver db/schema.ts:68-79 pattern de tabla activity

- [x] **1.2** Agregar columna descriptionMentions a tabla tasks
  - Input: db/schema.ts línea 53 (después de completionMentions)
  - Output: Campo `descriptionMentions: jsonb('description_mentions').$type<string[]>()`
  - Referencia: ver db/schema.ts:53 pattern de completionMentions

- [x] **1.3** Ejecutar migración
  - Input: Schema actualizado
  - Output: Tablas/columnas creadas en Neon DB
  - Comando: `pnpm db:generate && pnpm db:push`

Validación Fase 1:
• Build pasa
• Tabla notifications existe en DB
• Campo description_mentions existe en tasks

---

## Fase 2: Server Actions de Notificaciones

- [x] **2.1** Crear server actions de notificaciones
  - Input: Nuevo archivo app/actions/notifications.ts
  - Output: Funciones getUnreadCount(), getNotifications(limit=50), markNotificationRead(id)
  - Comportamiento: getUnreadCount retorna count de isRead=false para currentUser. getNotifications hace join con users para obtener actorName/actorImage. markNotificationRead valida recipientId === currentUser antes de actualizar.
  - Referencia: ver app/actions/tasks.ts para pattern ActionResponse, Zod, getAuth

- [x] **2.2** Crear API route GET /api/notifications/unread-count
  - Input: Nuevo archivo app/api/notifications/unread-count/route.ts
  - Output: GET handler que retorna `{ count: number }`
  - Comportamiento: Auth via getAuth(), query count con índice compuesto
  - Referencia: ver app/api/attachments/[id]/download/route.ts para pattern de API route con auth

- [x] **2.3** Crear API route GET /api/notifications
  - Input: Nuevo archivo app/api/notifications/route.ts
  - Output: GET handler que retorna `{ items: NotificationWithActor[] }` (limit 50, join users)
  - Comportamiento: Auth via getAuth(), orderBy createdAt desc, join users para nombre/avatar del actor
  - Referencia: ver app/actions/notifications.ts:getNotifications para la query

Validación Fase 2:
• Build pasa
• GET /api/notifications/unread-count retorna `{ count: 0 }`
• GET /api/notifications retorna `{ items: [] }`

---

## Fase 3: Email con Nodemailer

- [x] **3.1** Crear utilidad de email
  - Input: Nuevo archivo lib/email.ts
  - Output: Función sendTaskAssignedEmail({ to, assignerName, taskTitle, taskId })
  - Comportamiento: Configura transporter con `service: 'gmail'`, auth con GMAIL_USER/GMAIL_APP_PASSWORD. Envía texto plano con subject "Te asignaron una tarea: {título}" y body con enlace `{NEXT_PUBLIC_APP_URL}/dashboard?task={taskId}`. Try/catch retorna { success } sin propagar error.
  - Referencia: ver lib/google-drive.ts para pattern de singleton client

Validación Fase 3:
• Build pasa
• Import de nodemailer resuelve sin error

---

## Fase 4: Insertar Notificaciones en Task Actions

- [x] **4.1** Insertar notificación al asignar tarea
  - Input: app/actions/tasks.ts funciones assignTask (~línea 576) y createTask (~línea 160)
  - Output: Después del insert de activity 'assigned', si newAssigneeId !== currentUserId, insertar en notifications con type='assigned'. Además, usar after() de next/server para enviar email non-blocking.
  - Comportamiento: En assignTask: insert notification + after() con sendTaskAssignedEmail. En createTask: si assigneeId && assigneeId !== userId, misma lógica.
  - Referencia: ver app/actions/tasks.ts:576-588 (assignTask activity insert)

- [x] **4.2** Insertar notificación al mencionar en completeTask
  - Input: app/actions/tasks.ts función completeTask (~línea 789-803)
  - Output: Dentro del loop de mentions, si mentionedUserId !== userId, insertar en notifications con type='mentioned'
  - Comportamiento: Deduplicar: un solo insert por userId único. No enviar email para menciones.
  - Referencia: ver app/actions/tasks.ts:789-803 (mentions loop)

- [x] **4.3** Insertar notificación al mencionar en descripción (updateTaskMetadata)
  - Input: app/actions/tasks.ts función updateTaskMetadata (~línea 429)
  - Output: Al actualizar descripción, parsear mentions con extractMentionIds(), diff con task.descriptionMentions (old), guardar nuevos IDs en descriptionMentions column, crear notification type='mentioned' solo para IDs nuevos que no sean el currentUser
  - Comportamiento: Import extractMentionIds de components/mention-input. Diff: newIds.filter(id => !oldIds.includes(id) && id !== userId)
  - Referencia: ver components/mention-input.tsx:202-212 (extractMentionIds function)

Validación Fase 4:
• Build pasa
• Asignar tarea a otro usuario crea registro en notifications
• Completar tarea con menciones crea registros en notifications
• Editar descripción con nueva mención crea registro en notifications

---

## Fase 5: UI - Campana y Popover

- [ ] **5.1** Crear helper de tiempo relativo
  - Input: Nuevo archivo lib/format-relative-time.ts
  - Output: Función formatRelativeTime(date: Date) → "hace 5 min", "hace 2h", "hace 3d", o fecha si > 7 días
  - Comportamiento: Puro, sin dependencias. Intervalos: <1min="ahora", <60min="hace Xm", <24h="hace Xh", <7d="hace Xd", else fecha corta
  - Referencia: ver lib/format-duration.ts para pattern de helper

- [ ] **5.2** Crear componente NotificationBell con popover
  - Input: Nuevo archivo components/notification-bell.tsx
  - Output: Client component ('use client') con campana + badge + popover Radix
  - Comportamiento: useEffect con setInterval(30s) fetch a /api/notifications/unread-count. Pausa polling cuando document.visibilityState === 'hidden'. Badge rojo con número exacto. Al abrir popover, fetch /api/notifications para lista. Cada card: avatar actorImage, texto "{actorName} te asignó/mencionó en: {taskTitle}", formatRelativeTime, dot azul si !isRead. Click en card → markNotificationRead(id) server action + router.push(`/dashboard?task=${taskId}`). Empty state: ícono Bell muted + "No tienes notificaciones".
  - Referencia: ver components/team-view-auto-refresh.tsx para polling pattern, components/mention-input.tsx:156-181 para dropdown styling

- [ ] **5.3** Integrar NotificationBell en layout del dashboard
  - Input: app/(dashboard)/layout.tsx línea 19-20
  - Output: `<NotificationBell />` antes de `<UserNav />` dentro del div flex items-center gap-4
  - Referencia: ver app/(dashboard)/layout.tsx:19-21

Validación Fase 5:
• Build pasa
• Campana visible en header al lado izquierdo del avatar
• Badge aparece cuando hay notificaciones no leídas
• Popover se abre al hacer clic
• Click en notificación navega a la tarea

---

## Fase 6: MentionInput en Descripción de Tarea

- [ ] **6.1** Reemplazar textarea de descripción con MentionInput en TaskDetailDialog
  - Input: components/task-detail-dialog.tsx líneas 328-334 (textarea de descripción)
  - Output: Reemplazar `<textarea>` por `<MentionInput value={description} onChange={setDescription} placeholder="Add more context to this task..." />`
  - Comportamiento: MentionInput ya tiene autocomplete completo. El formato @[name](userId) se guarda en la descripción. Al guardar (handleSave), la tarea 4.3 ya se encarga de parsear y notificar.
  - Referencia: ver components/mention-input.tsx para props del componente, components/task-detail-dialog.tsx:328-334 para textarea actual

Validación Fase 6:
• Build pasa
• Escribir @ en descripción muestra autocomplete de usuarios
• Seleccionar usuario inserta mención en formato @[name](userId)
• Guardar con mención nueva genera notificación al mencionado

---

## Fase 7: Testing E2E con Playwright

**REGLA CRÍTICA:** Ralph NO puede marcar ninguna tarea de esta fase como completada sin incluir en discoveries.md el OUTPUT REAL del comando `pnpm test:e2e`. Debe copiar las líneas de resultado (passed/failed/skipped). Si no hay output real → RALPH_BLOCKED.

- [ ] **7.1** Crear test E2E para notificación por asignación de tarea
  - Input: Nuevo archivo e2e/notifications-assignment.spec.ts
  - Output: Test que: (1) navega al dashboard, (2) crea una tarea, (3) asigna a otro usuario, (4) verifica que el badge de la campana aparece con count > 0 para el usuario asignado
  - Comportamiento: Usar bypass header `x-e2e-test: true` como en e2e/critical-flow.spec.ts. Si el test necesita simular dos usuarios, documentar limitación en discoveries.
  - Referencia: ver e2e/critical-flow.spec.ts para pattern de test E2E con auth bypass
  - **OBLIGATORIO:** Ejecutar `pnpm test:e2e e2e/notifications-assignment.spec.ts` y pegar output completo en discoveries.md

- [ ] **7.2** Crear test E2E para campana y popover de notificaciones
  - Input: Nuevo archivo e2e/notifications-bell.spec.ts
  - Output: Test que: (1) navega al dashboard, (2) verifica que la campana existe en el header, (3) hace clic en la campana, (4) verifica que el popover se abre, (5) verifica estado vacío "No tienes notificaciones" si no hay notificaciones
  - Comportamiento: Verificar selectores reales del componente notification-bell.tsx
  - Referencia: ver components/notification-bell.tsx para selectores, e2e/critical-flow.spec.ts para pattern
  - **OBLIGATORIO:** Ejecutar `pnpm test:e2e e2e/notifications-bell.spec.ts` y pegar output completo en discoveries.md

- [ ] **7.3** Crear test E2E para MentionInput en descripción
  - Input: Nuevo archivo e2e/notifications-mention.spec.ts
  - Output: Test que: (1) navega al dashboard, (2) abre una tarea, (3) escribe @ en el campo de descripción, (4) verifica que aparece el dropdown de autocomplete de usuarios
  - Comportamiento: Usar selectores del MentionInput component
  - Referencia: ver components/mention-input.tsx para selectores, components/task-detail-dialog.tsx para dialog
  - **OBLIGATORIO:** Ejecutar `pnpm test:e2e e2e/notifications-mention.spec.ts` y pegar output completo en discoveries.md

- [ ] **7.4** Ejecutar suite completa de E2E y reportar resultados
  - Input: Todos los archivos e2e/*.spec.ts
  - Output: Ejecutar `pnpm test:e2e` (suite completa). Copiar OUTPUT COMPLETO a discoveries.md incluyendo: número de tests passed, failed, skipped, y duración total.
  - Comportamiento: Si algún test falla → intentar fix (max 10 intentos). Si tests pasan → documentar resultado exacto. NUNCA marcar como completada sin output real del test runner.
  - **OBLIGATORIO:** El output de `pnpm test:e2e` DEBE aparecer en discoveries.md. Sin output → RALPH_BLOCKED.

Validación Fase 7:
• Todos los test files existen en e2e/
• `pnpm test:e2e` ejecuta sin errores de configuración
• Output real del test runner documentado en discoveries.md
• Tests pasan o fallan con razón documentada (NO skipped sin explicación)

---

## Summary

| Fase | Tareas | Descripción |
|------|--------|-------------|
| 0 | 3 | Dependencias, setup y validación Playwright |
| 1 | 3 | Schema y migración |
| 2 | 3 | Server actions y API routes |
| 3 | 1 | Email con Nodemailer |
| 4 | 3 | Insertar notificaciones en task actions |
| 5 | 3 | UI campana y popover |
| 6 | 1 | MentionInput en descripción |
| 7 | 4 | Testing E2E con Playwright |
| **Total** | **21** | |
