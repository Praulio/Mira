# Feature: Sistema de Notificaciones

## Visión
Los usuarios de Mira necesitan enterarse cuando les asignan una tarea o los mencionan, sin tener que estar revisando manualmente. Este feature agrega notificaciones in-app (campana con popover) y por email (SMTP/Gmail) para dos eventos clave: asignación de tareas y menciones de usuarios.

## Flujo del Usuario

### Notificación por Asignación de Tarea
1. Usuario A crea o edita una tarea y asigna a Usuario B (distinto de sí mismo)
2. El sistema crea un registro de notificación in-app para Usuario B
3. El sistema envía un email a Usuario B con el título de la tarea y un enlace directo (`/task/{id}`)
4. Usuario B ve el badge numérico en la campana incrementarse (próximo polling de 30s)
5. Usuario B abre el popover, ve la notificación: "{Usuario A} te asignó la tarea: {título}"
6. Usuario B hace clic en la notificación → se marca como leída y navega a la tarea

### Notificación por Mención (@usuario)
1. Usuario A escribe `@` en la descripción de una tarea o al completar una tarea
2. Aparece autocomplete dropdown con usuarios del equipo filtrados
3. Selecciona Usuario B, se inserta la mención
4. Al guardar, el sistema detecta las menciones y crea notificación in-app para cada mencionado
5. Usuario B ve en su campana: "{Usuario A} te mencionó en la tarea: {título}"
6. Clic en la notificación → marca como leída y navega a la tarea

## UI/UX

### Ícono de Campana
- Ubicación: header del dashboard, a la izquierda del `UserButton` de Clerk
- Ícono: `Bell` de lucide-react
- Badge: número exacto de notificaciones no leídas (rojo, circular)
- Sin notificaciones no leídas: campana sin badge

### Popover de Notificaciones
- Se abre al hacer clic en la campana (dropdown hacia abajo, alineado a la derecha)
- Lista scrollable de notificaciones (máximo visible ~5, scroll para más)
- Cada card de notificación muestra:
  - Avatar del usuario que originó la acción
  - Texto descriptivo (quién hizo qué en qué tarea)
  - Tiempo relativo ("hace 5 min", "hace 2 horas")
  - Indicador visual de leída/no leída (fondo sutil diferente o dot)
- Clic en una notificación: marca como leída + navega a la tarea
- Sin opción de eliminar, solo leer/no leer
- Estado vacío: "No tienes notificaciones"

### Autocomplete de Menciones (@)
- Se activa al escribir `@` en el textarea de descripción o notas de completar tarea
- Dropdown flotante posicionado bajo el cursor/texto
- Filtra usuarios del equipo conforme se escribe
- Muestra avatar + nombre de cada usuario
- Al seleccionar, inserta `@NombreUsuario` (visible como texto destacado)
- El sistema parsea las menciones al guardar para extraer los user IDs

### Email de Notificación
- Formato: texto plano (sin HTML con branding)
- Contenido para asignación:
  ```
  Hola {nombre},

  {nombre_asignador} te asignó la tarea "{título}" en Mira.

  Ver tarea: {url_base}/task/{task_id}

  — Mira
  ```
- Solo se envía email para asignaciones de tarea, NO para menciones

## Edge Cases
- **Auto-asignación**: Si el usuario se asigna a sí mismo, NO se genera notificación
- **Reasignación**: Si una tarea ya asignada a B se reasigna a C, solo C recibe notificación
- **Múltiples menciones**: Si mencionan al mismo usuario varias veces en un texto, solo una notificación
- **Usuario sin email**: No debería pasar (Clerk requiere email), pero si ocurre, skip email silenciosamente
- **SMTP caído**: El envío de email no debe bloquear la acción principal. Si falla, log del error y continuar
- **Usuario desconectado**: Las notificaciones se persisten en DB y aparecen al volver a entrar (sin límite de tiempo)
- **Mención a sí mismo**: Si un usuario se menciona a sí mismo, NO generar notificación

## Alcance

### MVP (Primera versión)
- Tabla `notifications` en DB (tipo, userId, taskId, leída, timestamp)
- Campana con badge numérico en header
- Popover con lista de notificaciones
- Marcar como leída al hacer clic
- Notificación in-app por asignación de tarea
- Notificación in-app por mención
- Email por asignación de tarea (Nodemailer + Gmail SMTP)
- Autocomplete de `@menciones` en descripción de tarea
- Polling cada 30s para actualizar badge

### Diferido (Futuro)
- Notificaciones push del navegador (Web Push API)
- Email por menciones
- Preferencias de notificación por usuario (activar/desactivar tipos)
- Notificación cuando cambia el status de una tarea asignada a ti
- Sistema de comentarios en tareas con menciones
- Tiempo real via SSE/WebSocket en lugar de polling
- Template HTML con branding para emails

## Éxito
- Un usuario asignado a una tarea recibe la notificación in-app en menos de 30 segundos
- El email de asignación llega al correo del usuario
- El enlace del email abre Mira en la tarea correcta
- Las menciones generan notificación in-app al usuario mencionado
- El badge se actualiza correctamente al marcar notificaciones como leídas
- No se generan notificaciones duplicadas ni auto-notificaciones

## Notas de la Entrevista
- **Badge**: Número exacto (no dot, no cap en 9+)
- **Panel**: Dropdown/popover, no página dedicada ni sidebar
- **Actualización**: Polling 30s (reutilizar patrón existente de team-view-auto-refresh)
- **Email service**: Nodemailer con Gmail App Password
- **Mark as read**: Clic individual en cada notificación (no auto al abrir, no "marcar todas")
- **Persistencia**: Sin límite temporal, todas las notificaciones se acumulan
- **Email style**: Texto plano, sin HTML elaborado
- **Menciones**: Expandir a descripción de tarea + completar tarea (actualmente solo completar)
- **Autocomplete**: Sí, dropdown al escribir @ con usuarios del equipo
- **Eliminar notificaciones**: No, solo marcar como leída/no leída
- **SMTP config**: Gmail App Password con variables de entorno específicas (SMTP_USER, SMTP_PASS)
