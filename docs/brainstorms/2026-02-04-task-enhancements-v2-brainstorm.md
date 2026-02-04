# Brainstorm: Task Enhancements V2

**Fecha**: 2026-02-04
**Estado**: Listo para planificación

---

## Qué Estamos Construyendo

Cuatro mejoras al sistema de tareas para aumentar la visibilidad y control del equipo:

### 1. Fecha de Entrega (Due Date)
- Campo `dueDate` opcional en tareas
- Indicadores visuales en tarjetas:
  - **Rojo**: Tarea vencida
  - **Amarillo**: Próxima a vencer (24-48h)
  - **Normal**: Más de 48h o sin fecha

### 2. Eliminar Página Backlog
- Eliminar `/dashboard/backlog` y su enlace del menú
- La columna "Pila de Tareas" permanece en Kanban
- Simplifica la navegación sin perder funcionalidad

### 3. Filtro "Mis Tareas" en Kanban
- Botón toggle claro en la parte superior del Kanban
- Al activar: filtra TODAS las columnas mostrando solo tareas asignadas al usuario actual
- Estado del filtro NO persiste entre sesiones (se resetea al recargar)

### 4. Barra de Progreso (Progress Bar)
- Slider 0-100% visible en:
  - `TaskCard` (Kanban)
  - `TeamSlot` (Dashboard/Team View)
- **Solo el asignado puede modificar el progreso**
- Otros usuarios ven el progreso pero no pueden editarlo

---

## Por Qué Este Enfoque

| Decisión | Razón |
|----------|-------|
| Due date solo visual | Sin notificaciones ni bloqueos automáticos. KISS - el equipo ya se comunica activamente |
| Eliminar solo página backlog | Mantiene el flujo Kanban intacto, reduce navegación redundante |
| Toggle simple para filtro | Más rápido que dropdown, caso de uso principal es "ver mis tareas" |
| Slider en tarjeta (no en modal) | Visibilidad inmediata del progreso sin clicks adicionales |
| Solo asignado edita progreso | Evita conflictos, el responsable conoce mejor el avance real |

---

## Decisiones Clave

### Mantenido sin cambios
- **Asignación 1:1**: Se mantiene un solo asignado por tarea
  - Limitación: Si necesitas múltiples personas, crea tareas separadas o usa "tareas derivadas"

### Cambios de Schema (DB)
```
tasks:
  + dueDate: timestamp (nullable)
  + progress: integer (0-100, default 0)
```

### Archivos a Modificar
- `db/schema.ts` - Agregar campos dueDate y progress
- `components/task-card.tsx` - Mostrar due date + progress slider
- `components/team-slot.tsx` - Mostrar progress bar
- `components/kanban-board.tsx` - Agregar toggle de filtro
- `app/actions/tasks.ts` - Nuevas acciones para due date y progress
- `app/(dashboard)/dashboard/backlog/` - Eliminar directorio
- Navegación/sidebar - Remover enlace a backlog

### Permisos de Progress Bar
- Ver progreso: Todos los usuarios
- Editar progreso: Solo `task.assigneeId === currentUserId`

---

## Preguntas Abiertas

1. ¿El progress bar debe resetearse a 0 si la tarea vuelve de "done" a otro estado? (Actualmente las tareas done no se pueden mover)
2. ¿Mostrar fecha de entrega en el diálogo de creación de tarea o solo al editar?

---

## Siguiente Paso

Ejecutar `/workflows:plan` para generar el plan de implementación detallado.
