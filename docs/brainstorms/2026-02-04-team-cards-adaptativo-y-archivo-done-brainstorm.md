# Brainstorm: Grid Adaptativo de Miembros + Historial de Tareas Completadas

**Fecha:** 2026-02-04
**Participantes:** Rogelio Guzmán, Claude

---

## Lo Que Vamos a Construir

### Cambio 1: Eliminar "Espacios Disponibles" del Dashboard

**Problema actual:**
El dashboard de equipo muestra 8 slots fijos, incluyendo placeholders "Espacio X - Disponible" para posiciones vacías. Esto ocupa espacio innecesario y no aporta valor.

**Solución:**
Grid adaptativo que solo muestra cards de miembros reales, distribuyéndose para cubrir todo el espacio disponible.

**Comportamiento esperado:**
- Si hay 3 miembros → 3 cards distribuidas en el espacio
- Si hay 7 miembros → 7 cards en grid
- Las cards se expanden/contraen según el espacio disponible
- Sin placeholders vacíos

---

### Cambio 2: Historial de Tareas Completadas

**Problema actual:**
Las tareas que se mueven a "Done" se acumulan infinitamente en la columna, sin forma de limpiarla o acceder a un historial organizado.

**Solución:**
1. La columna "Done" solo muestra tareas de los **últimos 7 días**
2. Botón "Ver historial" al final de la columna Done
3. Nueva página `/kanban/historial` con navegación por días

**Funcionalidad del Historial:**
- Navegación con flechas ← → para moverse entre días
- Muestra todas las tareas completadas en el día seleccionado
- Filtro por usuario para ver tareas de una persona específica
- Click en tarea expande inline mostrando detalles (notas, links)
- Permite ver rápidamente qué se hizo en cualquier fecha

---

## Por Qué Este Enfoque

### Grid Adaptativo
- **YAGNI:** No necesitamos mostrar espacios que no existen
- **Mejor UX:** Interfaz más limpia y profesional
- **Flexibilidad:** Funciona igual con 1 o 20 miembros
- **CSS moderno:** `auto-fill`/`auto-fit` resuelve esto elegantemente

### Filtro de 7 días + Página de Historial
- **Simple:** No requiere nuevos campos en BD ni cron jobs
- **Eficiente:** Query solo trae tareas recientes al kanban
- **Accesible:** Historial completo disponible cuando se necesite
- **Navegación intuitiva:** Flechas para moverse entre días es familiar

---

## Decisiones Clave

| Decisión | Elección | Alternativa descartada |
|----------|----------|------------------------|
| Layout de cards | Grid adaptativo con CSS | Grid fijo centrado |
| Manejo de Done | Filtro 7 días + historial | Archivo con cron job |
| Acceso a historial | Nueva página | Modal/drawer overlay |
| Navegación historial | Flechas por día | Selector de fecha manual |

---

## Archivos Afectados (Estimación)

### Grid Adaptativo
- `components/team-slot.tsx` - Eliminar renderizado de slot vacío
- `app/(dashboard)/dashboard/page.tsx` - Cambiar array fijo de 8 por miembros reales
- CSS del grid contenedor - Usar `auto-fill` o `auto-fit`

### Historial de Tareas
- `app/actions/kanban.ts` - Agregar filtro de fecha en query de Done
- `components/kanban-column.tsx` - Agregar botón "Ver historial" en columna Done
- `app/(dashboard)/dashboard/kanban/historial/page.tsx` - **NUEVA** página de historial
- `components/task-history-view.tsx` - **NUEVO** componente de vista por día
- `app/actions/tasks.ts` - Nueva función para obtener tareas por fecha

---

## Preguntas Resueltas

| Pregunta | Decisión |
|----------|----------|
| ¿Filtros en historial? | Sí, filtro por usuario |
| ¿Click en tarea del historial? | Expandir inline mostrando detalles |
| ¿Contador de Done? | Solo tareas visibles (últimos 7 días) |

---

## Próximos Pasos

1. Ejecutar `/workflows:plan` para generar plan de implementación detallado
2. Implementar cambios en orden: primero grid adaptativo, luego historial
