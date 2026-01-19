# Feature: Backlog Funcional + Cierre de Ciclo de Tareas

## Visión

Crear un flujo completo de trabajo donde el equipo pueda:
1. **Planificar** - Ver y priorizar tareas pendientes en el backlog con indicadores visuales claros
2. **Completar** - Cerrar tareas con notas, links y menciones que lleguen al equipo
3. **Celebrar** - Sentir el progreso con gamificación (confetti, cards destacadas)
4. **Revisar** - Ver el historial de completados y menciones personales

El objetivo es que **todos sepan qué está pasando sin preguntar** y que **completar tareas se sienta satisfactorio**.

---

## Flujo del Usuario

### Flujo 1: Usando el Backlog

1. Usuario navega a `/dashboard/backlog`
2. Ve lista de tareas en estado `backlog` ordenadas (críticas primero, luego por fecha creación)
3. Puede:
   - **Marcar como crítica** - Toggle que pone la tarea en rojo (máximo 1 por persona)
   - **Reordenar** - Drag & drop para acomodo personal (no afecta prioridad)
   - **Ver detalles** - Click abre modal igual que en Kanban
   - **Eliminar** - Desde el menú de la card
4. Cuando la tarea está lista para trabajar, la mueve a "TODO" (desde detalles o drag)

### Flujo 2: Completando una Tarea

**Trigger A: Arrastra tarea a columna "Done" en Kanban**
1. Se abre automáticamente el modal de completar
2. Usuario puede agregar (todo opcional):
   - Notas de cierre (texto libre)
   - Links/URLs (evidencia, entregables)
   - @menciones a miembros del equipo
3. Click en "Completar"
4. Modal se cierra → Confetti + sonido → Card se destaca brevemente → Desaparece

**Trigger B: Botón "Completar" en detalle de tarea**
1. Desde cualquier tarea (cualquier estado), hay botón "Completar"
2. Se abre el mismo modal de completar
3. Mismo flujo que arriba

### Flujo 3: Viendo Actividad y Completados

1. Usuario va a `/dashboard/activity`
2. Ve el feed con nuevos tipos de eventos:
   - "X completó la tarea Y" (con notas y links visibles)
   - "X te mencionó en la tarea Y"
3. Puede filtrar por:
   - "Todos" (default)
   - "Completados" (solo tareas terminadas)
   - "Mis menciones" (donde lo taguearon)

---

## UI/UX

### Backlog (Nueva página funcional)

**Layout:**
- Lista vertical de task cards (similar a Kanban pero en lista)
- Header con título "Pila de Tareas" y contador
- Botón "Nueva Tarea" arriba

**Task Card en Backlog:**
- Mismo diseño que `task-card.tsx` actual
- Indicador visual de **prioridad crítica**: borde rojo + badge "CRÍTICO"
- Draggable para reordenar (orden local, no persiste en DB)

**Colores (Data Storytelling):**
- 🔴 Rojo: Tarea crítica
- ⚪ Normal: Sin prioridad especial (glassmorphism actual)

**Regla crítica:**
- Solo 1 tarea crítica por usuario
- Si intenta marcar otra, mensaje: "Ya tienes una tarea crítica. Desmarca la actual primero."

### Modal de Completar Tarea

**Diseño:**
- Título: "🎉 Completar: [nombre tarea]"
- Campo de texto: "Notas de cierre (opcional)"
  - Placeholder: "Agrega contexto, instrucciones o usa @nombre para mencionar..."
  - Al escribir "@" muestra dropdown con miembros del equipo
- Campo de links: "Adjuntar links (opcional)"
  - Input para URL + botón agregar
  - Lista de links agregados con botón eliminar
- Botones: "Cancelar" | "Completar ✓"

### Gamificación al Completar

1. **Confetti**: Animación de confetti que cae desde arriba (2-3 segundos)
2. **Sonido**: Sonido corto satisfactorio (opcional, respeta preferencias del sistema)
3. **Card destacada**: Antes de desaparecer del Kanban, la card brilla/pulsa brevemente

### Activity Feed Mejorado

**Filtros (tabs o dropdown):**
- Todos | Completados | Mis Menciones

**Card de tarea completada:**
- Avatar + "X completó [tarea]"
- Notas de cierre visibles (si las hay)
- Links como chips clickeables
- Menciones resaltadas con color

**Card de mención:**
- Avatar + "X te mencionó en [tarea]"
- Contexto de las notas donde aparece la mención

---

## Edge Cases

### Backlog
- **Lista vacía**: Mensaje "No hay tareas en el backlog. ¡Crea una nueva!"
- **Intenta marcar 2da crítica**: Toast error + no permite
- **Drag & drop**: Solo reordena visualmente, no persiste (refresh vuelve al orden por fecha/crítica)

### Modal Completar
- **Cierra sin guardar**: Pregunta confirmación si hay contenido escrito
- **Link inválido**: Validación básica de URL, muestra error inline
- **@mención inválida**: Solo muestra usuarios existentes en dropdown
- **Error de servidor**: Toast error, modal no cierra, puede reintentar

### Activity
- **Sin menciones**: Mensaje "No tienes menciones todavía"
- **Sin completados**: Mensaje "No hay tareas completadas todavía"

---

## Alcance

### MVP (Esta iteración)
- ✅ Backlog funcional con lista de tareas
- ✅ Toggle de prioridad crítica (1 por persona)
- ✅ Drag & drop visual en backlog (sin persistir orden)
- ✅ Modal de completar con notas + links + @menciones
- ✅ Confetti + sonido al completar
- ✅ Card destacada temporal antes de desaparecer
- ✅ Activity feed con filtros (Todos/Completados/Mis Menciones)
- ✅ Toast de notificación a todos cuando se completa tarea

### Diferido (Futuro)
- ❌ Proyectos (separación de tareas por proyecto)
- ❌ Regla de 1 crítica POR PROYECTO (requiere proyectos)
- ❌ Subir archivos (requiere storage externo)
- ❌ Notificaciones push/email externas
- ❌ Persistir orden del backlog en DB
- ❌ Fechas de vencimiento/deadlines

---

## Modelo de Datos (Cambios)

### Tabla `tasks` - Agregar campos:
```sql
is_critical: boolean DEFAULT false
completed_at: timestamp NULL
completion_notes: text NULL
completion_links: jsonb NULL  -- ["url1", "url2"]
completion_mentions: jsonb NULL  -- ["user_id_1", "user_id_2"]
```

### Tabla `activity` - Nuevos tipos de action:
```sql
-- Agregar a activityActionEnum:
'completed'  -- Cuando se completa con el modal
'mentioned'  -- Cuando alguien es mencionado
```

---

## Éxito

Sabremos que funcionó bien cuando:
1. **Mejor visibilidad**: El equipo deja de preguntar "¿cómo va X?" porque ven el progreso en el activity feed
2. **Más tareas completadas**: El flujo satisfactorio (confetti, cierre limpio) motiva a cerrar tareas
3. **Uso de menciones**: El equipo usa @menciones para dar contexto y seguimiento

---

## Notas de la Entrevista

### Decisiones tomadas:
- **Fechas**: No se implementan deadlines, solo fecha de creación existente
- **Prioridad**: Simplificado a toggle crítico (sí/no) en vez de múltiples niveles
- **Orden backlog**: Visual con drag & drop pero no persiste - el orden "real" es críticas primero + fecha
- **Adjuntos**: Solo links/URLs por limitaciones de Neon (no storage de archivos)
- **Notas**: Siempre opcionales para no bloquear flujo rápido
- **Proyectos**: Diferido para siguiente iteración

### Trade-offs aceptados:
- El orden del backlog no persiste para simplificar (se puede agregar después)
- Sin notificaciones externas (email/push) - solo dentro de la app
- Una sola tarea crítica global (cuando haya proyectos será por proyecto)
