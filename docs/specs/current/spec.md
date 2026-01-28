# Feature: Sistema de Notificaciones

## Visión
Los usuarios de Mira necesitan enterarse cuando les asignan una tarea o los mencionan, sin tener que estar revisando manualmente. Este feature agrega notificaciones in-app (campana con popover) y por email (SMTP/Gmail) para dos eventos clave: asignación de tareas y menciones de usuarios.

## Flujo del Usuario

### Notificación por Asignación de Tarea
1. Usuario A crea o edita una tarea y asigna a Usuario B (distinto de sí mismo)
2. El sistema crea un registro de notificación in-app para Usuario B
3. El sistema envía un email a Usuario B con el título de la tarea y un enlace directo
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
- Ubicación: header del dashboard, a la izquierda del UserButton de Clerk
- Ícono: Bell de lucide-react
- Badge: número exacto de notificaciones no leídas (rojo, circular)
- Sin notificaciones no leídas: campana sin badge

### Popover de Notificaciones
- Dropdown/popover al hacer clic en la campana (alineado a la derecha)
- Lista scrollable (~5 visibles, scroll para más, limit 50)
- Cada card: avatar del actor, texto descriptivo, tiempo relativo, dot de no leída
- Clic en notificación: marca como leída + navega a la tarea
- Sin opción de eliminar, solo leer/no leer
- Estado vacío: "No tienes notificaciones"

### Email de Notificación
- Formato: texto plano
- Solo se envía email para asignaciones de tarea, NO para menciones
- Envío non-blocking con after() de Next.js

## Edge Cases
- Auto-asignación: NO genera notificación
- Reasignación: solo el nuevo asignado recibe notificación
- Múltiples menciones del mismo usuario: una sola notificación
- SMTP caído: no bloquea la acción principal, log del error
- Usuario desconectado: notificaciones persisten en DB sin límite temporal
- Mención a sí mismo: NO genera notificación
- Edición de descripción con menciones: solo notificar IDs nuevos (diff vs guardados)
- Task borrada: CASCADE delete elimina notificaciones asociadas

## Decisiones de la Entrevista
- Badge: número exacto
- Panel: dropdown/popover (no página dedicada)
- Actualización: polling 30s con pausa en tab inactivo
- Email: Nodemailer + Gmail App Password, texto plano
- Mark as read: clic individual
- Menciones: expandir a descripción + completar tarea (MentionInput ya existe)
- SMTP: GMAIL_USER + GMAIL_APP_PASSWORD env vars
