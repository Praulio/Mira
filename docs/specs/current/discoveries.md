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
