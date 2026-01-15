# Master Spec: Mira Tasker (v1.0.0)

> **Estado:** ✅ Refinado via Adversarial Debate (Gemini 3 + DeepSeek v3.2)
> **Stack:** Next.js 15, Clerk, Neon Postgres, Drizzle ORM, Tailwind CSS, Lucide Icons.

---

## 1. Visión del Proyecto
Mira Tasker es una herramienta de gestión de tareas ultra-minimalista diseñada específicamente para equipos de alto rendimiento de hasta 8 personas. Su objetivo es eliminar la sobrecarga de gestión (Jira/Linear) y proporcionar una respuesta visual inmediata a la pregunta: **"¿Quién está haciendo qué ahora mismo?"**

## 2. Requerimientos Funcionales (MVP)

### 2.1 Gestión de Usuarios & Slots
- **Auth:** Login único con Google vía **Clerk**.
- **Sync:** Sincronización automática de perfil (Avatar, Nombre) a la base de datos local vía Webhooks (Clerk -> Neon).
- **The 8-Slot Rule:** El dashboard principal muestra una grilla fija de 8 espacios. 
  - Si hay más de 8 usuarios, se muestran los 8 más activos recientemente.
  - Cada usuario tiene un `slot_index` (0-7) asignado.

### 2.2 Gestión de Tareas (Core Logic)
- **Estados:** `Backlog`, `To Do`, `In Progress`, `Done`.
- **Regla de Oro:** Un usuario solo puede tener **una** tarea en estado `In Progress` a la vez. Si mueve una nueva tarea a `In Progress`, la anterior regresa automáticamente a `To Do` (Transacción Atómica).
- **Acciones:** Crear, Editar, Eliminar y Cambio de estado vía Drag & Drop.

### 2.3 Visualización (Vistas)
- **Team View (Home):** Grilla de 8 slots. Cada slot muestra:
    - Avatar y nombre del usuario.
    - Título de la tarea actual (`In Progress`).
    - Tiempo transcurrido desde el inicio de la tarea.
    - Estado vacío/alerta si el usuario no tiene nada en curso.
- **Kanban View:** Tablero clásico de 4 columnas.
- **Backlog View:** Lista vertical simple para priorización rápida.

### 2.4 Histórico (Activity Log)
- Panel lateral con feed de cambios.
- Registro de eventos: Creación, cambio de estado, asignación y borrado.

---

## 3. Arquitectura Técnica

### 3.1 Base de Datos (Neon Postgres + Drizzle)
- **Tabla `users`:** 
    - `id` (Clerk ID), `email`, `name`, `image_url`, `slot_index` (0-7).
- **Tabla `tasks`:** 
    - `id` (UUID), `title`, `description`, `status` (Enum), `assignee_id` (FK users), `creator_id` (FK users).
- **Tabla `activity`:** 
    - `id`, `task_id`, `user_id`, `action`, `metadata` (JSONB para old/new status).

### 3.2 Backend (Server Actions)
- Todas las mutaciones se realizan vía **Next.js Server Actions**.
- Validación estricta con **Zod**.
- Manejo de errores estandarizado: `{ success: boolean, data?: T, error?: string }`.

### 3.3 Frontend (Next.js 15 + Tailwind)
- **Real-time:** Polling inteligente (cada 30s) para la Team View. Optimistic UI con TanStack Query para cambios inmediatos.
- **Dnd:** Uso de `@dnd-kit` para el Kanban y reordenamiento.
- **Componentes:** Shadcn/ui para la base estética (Dark Mode por defecto).

---

## 4. Plan de Implementación (Sprints para Ralph)

### Sprint 1: Foundation & Identity (Core Infra)
*   **1.1** Setup de Next.js 15, Tailwind y Shadcn base.
*   **1.2** Configuración de Drizzle ORM y conexión con Neon.
*   **1.3** Integración de Clerk Auth y Middleware de protección.
*   **1.4** Implementación de Webhook de Clerk para sincronización de usuarios en DB local.

### Sprint 2: The Task Engine (Logic & CRUD)
*   **2.1** Definición del Schema final y migraciones.
*   **2.2** Server Actions para CRUD de Tareas con validación Zod.
*   **2.3** Implementación de la lógica atómica de "Single In-Progress task".
*   **2.4** Unit testing de la lógica de transición de estados.

### Sprint 3: Visual Visibility (Team View)
*   **3.1** Creación del Layout principal y Sidebar.
*   **3.2** Componente `TeamSlot` (Grilla de 8).
*   **3.3** Lógica de ocupación de slots y estados "Empty/Alert".
*   **3.4** Implementación de Polling para mantener el Dashboard actualizado.

### Sprint 4: Kanban & Drag and Drop (Interaction)
*   **4.1** Implementación del Tablero Kanban (4 columnas).
*   **4.2** Integración de `@dnd-kit` para mover tareas entre estados.
*   **4.3** Optimistic UI para que el movimiento sea instantáneo (<100ms percibidos).

### Sprint 5: History & Polish (Observability)
*   **5.1** Implementación de la tabla de Activity y triggers de log en Server Actions.
*   **5.2** Panel lateral de Activity Feed.
*   **5.3** Manejo global de errores (Error Boundaries) y Toasts de notificación.
*   **5.4** Revisión final de performance y accesibilidad.
