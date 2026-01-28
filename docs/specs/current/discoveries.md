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
