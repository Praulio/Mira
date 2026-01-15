# Discoveries - Project Mira

> Memoria dinámica entre iteraciones del Ralph Loop.

## Patrones Descubiertos
- **Ralph Loop en Factory:** Migrado de Claude Code a Droid Exec.
- **Clerk Auth Condicional:** Implementado patrón de inicialización condicional de Clerk basado en validez de API keys, permitiendo builds exitosos en desarrollo sin claves reales.

## Notas de Sesión
- **2026-01-14:** Configuración inicial del sistema Ralph con integración de skills de React.
- **2026-01-15:** Sesión 1.1: Setup del Proyecto.
  - **Next.js 16.1.2:** Instalado mediante `create-next-app@latest`. Usa Turbopack por defecto.
  - **Tailwind 4:** Configuración minimalista basada en `@tailwindcss/postcss`. No requiere `tailwind.config.ts`.
  - **ESLint Flat Config:** Implementado en `eslint.config.mjs`. Se añadieron ignores para `.factory`, `docs` y `specs`.
  - **React 19:** Incluido como dependencia base.
  - **Librerías Base:** Instaladas `lucide-react`, `clsx`, `tailwind-merge`.
  - **Bug Resuelto:** El instalador fallaba por nombre de proyecto con mayúsculas ("Mira"). Se usó un subdirectorio temporal para la creación y movimiento de archivos.
- **2026-01-15:** Sesión 1.2: Configuración de Clerk Auth.
  - **@clerk/nextjs 6.x:** Instalado y configurado con middleware de protección de rutas.
  - **Archivos creados:**
    - `middleware.ts`: Protección de rutas con bypass condicional si no hay keys válidas.
    - `.env.local` y `.env.example`: Variables de entorno para Clerk.
    - `app/sign-in/[[...sign-in]]/page.tsx`: Página de login con componente Clerk.
    - `app/sign-up/[[...sign-up]]/page.tsx`: Página de registro con componente Clerk.
  - **Patrón de Build Robusto:** Implementada verificación de validez de keys de Clerk (`pk_test_placeholder` vs keys reales) en `layout.tsx` y `middleware.ts`, permitiendo que el proyecto compile exitosamente en desarrollo local sin necesidad de obtener keys reales de Clerk dashboard.
  - **Layout actualizado:** `ClerkProvider` envuelve la app condicionalmente solo cuando hay keys válidas.
  - **Metadata actualizada:** Título y descripción reflejan "Mira Tasker".
- **2026-01-15:** Sesión 1.3: Setup de Base de Datos (Neon + Drizzle).
  - **Dependencias instaladas:**
    - `drizzle-orm`: ORM TypeScript-first para PostgreSQL.
    - `@neondatabase/serverless`: Driver serverless de Neon compatible con edge runtime.
    - `drizzle-kit` (dev): Herramientas CLI para migraciones y generación de schemas.
  - **Archivos creados:**
    - `drizzle.config.ts`: Configuración de Drizzle Kit para migraciones con dialect `postgresql`.
    - `db/index.ts`: Conexión serverless con Neon usando Pool. Incluye validación de `DATABASE_URL`.
  - **Variables de entorno:** Añadida `DATABASE_URL` a `.env.example` y `.env.local` (con placeholders).
  - **Patrón de Conexión:** Se usa `Pool` de `@neondatabase/serverless` para compatibilidad con edge runtime y serverless functions.
  - **Build Status:** ✅ Lint y build pasaron exitosamente sin errores.
- **2026-01-15:** Sesión 1.4: Implementación de Webhook de Clerk para User Sync.
  - **Dependencia instalada:**
    - `svix`: Librería oficial para validación de signatures de webhooks de Clerk.
  - **Archivos creados:**
    - `db/schema.ts`: Schema inicial con tabla `users` (id, email, name, imageUrl, slotIndex, timestamps).
    - `db/migrations/0000_classy_saracen.sql`: Primera migración SQL para crear tabla users.
    - `app/api/webhooks/clerk/route.ts`: Endpoint POST que maneja eventos `user.created` y `user.updated`.
    - `db/README.md`: Guía para ejecutar migraciones con Drizzle Kit.
  - **Archivos actualizados:**
    - `db/index.ts`: Importado schema para habilitar queries tipadas con Drizzle.
    - `.env.example`: Añadida variable `CLERK_WEBHOOK_SECRET` con instrucciones.
  - **Patrón de Webhook:** Validación de firma Svix en headers (`svix-id`, `svix-timestamp`, `svix-signature`), manejo de eventos con insert/update en DB, logs de errores en consola.
  - **Seguridad:** El webhook verifica la firma antes de procesar cualquier payload, previniendo requests no autorizados.
  - **Build Status:** ✅ Lint y build pasaron exitosamente. Ruta `/api/webhooks/clerk` visible en manifest de Next.js.
