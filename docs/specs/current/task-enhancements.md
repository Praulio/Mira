# Feature: Task Enhancements - Tracking de Tiempos y Adjuntos

## Visión

Mejorar el sistema de tareas del Kanban de Mira para permitir:
1. **Tracking de duración**: Calcular automáticamente cuánto tiempo toma completar cada tarea (desde In Progress hasta Done)
2. **Archivos adjuntos**: Permitir subir archivos a las tareas con almacenamiento temporal en Google Drive

Esto permite a los equipos medir productividad real y centralizar archivos de trabajo durante la ejecución de tareas.

## Feature 1: Tracking de Tiempos

### Flujo del Usuario

1. Usuario crea tarea → se registra `createdAt` (ya existe)
2. Usuario arrastra tarea a "In Progress" → se registra `startedAt` automáticamente
3. Usuario trabaja en la tarea, puede ver duración en tiempo real
4. Usuario completa la tarea (drag a Done, botón "Completar", o editar endTime) → se registra `completedAt`
5. Sistema calcula duración: `completedAt - startedAt`
6. Duración visible en card del Kanban y en modal de detalle

### UI/UX

**En el Task Card (Kanban):**
- Mostrar duración resumida cuando la tarea está en Done (ej: "2h 30m")
- Mientras está en In Progress, mostrar tiempo transcurrido en vivo

**En el Task Detail Modal:**
- Mostrar `startedAt` (cuando pasó a In Progress) - solo lectura
- Mostrar `completedAt` (fecha/hora de término) - **editable solo por el owner de la tarea**
- Mostrar duración calculada prominentemente
- Date/time picker para editar `completedAt`

### Reglas de Negocio

1. `startedAt` se captura automáticamente al mover a "In Progress"
2. `completedAt` se captura automáticamente al completar, pero es editable después
3. **Solo el assignee/owner puede editar el `completedAt` de sus propias tareas**
4. Si una tarea completada necesita más trabajo → crear nueva tarea con campo `parentTaskId` referenciando la tarea original (thread de tareas)
5. No se permite mover tareas de Done hacia atrás

### Campos Nuevos en DB

```
startedAt: timestamp (nullable) - cuando pasó a In Progress
completedAt: timestamp (nullable) - cuando se completó (editable)
parentTaskId: uuid (nullable) - referencia a tarea padre si es derivada
```

### Edge Cases

- **Tarea creada directamente en In Progress**: `startedAt` = `createdAt`
- **Tarea movida de In Progress a Todo y luego de vuelta**: Se sobrescribe `startedAt` con el nuevo timestamp
- **Tarea completada sin pasar por In Progress**: `startedAt` = `completedAt` (duración = 0)
- **Usuario quiere reabrir tarea completada**: No permitido, debe crear tarea derivada con `parentTaskId`

---

## Feature 2: Archivos Adjuntos

### Flujo del Usuario

1. Usuario abre modal de tarea (en cualquier estado excepto Done)
2. Usuario hace clic en "Agregar adjunto" o arrastra archivos
3. Archivos se suben a Google Drive en carpeta `Mira/tasks/{taskId}/`
4. Usuario ve miniaturas de archivos en el modal
5. Usuario puede descargar individualmente o "Descargar todos"
6. Usuario puede eliminar adjuntos mientras la tarea está activa
7. Al completar la tarea, los adjuntos permanecen 3 días y luego se eliminan automáticamente

### UI/UX

**En el Task Card (Kanban):**
- Icono de clip (📎) si la tarea tiene adjuntos
- Opcional: badge con cantidad de adjuntos

**En el Task Detail Modal:**
- Sección "Adjuntos" con:
  - Área de drop zone para arrastrar archivos
  - Botón "Agregar archivos"
  - Grid de miniaturas (thumbnails para imágenes, iconos para docs/videos)
  - Botón "Descargar todos" (zip)
  - Cada archivo: miniatura + nombre + botón eliminar
- Clic en miniatura → abre preview en pantalla completa (lightbox)

**Estados visuales:**
- Subiendo: progress bar por archivo
- Error: mensaje de error con opción de reintentar
- Vacío: mensaje "Arrastra archivos aquí o haz clic para agregar"

### Tipos de Archivo Soportados

**Imágenes:** jpg, jpeg, png, gif, webp, svg
**Videos:** mp4, mov, avi, webm
**Documentos:** pdf, doc, docx, xls, xlsx, ppt, pptx, txt, md

### Almacenamiento - Google Drive

**Estructura de carpetas:**
```
Google Drive/
└── Mira/
    └── tasks/
        └── {taskId}/
            ├── archivo1.pdf
            ├── imagen.png
            └── video.mp4
```

**Integración:**
- Usar Google Drive API con Service Account
- Carpeta compartida configurada en variables de entorno
- Crear carpeta por tarea al subir primer archivo
- Eliminar carpeta completa 3 días después de `completedAt`

### Reglas de Negocio

1. Sin límite de cantidad o tamaño de archivos
2. Adjuntos solo editables mientras tarea NO está en Done
3. Eliminación automática: `completedAt + 3 días`
4. Job programado (cron) para limpiar adjuntos expirados
5. Al eliminar tarea, eliminar carpeta de Drive inmediatamente

### Edge Cases

- **Falla de subida**: Mostrar error, permitir reintentar
- **Archivo duplicado**: Sobrescribir con confirmación
- **Tarea eliminada con adjuntos**: Eliminar carpeta de Drive inmediatamente
- **Google Drive no disponible**: Mostrar error, desactivar funcionalidad temporalmente
- **Usuario sin permisos de Drive**: Configurar Service Account con acceso

---

## Alcance

### MVP (Esta iteración)

**Tracking de Tiempos:**
- [x] Campos `startedAt`, `completedAt`, `parentTaskId` en DB
- [x] Captura automática de `startedAt` al mover a In Progress
- [x] Captura automática de `completedAt` al completar
- [x] Edición de `completedAt` (solo owner)
- [x] Mostrar duración en card y modal
- [x] Bloquear movimiento de Done hacia atrás
- [x] Crear tarea derivada con `parentTaskId`

**Adjuntos:**
- [x] Integración Google Drive API
- [x] Subida de archivos desde modal
- [x] Visualización de miniaturas
- [x] Descarga individual y "Descargar todos"
- [x] Eliminación de adjuntos
- [x] Icono de clip en cards
- [x] Preview en lightbox
- [x] Cron job para limpieza automática (completedAt + 3 días)

### Diferido (Futuro)

- Tracking completo por fase: `stagingTime` (backlog→todo), `workingTime` (todo→in_progress)
- Reportes/analytics de tiempos por usuario/proyecto
- Versionado de adjuntos
- Comentarios en adjuntos
- Integración con otros providers (S3, Dropbox)

---

## Éxito

El feature funciona bien cuando:
1. Las duraciones de tareas se calculan correctamente y son visibles
2. Los usuarios pueden subir/descargar archivos sin fricción
3. Los adjuntos se eliminan automáticamente después de 3 días de completada la tarea
4. Solo el owner puede editar el `completedAt` de sus tareas
5. El sistema de tareas derivadas permite seguir threads de trabajo

---

## Notas de la Entrevista

**Decisiones tomadas:**
- Google Drive como storage por preferencia del cliente (carpeta compartida existente)
- Sin límites de tamaño/cantidad para flexibilidad operativa
- Eliminación automática a los 3 días sin advertencia (usuario ya lo sabe)
- Tareas derivadas en lugar de "reabrir" para mantener historial limpio
- Tracking simplificado (startedAt → completedAt) como MVP, tracking completo por fases es futuro

**Consideraciones técnicas:**
- Google Drive API requiere Service Account y folder ID compartido
- Necesario cron job o similar para limpieza de adjuntos expirados
- El campo `parentTaskId` permite construir árbol de tareas relacionadas

**Trade-offs:**
- Sin versionado de archivos para simplificar MVP
- Preview de video puede requerir transcodificación futura
- Cálculo de duración simple (no considera pausas o cambios de estado intermedios)
