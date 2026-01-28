# Discoveries: Sistema de Notificaciones

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

### Session 0 - 2026-01-28

**Setup inicial**
- Implementation plan generado: 21 tareas en 8 fases (incluye Fase 7 de E2E testing con Playwright)
- Feature incluye:
  - Notificaciones in-app (campana + popover)
  - Email por asignación (Nodemailer + Gmail SMTP)
  - @menciones en descripción de tarea
- Listo para `./ralph-loop.sh`

**Dependencias a instalar:**
- `nodemailer`, `@types/nodemailer`
- `@radix-ui/react-popover`

**Variables de entorno requeridas:**
- `GMAIL_USER` - Cuenta Gmail para SMTP
- `GMAIL_APP_PASSWORD` - App Password de Gmail
- `NEXT_PUBLIC_APP_URL` - URL base de la app

**Archivos nuevos a crear:**
- `app/actions/notifications.ts`
- `app/api/notifications/route.ts`
- `app/api/notifications/unread-count/route.ts`
- `lib/email.ts`
- `lib/format-relative-time.ts`
- `components/notification-bell.tsx`

**Archivos a modificar:**
- `db/schema.ts` - agregar notifications table + descriptionMentions column
- `app/actions/tasks.ts` - insertar notificaciones en assign/complete/updateMetadata
- `app/(dashboard)/layout.tsx` - agregar NotificationBell al header
- `components/task-detail-dialog.tsx` - reemplazar textarea con MentionInput
- `.env.example` - agregar variables GMAIL

**Próximos pasos:**
- Ejecutar `./ralph-loop.sh`
- Monitorear con `tail -f ralph-log.txt`

### Session 1 - 2026-01-28
**Task:** 0.1 - Instalar dependencias: nodemailer, @types/nodemailer, @radix-ui/react-popover
**Files:** package.json, pnpm-lock.yaml
**Patterns:** pnpm was not on PATH; needed `/opt/homebrew/bin/pnpm` or global install via npm. pnpm moved npm-installed packages to `.ignored` dir and reinstalled everything cleanly (615 packages).
**Notes:** nodemailer 7.0.13, @radix-ui/react-popover 1.1.15, @types/nodemailer 7.0.9 installed. Build passes with 0 errors (13 warnings pre-existing).

### Session 2 - 2026-01-28
**Task:** 0.2 - Agregar variables de entorno a .env.example
**Files:** .env.example
**Patterns:** .env.example uses comment blocks per section with URLs for setup instructions.
**Notes:** Added GMAIL_USER, GMAIL_APP_PASSWORD, NEXT_PUBLIC_APP_URL. Build passes (0 errors, 13 warnings pre-existing).

### Session 3 - 2026-01-28
**Task:** 0.3 - Validar que Playwright funciona correctamente
**Files:** No files modified (validation only)
**Patterns:** Playwright config uses `webServer` block to auto-start dev server. `reuseExistingServer: !process.env.CI` means it reuses if already running. Tests use `x-e2e-test: true` header for auth bypass.
**Notes:** Ran `pnpm exec playwright install --with-deps chromium` successfully. Then ran `pnpm test:e2e e2e/critical-flow.spec.ts`.
**Test Output:**
```
  2 failed
    [chromium] › e2e/critical-flow.spec.ts:38:7 › Critical User Flow › complete flow: create task -> move to in progress -> verify in team view
    [chromium] › e2e/critical-flow.spec.ts:150:7 › Critical User Flow › kanban drag and drop works across all columns
  1 passed (52.2s)
```
Playwright EXECUTES correctly: browser opens, page loads, tests run. The 2 failures are pre-existing DB-related issues (ri_ReportViolation), not Playwright configuration problems. Validation passed.

### Session 4 - 2026-01-28
**Task:** 1.1 - Agregar tabla notifications y enum notificationTypeEnum a schema
**Files:** db/schema.ts
**Patterns:** Followed activity table pattern: uuid PK, references to users/tasks with cascade, indexes. Added notificationTypeEnum pgEnum with 'assigned'/'mentioned'. Composite index on (recipientId, isRead) for efficient unread count queries.
**Notes:** Build passes (0 errors, 13 warnings pre-existing). Table has: id, recipientId, actorId, taskId, type, isRead, createdAt with 3 indexes.

### Session 5 - 2026-01-28
**Task:** 1.2 - Agregar columna descriptionMentions a tabla tasks
**Files:** db/schema.ts
**Patterns:** Followed completionMentions pattern exactly: `jsonb('description_mentions').$type<string[]>()`. Added after completionMentions on line 53.
**Notes:** Build passes (0 errors, 13 warnings pre-existing). Column added to track which users were mentioned in task description for diff-based notification logic in task 4.3.

### Session 6 - 2026-01-28
**Task:** 1.3 - Ejecutar migración
**Files:** db/migrations/0004_colorful_sugar_man.sql (generated)
**Patterns:** `drizzle-kit push --force` skips interactive confirmation. Must use `dotenv -e .env.local --` prefix for env vars. `pnpm db:generate` creates SQL migration file, `drizzle-kit push --force` applies to Neon DB.
**Notes:** Migration applied successfully: notifications table created with enum, FKs, and 3 indexes. description_mentions column added to tasks. Build passes (0 errors, 13 warnings pre-existing).

### Session 7 - 2026-01-28
**Task:** 2.1, 2.2, 2.3 - Crear server actions y API routes de notificaciones
**Files:** app/actions/notifications.ts (new), app/api/notifications/unread-count/route.ts (new), app/api/notifications/route.ts (new)
**Patterns:** Zod error access uses `.issues[0].message` not `.errors[0].message` in this project's Zod version. API routes follow same `getAuthUserId()` pattern from attachments download route with E2E bypass. Server actions use `getAuth()` from mock-auth. Both patterns coexist: server actions use mock-auth, API routes use inline getAuthUserId.
**Notes:** Three functions in server actions: getUnreadCount (count query with composite index), getNotifications (join users+tasks, limit 50, desc order), markNotificationRead (validates recipientId === currentUser). Two API routes mirror getUnreadCount and getNotifications. Build passes (0 errors, 14 warnings pre-existing).
