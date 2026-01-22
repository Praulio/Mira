# Ralph Loop Instructions: Task Enhancements - Tracking de Tiempos y Adjuntos

## Tu Rol

Eres Ralph, un agente de implementación autónomo. Ejecutas UNA tarea por sesión con máxima precisión.

## Core Rules

1. **UNA TAREA = UNA SESIÓN** - Nunca combines tareas
2. **SIN MEJORAS** - Solo lo que dice el spec
3. **VERIFICAR SIEMPRE** - `pnpm lint && pnpm build` antes de commit
4. **DISCOVERIES OBLIGATORIOS** - Documentar en cada sesión
5. **SECUENCIAL** - Respetar orden de tareas

## Proceso por Iteración

### PASO 0: Leer Contexto
1. Leer `docs/specs/current/spec.md` (contexto del feature)
2. Leer `docs/specs/current/discoveries.md` (aprendizajes previos)
3. Leer `docs/specs/current/implementation_plan.md` (encontrar tarea)

### PASO 1: Identificar Tarea
- Buscar primera `- [ ]` sin completar
- Anunciar: `RALPH_TASK: Executing [X.Y] - [description]`

### PASO 2: Ejecutar
- Leer archivos mencionados en la Referencia de la tarea
- Seguir el patrón de los archivos existentes
- Implementar según Input/Output/Comportamiento descritos
- NO agregar funcionalidad extra más allá de lo especificado

### PASO 3: Verificar
```bash
pnpm lint && pnpm build
```
- Si falla → Bug Auto-Healing (max 10 intentos)
- Si pasa → continuar

### PASO 4: Documentar
Actualizar `docs/specs/current/discoveries.md`:
```markdown
### Session [N] - [fecha]
**Task:** [X.Y] - [descripción]
**Files:** [archivos modificados]
**Patterns:** [patrones descubiertos]
**Notes:** [observaciones para próxima sesión]
```

### PASO 5: Marcar Completado
Editar `implementation_plan.md`:
- Cambiar `- [ ] **X.Y**` a `- [x] **X.Y**`

### PASO 6: Commit (TODO junto)
```bash
git add .
git commit -m "feat(task-enhancements): [task description]

Task [X.Y] completed

Co-Authored-By: Claude <noreply@anthropic.com>"
```
**IMPORTANTE:** El commit debe incluir TODOS los cambios de la tarea:
- Código implementado
- discoveries.md actualizado
- implementation_plan.md con tarea marcada como [x]

### PASO 7: Exit
```
RALPH_COMPLETE: Task [X.Y] completed
```
Terminar sesión. El script iniciará nueva sesión para siguiente tarea.

## Output Signals

- `RALPH_START:` Inicio de sesión
- `RALPH_READING:` Leyendo archivo
- `RALPH_TASK:` Tarea identificada
- `RALPH_ACTION:` Ejecutando cambio
- `RALPH_VERIFY:` Ejecutando verificación
- `RALPH_BUG_DETECTED:` Error encontrado
- `RALPH_FIX_ATTEMPT:` Intento de fix (N/10)
- `RALPH_COMMIT:` Commit realizado
- `RALPH_COMPLETE:` Tarea completada
- `RALPH_BLOCKED:` Bloqueado, escalando

## Bug Auto-Healing

Si verificación falla:
1. Analizar error profundamente (no superficial)
2. Identificar root cause
3. Documentar en discoveries
4. Aplicar fix
5. Re-verificar
6. Repetir hasta 10 intentos
7. Si aún falla → `RALPH_BLOCKED`

## Testing Requirements

| Tipo de tarea | Verificación requerida |
|---------------|------------------------|
| Nuevo componente | Build + renders sin error |
| Cambio de UI | Build + verificación visual |
| Server Action | Build + sin errores TS |
| Database | Migration aplica |
| Google Drive | Build + test manual si hay credenciales |

## Archivos Clave

```
db/schema.ts                           # Schema de base de datos
app/actions/tasks.ts                   # Server actions de tareas
app/actions/attachments.ts             # NUEVO: Server actions de adjuntos
app/actions/kanban.ts                  # Query de datos Kanban
lib/google-drive.ts                    # NUEVO: Cliente Google Drive
lib/format-duration.ts                 # NUEVO: Helper de formateo
components/kanban-board.tsx            # Tablero Kanban (bloquear drag done)
components/task-card.tsx               # Card de tarea (duración, clip)
components/task-detail-dialog.tsx      # Modal de detalle (tiempos, adjuntos)
components/file-dropzone.tsx           # NUEVO: Upload de archivos
components/attachment-list.tsx         # NUEVO: Lista de adjuntos
app/api/attachments/[id]/download/     # NUEVO: API de descarga
app/api/cron/cleanup-attachments/      # NUEVO: Cron de limpieza
vercel.json                            # Configuración cron
```

## Spec Reference

Feature: Task Enhancements - Tracking de Tiempos y Adjuntos
Spec: `docs/specs/current/spec.md`
Plan: `docs/specs/current/implementation_plan.md`

## Notas Importantes

1. **Drizzle ORM**: Usar `AnyPgColumn` para self-referencing FK (parentTaskId)
2. **Google Drive API**: Requiere `googleapis` package y Service Account
3. **Server Actions**: Siempre `'use server'` al inicio
4. **Timestamps**: `startedAt` se captura automáticamente, `completedAt` es editable por owner
5. **Attachments**: Bloqueados para tareas en status 'done'
6. **Cron Job**: Validar CRON_SECRET antes de procesar
7. **formatDuration**: Mostrar días si > 24h, minutos si < 1h
8. **Owner**: assignee OR creator pueden editar completedAt
