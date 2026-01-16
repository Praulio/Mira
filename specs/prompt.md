# Prompt para Implementación de Midnight Premium Dark Mode

> **Instrucciones para la IA que ejecutará el bucle de implementación**

---

## ⛔ STOP - LEE ESTO PRIMERO (REGLA INQUEBRANTABLE)

```
╔══════════════════════════════════════════════════════════════════╗
║  UNA TAREA = UN LOOP COMPLETO = FIN DE LA SESIÓN                ║
║                                                                  ║
║  Después del commit atómico, la sesión DEBE TERMINAR.           ║
║  NO continúes con la siguiente tarea.                           ║
║  El usuario reiniciará una sesión fresca para la siguiente.     ║
╚══════════════════════════════════════════════════════════════════╝
```

### ¿Por qué esta regla existe?

1. **Compactación mata la precisión**: Cuando haces múltiples tareas, tu ventana de contexto se llena. Para ahorrar espacio, aplicas una "función de pérdida" que resume lo que hiciste. En ese resumen **pierdes el PIN** (tu marco de referencia) y empiezas a inventar o ignorar especificaciones.

2. **Fresh contexts = 100% precisión**: Cada sesión fresca tiene acceso completo al PIN sin resúmenes.

3. **Economía**: Este flujo granular cuesta ~$10/hora pero produce código correcto.

### Flujo obligatorio de cada sesión:

```
┌─────────────────────────────────────────────────────────────┐
│  1. Leer PIN (specs/README.md)                              │
│  2. Leer memoria (specs/discoveries.md)                     │
│  3. Identificar UNA tarea pendiente del plan                │
│  4. Ejecutar SOLO esa tarea                                 │
│  5. Verificar (lint + build)                                │
│  6. Actualizar discoveries.md (OBLIGATORIO)                 │
│  7. Commit atómico (código + plan + discoveries en UNO)     │
│  8. ⛔ TERMINAR LA SESIÓN                                   │
│                                                             │
│  ❌ NO continuar con la siguiente tarea                     │
│  ❌ NO "aprovechar" para hacer una más                      │
│  ❌ NO agrupar tareas "porque son pequeñas"                 │
│  ❌ NO hacer commits separados para código y plan           │
└─────────────────────────────────────────────────────────────┘
```

---

## Contexto

Estás implementando **Midnight Premium Dark Mode**, un sistema de dark mode completo con glassmorphism premium para Mira.

**Diferencias clave vs light mode actual:**

| Aspecto | Light Mode | Midnight Premium |
|---------|------------|------------------|
| Background | Blanco/light | Deep black con gradientes radiales |
| Glassmorphism | Blur moderado | Blur intenso (40-80px) |
| Active States | Border subtle | Multi-layer glow effects con pulse |
| Typography | Dark text | Near-white con gradient headers |
| Animations | Fade-in básico | Staggered reveals + rotating rings |

## Documentos de Referencia

Antes de empezar, estudia estos archivos:

1. **Lookup table**: `specs/README.md`
2. **Especificación completa**: `specs/midnight-dark-mode.md`
3. **Plan de implementación**: `specs/implementation_plan.md`
4. **Memoria entre sesiones**: `specs/discoveries.md`

## Tu Bucle de Trabajo

### 0. Estudiar el PIN y Discoveries (SIEMPRE)

```bash
cat specs/README.md
cat specs/discoveries.md
```

### 1. Identificar UNA SOLA Tarea

```bash
cat specs/implementation_plan.md | grep -E "^\- \[ \]" | head -1
```

### 2. Ejecutar SOLO Esa Tarea

- Lee los archivos de referencia indicados
- Implementa los cambios necesarios
- Sigue los patrones del spec (sección 1-5 de midnight-dark-mode.md)
- **NO te desvíes** a otras tareas

### 3. Verificar Calidad

```bash
pnpm lint && pnpm build
```

**Importante**: Para este feature NO necesitas ejecutar tests E2E. El testing es manual visual.

### 4. Testing (Cuando la Tarea lo Requiera)

| Tipo de Tarea | Testing Requerido |
|---------------|-------------------|
| Variables CSS | `pnpm lint && pnpm build` |
| Animaciones/keyframes | Lint + Build |
| Component updates | Lint + Build + Verificación manual visual |
| Tarea 8.1 (Testing) | Navegación manual + Screenshots |

### 4.5 CHECKPOINT: Actualizar Discoveries (OBLIGATORIO)

```
╔══════════════════════════════════════════════════════════════════╗
║  ⛔ NO PUEDES hacer commit sin completar este paso.              ║
║                                                                  ║
║  Esto es "back pressure" - DEBES escribir algo antes de avanzar. ║
╚══════════════════════════════════════════════════════════════════╝
```

**Qué documentar en discoveries.md:**

- **Patrones descubiertos**: Si encontraste un patrón reutilizable de CSS o componente
- **Problemas resueltos**: Si tuviste un bug o comportamiento inesperado con Tailwind/OKLch
- **Notas de sesión**: Mínimo una línea sobre lo que hiciste

### ⛔ REGLA DE HONESTIDAD (CRÍTICO)

```
╔══════════════════════════════════════════════════════════════════╗
║  Si documentas que algo NO fue testado, NO puedes marcarlo [x]   ║
║                                                                  ║
║  ❌ PROHIBIDO: "Quick edit no testado" + marcar tarea [x]        ║
║  ✅ CORRECTO:  "Quick edit no testado" + dejar tarea [ ]         ║
╚══════════════════════════════════════════════════════════════════╝
```

### 5. Commit Atómico

Marca la tarea como [x] en `specs/implementation_plan.md` SOLO si verificaste que funciona.

```bash
git add <archivos-de-código> specs/implementation_plan.md specs/discoveries.md
git commit -m "feat(dark-mode): [tarea id] descripción breve

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
```

**Ejemplo de mensaje:**
```
feat(dark-mode): 1.1 actualizar variables OKLch en globals.css

Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>
```

### 6. ⛔ TERMINAR LA SESIÓN

```
╔════════════════════════════════════════════════════════════╗
║  ALTO. Tu trabajo en esta sesión ha terminado.             ║
║                                                            ║
║  NO continues con la siguiente tarea.                      ║
║  Notifica que completaste la tarea X.X                     ║
╚════════════════════════════════════════════════════════════╝
```

---

## Reglas de Output (Para Logs y Monitoreo)

```
RALPH_START: Iniciando sesión - Tarea objetivo: X.X
RALPH_ACTION: [descripción de lo que vas a hacer]
RALPH_RESULT: [resultado resumido]
RALPH_COMMIT: [hash corto] - [mensaje del commit]
RALPH_COMPLETE: Tarea X.X completada. Siguiente: X.Y
```

---

## Archivos Clave por Fase

### Para Fase 1 (Variables CSS)
```
Referencia: specs/midnight-dark-mode.md sección 1
Archivo: app/globals.css
```

### Para Fase 2 (Background System)
```
Referencia: specs/midnight-dark-mode.md sección 2
Archivo: app/globals.css
```

### Para Fase 3 (Team Slot)
```
Referencia: specs/midnight-dark-mode.md sección 3 (Team Slot)
Archivos:
  - app/globals.css (keyframes)
  - components/team-slot.tsx
```

### Para Fase 4 (Task Card)
```
Referencia: specs/midnight-dark-mode.md sección 3 (Task Card)
Archivo: components/task-card.tsx
```

### Para Fase 5 (Kanban)
```
Referencia: specs/midnight-dark-mode.md sección 3 (Kanban Column)
Archivo: components/kanban-column.tsx
```

### Para Fase 6 (Typography)
```
Referencia: specs/midnight-dark-mode.md sección 4
Archivos:
  - app/globals.css (clase .dashboard-title)
  - app/(dashboard)/dashboard/page.tsx
```

### Para Fase 7 (Animations)
```
Referencia: specs/midnight-dark-mode.md sección 5
Archivos:
  - app/globals.css (keyframes fade-in-up)
  - app/(dashboard)/dashboard/page.tsx
```

### Para Fase 8 (Testing)
```
Navegación manual en Chrome
Screenshots para documentación
```

---

## Notas Técnicas Importantes

### OKLch Colors
- Formato: `oklch(lightness chroma hue [/ alpha])`
- Lightness: 0-1 (0.12 = muy oscuro, 0.95 = casi blanco)
- Chroma: 0-0.4 (intensity de color)
- Hue: 0-360 (grados en círculo cromático)

### Tailwind v4
- Usa `@theme` inline en CSS
- Variables CSS funcionan nativamente
- `backdrop-filter` puede necesitar `-webkit-backdrop-filter`

### Glassmorphism
- 3 niveles: glass-dark (40px blur), glass-medium (60px), glass-light (80px)
- Siempre combinar: background semi-transparent + backdrop-filter + border sutil

### Animations
- CSS puro, no JavaScript
- Usar `animation-delay` para staggering
- `cubic-bezier(0.4, 0, 0.2, 1)` para easing suave

---

## ¡Comienza!

1. Lee `specs/README.md` (PIN) y `specs/discoveries.md`
2. Encuentra la **primera tarea donde `- [ ]`** (pendiente)
3. Ejecuta SOLO esa tarea
4. Actualiza `specs/discoveries.md` (paso 4.5)
5. Commit atómico (código + plan + discoveries)
6. **TERMINAR SESIÓN**

```bash
cat specs/README.md
cat specs/discoveries.md
grep -n "^\- \[ \]" specs/implementation_plan.md | head -1
```
