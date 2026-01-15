# Implementation Plan: Mira Tasker - MVP

## Resumen
Este plan detalla la construcción de Mira Tasker, una herramienta de gestión de tareas minimalista para equipos de 8 personas.

---

## Tareas

### Fase 1: Foundation & Identity (Infra)
- [x] **1.1** Setup del proyecto Next.js 15
  - Comando: `npx create-next-app@latest . --ts --tailwind --eslint --app`
  - Instalar dependencias base: `lucide-react`, `clsx`, `tailwind-merge`.
- [x] **1.2** Configurar Clerk Auth
  - Instalar `@clerk/nextjs`.
  - Configurar Middleware y variables de entorno.
  - Crear página de Login/Sign-up básica.
- [x] **1.3** Setup de Base de Datos (Neon + Drizzle)
  - Instalar `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`.
  - Configurar `db/index.ts` y `drizzle.config.ts`.
- [x] **1.4** Implementar Webhook de Clerk para User Sync
  - Crear endpoint `app/api/webhooks/clerk/route.ts`.
  - Validar firma con `svix`.
  - Sincronizar `user.created` y `user.updated` con la tabla `users` local.

### Fase 2: The Task Engine (Logic & Testing)
- [x] **2.1** Definir Schema de Base de Datos
  - Archivo: `db/schema.ts`.
  - Tablas: `users`, `tasks`, `activity` con sus respectivos enums e índices.
- [x] **2.2** Server Action: `createTask`
  - Validar con Zod.
  - Insertar en DB y revalidatePath.
- [x] **2.3** Server Action: `updateTaskStatus` (Lógica Crítica)
  - Implementar transacción atómica.
  - Si el nuevo estado es `IN_PROGRESS`, mover cualquier otra tarea `IN_PROGRESS` del usuario a `TODO`.
- [x] **2.4** Implementar Unit Tests para Lógica de Estados
  - Usar Vitest.
  - Testear que la lógica de "Single In-Progress task" funcione correctamente.
- [x] **2.5** Server Action: `deleteTask` y `updateTaskMetadata`
  - Implementar borrado y edición de título/descripción.

### Fase 3: Visual Visibility (Team View)
- [x] **3.1** Layout Principal y Navigation
  - Crear Sidebar y contenedor principal con Shadcn.
- [x] **3.2** Grilla de Team View (The 8 Slots)
  - Crear componente `TeamSlot.tsx`.
  - Implementar grid de 2x4 (desktop) / 1xN (mobile).
- [x] **3.3** Lógica de Datos para Team View
  - Fetch de los 8 usuarios con sus tareas `IN_PROGRESS`.
  - Manejo de estados vacíos y carga (Skeletons).
- [x] **3.4** Implementar Polling para el Dashboard
  - Usar `setInterval` o `swr/react-query` para refrescar el dashboard cada 30s.

### Fase 4: Kanban & Drag (UX)
- [x] **4.1** Tablero Kanban Base
  - Renderizar 4 columnas fijas: Backlog, To Do, In Progress, Done.
- [ ] **4.2** Integración de `@dnd-kit`
  - Implementar drag and drop entre columnas.
- [ ] **4.3** Optimistic UI para Kanban
  - Asegurar que el cambio visual sea instantáneo antes de que termine la Server Action.

### Fase 5: Activity, Polish & E2E
- [ ] **5.1** Panel de Activity Feed
  - Crear componente lateral que liste los últimos 20 eventos de la tabla `activity`.
- [ ] **5.2** Logging de Actividad
  - Asegurar que cada Server Action de la Fase 2 inserte un registro en `activity`.
- [ ] **5.3** Error Boundaries y Toasts
  - Configurar `sonner` para notificaciones.
  - Implementar `error.tsx` para manejo global de fallos.
- [ ] **5.4** Implementar Tests E2E Críticos
  - Usar Playwright.
  - Flujo: Login -> Crear Tarea -> Mover a In Progress -> Verificar en Team View.

---

## Notas para Ralph
- Sigue siempre los patrones de Next.js 15 (Server Components por defecto).
- Mantén el diseño minimalista (estilo Linear).
- No avances a la siguiente tarea hasta que la actual pase `pnpm lint && pnpm build`.
