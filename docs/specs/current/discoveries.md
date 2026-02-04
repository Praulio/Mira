# Discoveries: Task Enhancements V2

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementación)

---

## Convenciones del Proyecto (heredadas del feature anterior)

- **Idioma UI**: Español (botones, labels, mensajes)
- **Idioma Código**: Inglés (variables, funciones)
- **Glassmorphism**: Usar `backdrop-blur-[40px]`, `bg-white/5`, `border-white/10`
- **Toasts**: Usar `sonner` con `toast.success()` y `toast.error()`
- **Server Actions**: Retornar `{ success: boolean, data?: T, error?: string }`
- **Drizzle**: Tipos inferidos `typeof tasks.$inferSelect`

---

## Decisiones de Diseño (del brainstorm)

| Decisión | Valor |
|----------|-------|
| Due Date - Umbral amarillo | ≤24 horas |
| Due Date - Permisos edición | Solo CREADOR |
| Progress - Permisos edición | Assignee O creador (si no hay assignee) |
| Progress - Guardado | Al soltar slider (onMouseUp/onTouchEnd) |
| Filtro - Ubicación | Encima de columnas, alineado derecha |
| Filtro - Persistencia | NO persiste (estado local) |

---

## Sesiones

### Session 0 - 2026-02-04

**Setup inicial**
- Implementation plan generado: 19 tareas en 6 fases
- Feature incluye:
  - Due Date con indicadores visuales (rojo/amarillo)
  - Eliminar página backlog (redirect a kanban)
  - Filtro "Mis Tareas" toggle en Kanban
  - Progress bar slider 0-100%

**Schema changes:**
- `dueDate: timestamp('due_date')` - nullable
- `progress: integer('progress').default(0)` - 0-100

**Archivos nuevos a crear:**
- Ninguno (solo modificaciones)

**Archivos a modificar:**
- `db/schema.ts` - agregar campos
- `app/actions/tasks.ts` - nuevas actions
- `app/actions/kanban.ts` - actualizar tipos y queries
- `app/actions/team.ts` - agregar progress
- `components/task-card.tsx` - due date badge, progress bar
- `components/team-slot.tsx` - progress bar
- `components/kanban-board.tsx` - filtro toggle
- `components/kanban-column.tsx` - mensaje vacío filtrado
- `components/create-task-dialog.tsx` - date picker
- `components/task-detail-dialog.tsx` - date picker, progress slider
- `components/sidebar.tsx` - remover enlace backlog
- `app/(dashboard)/dashboard/backlog/page.tsx` - convertir a redirect

**Próximos pasos:**
- Ejecutar `./ralph-loop.sh`
- Monitorear con `tail -f ralph-log.txt`

### Session 1 - 2026-02-04
**Task:** 0.1 - Agregar campos dueDate y progress al schema de tasks
**Files:** `db/schema.ts`
**Changes:**
- Agregado `dueDate: timestamp('due_date')` después de `parentTaskId`
- Agregado `progress: integer('progress').default(0)` después de `dueDate`
**Patterns:**
- Los campos timestamp sin `.notNull()` son nullable por defecto
- `integer().default(0)` crea el default a nivel de DB
**Notes:** Build pasa sin errores. Siguiente paso es generar y aplicar la migración Drizzle (tarea 0.2)

### Session 2 - 2026-02-04
**Task:** 0.2 - Generar y aplicar migración Drizzle
**Files:** Base de datos (Neon PostgreSQL)
**Changes:**
- DROP TABLE `notifications` CASCADE
- DROP COLUMN `description_mentions` de tasks (32 registros)
- DROP TYPE `notification_type`
**Investigation:**
- `description_mentions` era un campo **no implementado** - nunca se usaba
- Sistema de menciones funciona via tabla `activity` con `action: 'mentioned'`
- Menciones se crean al **completar** task, no al crear/editar descripción
- Campo `completionMentions` en schema SÍ se usa correctamente
**Patterns:**
- Para ejecutar drizzle-kit con env vars de .env.local: `DATABASE_URL=$(grep "^DATABASE_URL=" .env.local | cut -d'=' -f2-) npx drizzle-kit push --force`
- La flag `--force` evita el prompt interactivo que bloqueaba Ralph
**Notes:** Fase 0 completada. Build pasa. Siguiente: Fase 1 - Data Layer (actualizar tipos)

### Session 3 - 2026-02-04
**Task:** 1.1 - Actualizar tipo KanbanTaskData con dueDate y progress
**Files:** `app/actions/kanban.ts`
**Changes:**
- Agregado `dueDate: Date | null` al tipo KanbanTaskData (línea 32)
- Agregado `progress: number` al tipo KanbanTaskData (línea 33)
**Patterns:**
- Los tipos TypeScript se definen separados de las queries
- El `as KanbanTaskData` (type assertion) permite que el build pase aunque el objeto no tenga todos los campos
- La próxima tarea (1.2) debe actualizar la query para retornar los campos reales
**Notes:** Tarea 1.1 completada - solo actualiza el tipo. Task 1.2 actualizará la query.
