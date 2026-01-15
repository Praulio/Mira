# Ralph Loop - Sistema de Implementación Autónoma

> **Documento de referencia obligatorio** para cualquier sesión que trabaje con el Ralph Loop.
> Este documento explica qué es, cómo funciona, y cómo preparar sprints.

---

## Qué es el Ralph Loop

El Ralph Loop es un sistema de implementación autónoma que ejecuta Claude en un bucle infinito, donde cada iteración:

1. Lee una tarea pendiente del plan
2. La ejecuta
3. Hace commit
4. Termina la sesión
5. Repite con una sesión fresca

```
┌─────────────────────────────────────────────────────────────────┐
│                        RALPH LOOP                               │
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│   │ Tarea 1  │───▶│ Tarea 2  │───▶│ Tarea N  │───▶ DONE        │
│   │ Sesión 1 │    │ Sesión 2 │    │ Sesión N │                 │
│   └──────────┘    └──────────┘    └──────────┘                 │
│        │              │               │                         │
│        ▼              ▼               ▼                         │
│     Commit         Commit          Commit                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Por qué funciona así

| Problema | Solución del Ralph Loop |
|----------|-------------------------|
| Contexto se degrada con múltiples tareas | Una tarea = una sesión fresca |
| Claude pierde el "PIN" después de mucho trabajo | Cada sesión lee el PIN de nuevo |
| Commits grandes son difíciles de revisar | Commits atómicos (1 tarea = 1 commit) |
| Debugging caro si algo sale mal | Fallos aislados por tarea |

---

## Arquitectura de Archivos

```
specs/
├── README.md              # PIN - Lookup table del proyecto (SIEMPRE se lee)
├── prompt.md              # Instrucciones para Claude en cada iteración
├── prompt-template.md     # Template para crear prompt.md de nuevos features
├── implementation_plan.md # Lista de tareas con checkboxes [ ] y [x]
├── discoveries.md         # Memoria dinámica entre iteraciones (se limpia por feature)
└── [feature].md           # Spec completo del feature actual

docs/
├── ralph-loop.md          # Este documento
├── plans/                 # Specs y planes de features (temporal)
│   └── SPEC.md            # Spec maestro con múltiples features
└── solutions/             # Knowledge permanente (nunca borrar)
    └── workflows/         # Soluciones específicas de workflows

ralph-loop.sh              # Script bash que orquesta todo
ralph-log.txt              # Log de las iteraciones (no se commitea)
```

### Relación entre archivos

```
                    ┌─────────────────┐
                    │  ralph-loop.sh  │
                    │  (orquestador)  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  specs/prompt.md │◀──── Instrucciones para Claude
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌─────────────┐  ┌──────────────┐
     │ README.md  │  │ impl_plan.md│  │ discoveries  │
     │   (PIN)    │  │  (tareas)   │  │  (memoria)   │
     └────────────┘  └─────────────┘  └──────────────┘
```

---

## Flujo de una Iteración

```bash
# 1. ralph-loop.sh detecta tarea pendiente
grep -E "^- \[ \]" specs/implementation_plan.md | head -1

# 2. Pasa el prompt a Claude
cat specs/prompt.md | claude -p --dangerously-skip-permissions

# 3. Claude ejecuta internamente:
#    a) Lee specs/README.md (PIN)
#    b) Lee specs/discoveries.md (memoria)
#    c) Lee specs/implementation_plan.md (encuentra su tarea)
#    d) Ejecuta SOLO esa tarea
#    e) Actualiza discoveries.md si descubrió algo
#    f) Marca la tarea como [x] en el plan
#    g) Hace commit atómico
#    h) Termina la sesión

# 4. ralph-loop.sh espera 3s y repite
```

---

## Conceptos Clave

### 1. One Task = One Session

**Regla inquebrantable:** Cada sesión ejecuta exactamente UNA tarea del plan.

```
╔══════════════════════════════════════════════════════════════════╗
║  UNA TAREA = UN LOOP = UN COMMIT = FIN DE SESIÓN                ║
║                                                                  ║
║  ❌ NO continuar con la siguiente tarea                         ║
║  ❌ NO agrupar tareas "porque son pequeñas"                     ║
║  ❌ NO hacer commits separados para código y plan               ║
╚══════════════════════════════════════════════════════════════════╝
```

**Por qué:** La ventana de contexto de Claude se llena. Con múltiples tareas, aplica compresión y pierde precisión. Sesiones frescas = 100% del PIN disponible.

### 2. Strong Linkage (Memoria entre Vidas)

`specs/discoveries.md` es la memoria que persiste entre iteraciones:

```markdown
# Discoveries - [Feature Name]

## Patrones Descubiertos
### [Nombre del Patrón]
- **Archivo:** donde está el código
- **Qué:** descripción breve
- **Cuándo usarlo:** contexto
- **Ejemplo:** código mínimo

## Soluciones a Problemas
### [Nombre del Problema]
- **Síntoma:** qué se ve
- **Causa:** por qué pasa
- **Solución:** cómo arreglarlo

## Notas de Sesión
- **[fecha] (X.X):** descripción de lo que se hizo
```

**Lifecycle:**
- Se limpia manualmente al iniciar un nuevo feature
- Cada iteración DEBE escribir algo (back pressure)
- Patrones importantes se gradúan a `docs/solutions/`

### 3. Back Pressure

Antes de hacer commit, Claude DEBE actualizar discoveries.md:

```
╔══════════════════════════════════════════════════════════════════╗
║  ⛔ NO PUEDES hacer commit sin escribir en discoveries.md       ║
║                                                                  ║
║  Si descubriste algo → documentar el patrón                     ║
║  Si no descubriste nada → escribir nota de sesión               ║
╚══════════════════════════════════════════════════════════════════╝
```

### 4. Regla de Honestidad

```
╔══════════════════════════════════════════════════════════════════╗
║  Si documentas que algo NO fue testado, NO puedes marcarlo [x]   ║
║                                                                  ║
║  ❌ PROHIBIDO: "Quick edit no testado" + marcar tarea [x]        ║
║  ✅ CORRECTO:  "Quick edit no testado" + dejar tarea [ ]         ║
╚══════════════════════════════════════════════════════════════════╝
```

### 5. Compound Engineering

Después de completar un feature, los descubrimientos importantes se gradúan:

```
specs/discoveries.md (temporal)
        │
        ▼ Si tomó >5 min investigar
        │
docs/solutions/[categoria]/[solucion].md (permanente)
```

### 6. Bug Auto-Healing Loop (NUEVO)

```
╔══════════════════════════════════════════════════════════════════╗
║  ⛔ SI CLAUDE ENCUENTRA UN BUG DURANTE TESTING:                 ║
║                                                                  ║
║  1. NO marca la tarea como bloqueada inmediatamente             ║
║  2. Analiza el root cause profundamente                         ║
║  3. Fixea de manera inteligente (NO patches temporales)         ║
║  4. Re-testa hasta que funcione                                 ║
║  5. Documenta el bug + fix en discoveries.md                    ║
║                                                                  ║
║  Máximo: 10 reintentos. Si falla después de 10 → RALPH_BLOCKED  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Flujo de auto-healing:**

```
Bug detectado en testing E2E
        │
        ▼
┌───────────────────────────────────┐
│ 1. Análisis Profundo              │
│    - Console logs                 │
│    - Network requests             │
│    - DOM inspection               │
│    - Revisar código relacionado   │
└───────────┬───────────────────────┘
            ▼
┌───────────────────────────────────┐
│ 2. Fix Inteligente                │
│    ✅ Reutilizar patrones         │
│    ✅ Solución simple (KISS)      │
│    ❌ NO setTimeout/workarounds   │
└───────────┬───────────────────────┘
            ▼
┌───────────────────────────────────┐
│ 3. Re-Testing                     │
│    - pnpm lint && pnpm build      │
│    - Ejecutar E2E de nuevo        │
└───────────┬───────────────────────┘
            ▼
    ┌───────┴────────┐
    │                │
    ▼                ▼
¿Pasó?          ¿Intentos < 10?
  SÍ                 NO
  │                  │
  ▼                  ▼
Commit        RALPH_BLOCKED
+ Docs        (escalar)
```

**Ejemplo de documentación en discoveries.md:**

```markdown
## Bugs Encontrados y Resueltos

### Bug: Botón "Generar" no ejecuta acción

**Síntomas:**
- Botón muestra loading visual pero no dispara onClick
- Sin requests HTTP en network
- Sin logs en consola

**Root Cause:**
- Prop `isGenerating={generationStatus === "generating"}` incorrecta
- generationStatus nunca es "generating" (valores: idle|uploading|running)
- Variable correcta `isGenerating` ya existe (línea 96)

**Fix Aplicado:**
- Archivo: `app/game-days/page.tsx:635`
- Cambio: Usar variable `isGenerating` en lugar de comparación incorrecta
- Tipo: Prop incorrecta

**Intentos:** 1/10

**Lección aprendida:**
- Verificar valores posibles de estado antes de comparaciones
- Buscar variables ya definidas antes de crear lógica nueva
```

**Cuándo escalar a RALPH_BLOCKED:**

✅ **SÍ escalar si:**
- Intentaste 10 fixes diferentes con fundamento técnico
- Documentaste cada intento en discoveries.md
- Bug persiste después de análisis profundo

❌ **NO escalar si:**
- Solo intentaste 1-2 fixes
- No investigaste root cause profundamente
- Usaste patches temporales en lugar de fixes reales

**Detalles completos:** Ver `specs/prompt.md` sección 4.6

---

## Cómo Preparar un Nuevo Sprint

### Paso 1: Crear el Spec del Feature

Crear `specs/[feature].md` con:
- Objetivo del feature
- Flujo del usuario
- Diferencias vs features existentes
- Arquitectura técnica
- Criterios de aceptación

**Fuente:** Puede venir de `docs/plans/SPEC.md` o de una conversación con el usuario.

### Paso 2: Crear el Implementation Plan

Crear/actualizar `specs/implementation_plan.md` con tareas en fases:

```markdown
# Implementation Plan: [Feature]

## Tareas

### Fase 1: [Nombre] (X min)
- [ ] **1.1** Descripción de la tarea
  - Archivo: `path/al/archivo`
  - Cambio: qué hacer específicamente

### Fase 2: [Nombre] (X min)
- [ ] **2.1** ...
```

**Reglas:**
- Tareas atómicas (una cosa por tarea)
- Incluir paths de archivos
- Incluir qué cambiar específicamente
- Orden lógico de dependencias

### Paso 3: Actualizar el Prompt

Editar `specs/prompt.md`:

```markdown
# Prompt para Implementación de [Feature]

## Contexto
Estás implementando **[Feature]**, un [descripción breve].

## Documentos de Referencia
1. **Lookup table**: `specs/README.md`
2. **Especificación completa**: `specs/[feature].md`
3. **Plan de implementación**: `specs/implementation_plan.md`
```

### Paso 4: Limpiar Discoveries

Resetear `specs/discoveries.md`:

```markdown
# Discoveries - [Feature]

> Memoria dinámica entre iteraciones del Ralph Loop.

## Patrones Descubiertos
> Agrega aquí patrones reutilizables.

## Soluciones a Problemas
> Documenta soluciones no obvias.

## Notas de Sesión
- **[fecha]:** Inicio de [Feature].
```

### Paso 5: Actualizar el PIN

Agregar entrada en `specs/README.md`:

```markdown
## Índice de Specs

| Spec | Status | Archivo |
|------|--------|---------|
| [Feature] | 🟡 En Progreso | `specs/[feature].md` |
```

### Paso 6: Ejecutar el Loop

```bash
./ralph-loop.sh
```

---

## El Script ralph-loop.sh

### Qué hace

1. **Pre-cleanup:** Mata servidores existentes en puertos 3000-3010
2. **Inicia servidor:** `pnpm dev` en background
3. **Espera CSS:** 10 segundos para que Tailwind compile
4. **Inicia monitor:** Proceso que escucha `/tmp/ralph-restart-server`
5. **Loop principal:** Detecta tareas y ejecuta Claude

### Comandos importantes

```bash
# Iniciar el loop
./ralph-loop.sh

# Detener (limpieza automática)
Ctrl+C

# Monitorear en otra terminal
tail -f ralph-log.txt

# El agente puede reiniciar el servidor
echo "restart" > /tmp/ralph-restart-server
```

### Variables de entorno

El script no requiere variables especiales. Usa el entorno de desarrollo normal.

---

## Testing E2E con Playwright MCP

### Reglas para workflows

Los workflows necesitan **context assets** para funcionar. El Paso 1 carga imágenes de la carpeta activa.

**Flujo correcto:**
```
1. Navegar a biblioteca (home)
2. Entrar a subcarpeta con assets (ej: "Reels")
3. Click en botón "New Workflow" (morado) del sidebar
4. Seleccionar el workflow a testear
5. Verificar que Paso 1 muestra las imágenes
```

**Errores comunes:**
| Error | Causa | Solución |
|-------|-------|----------|
| "Sin assets disponibles" | Entraste directo al workflow | Entra via subcarpeta |
| "Sin assets disponibles" | Usaste el catálogo | Usa botón "New Workflow" |
| "Sin assets disponibles" | Falta registro en Supabase | Ejecutar SQL del template |

### Webhooks (ngrok)

Para que las generaciones funcionen en dev, ngrok debe estar corriendo:

```bash
ngrok http 3000 --domain=unspasmodic-concentratedly-annalee.ngrok-free.dev
```

**Nota:** El túnel debe estar activo. El dominio estático solo garantiza URL consistente.

---

## Registro de Workflows en Supabase

**CRÍTICO:** Los workflows necesitan registro en DB además del código.

```sql
-- 1. Crear template
INSERT INTO workflow_templates (
  id, slug, version, status, icon, tags, description, "schemaJson", "createdAt"
) VALUES (
  '[workflow]-v1', '[workflow]', '1.0.0', 'published', '🎨',
  ARRAY['[workflow]', 'marketing'], 'Descripción', '{}'::jsonb, NOW()
);

-- 2. Asignar a organización
INSERT INTO workflow_template_assignments (
  id, "templateId", "orgId", "isEnabled", "displayName", "category", "createdAt"
) VALUES (
  gen_random_uuid(), '[workflow]-v1', '<org-id>', true, 'Display Name', 'marketing', NOW()
);
```

Ver: `docs/solutions/workflows/workflow-supabase-registration.md`

---

## Troubleshooting

### El loop no avanza

**Síntoma:** La misma tarea aparece en múltiples iteraciones.

**Causas posibles:**
1. Claude no está marcando la tarea como [x]
2. Error en el commit
3. Claude se está bloqueando

**Solución:** Revisar `ralph-log.txt` para ver qué está pasando.

### UI roto en testing

**Síntoma:** CSS no carga, texto amontonado.

**Causa:** Next.js responde HTML antes de que Tailwind compile.

**Solución:**
```bash
# Esperar y reintentar
sleep 10

# O solicitar reinicio del servidor
echo "restart" > /tmp/ralph-restart-server
sleep 20
```

### Webhooks no funcionan

**Síntoma:** Generación se queda en "processing" forever.

**Causa:** ngrok no está corriendo.

**Solución:**
```bash
ngrok http 3000 --domain=unspasmodic-concentratedly-annalee.ngrok-free.dev
```

### Claude marca tareas como completadas sin testear

**Síntoma:** Plan dice [x] pero el feature no funciona.

**Causa:** Violación de la regla de honestidad.

**Solución:** La regla está en `specs/prompt.md`. Si persiste, reforzar en el prompt.

---

## Checklist para Nuevo Feature

```markdown
## Pre-Sprint
- [ ] Spec del feature existe (`specs/[feature].md`)
- [ ] Implementation plan creado (`specs/implementation_plan.md`)
- [ ] Prompt actualizado (`specs/prompt.md`)
- [ ] Discoveries limpio (`specs/discoveries.md`)
- [ ] README actualizado (`specs/README.md`)

## Durante Sprint
- [ ] `./ralph-loop.sh` corriendo
- [ ] ngrok activo (si hay generación de imágenes)
- [ ] Monitorear `ralph-log.txt`

## Post-Sprint
- [ ] Todas las tareas [x]
- [ ] Testing E2E completado
- [ ] Discoveries graduados a docs/solutions/
- [ ] discoveries.md limpio para siguiente feature
```

---

## Contenido Inicial de Archivos

Esta sección contiene los templates iniciales para configurar el Ralph Loop en un nuevo proyecto o feature.

### specs/README.md (Template del PIN)

El PIN (Project INdex) es la lookup table que Claude lee en CADA iteración. Debe contener:
- Información del feature actual
- Sinónimos de búsqueda
- Archivos relacionados
- Patrones descubiertos

```markdown
# Specs Lookup Table

Tabla de búsqueda para funcionalidades en desarrollo. Usa sinónimos y descriptores para mejorar la tasa de acierto en búsquedas.

---

## [Nombre del Feature]

| Campo | Valores |
|-------|---------|
| **Slug** | `[slug]` |
| **Nombres alternativos** | [Alias 1], [Alias 2], [Alias 3] |
| **Descripción corta** | [1 línea] |
| **Descripción larga** | [2-3 líneas con detalles técnicos] |
| **Categoría** | [tag1], [tag2], [tag3] |
| **Keywords** | [keyword1], [keyword2], ... |
| **Base técnica** | [De qué feature se deriva o "Nuevo"] |
| **Archivos principales** | `app/[slug]/page.tsx`, `prompts/[slug]/`, ... |
| **Template key** | `[slug]` |
| **Icono** | [Nombre del icono de lucide-react] |
| **Color** | [Hex color] |
| **Status** | 🟡 En Progreso |

### Sinónimos de búsqueda
- "[sinónimo 1]"
- "[sinónimo 2]"
- "[sinónimo 3]"

### Archivos relacionados
```
specs/[feature].md              # Especificación completa
specs/implementation_plan.md    # Plan de tareas
specs/prompt.md                 # Instrucciones para implementación
prompts/[slug]/                 # Prompts especializados
  ├── nanobanana-pro.md         # Prompt principal
  └── modes/
      └── [modo].md             # Variantes
app/[slug]/page.tsx             # Página principal
```

---

## Testing de Workflows (CRÍTICO)

> **Regla obligatoria:** Los workflows necesitan **context assets** para funcionar. Sin imágenes en el Paso 1, el flujo no puede avanzar.

### Cómo testear correctamente

1. **NO abrir** el workflow directamente (`/[slug]`)
2. **SÍ navegar** a: Biblioteca → Subcarpeta con assets → Abrir workflow

### Flujo de testing correcto

```
1. Navegar a biblioteca (home)
2. Entrar a subcarpeta con assets
3. Click en botón "New Workflow" del sidebar
4. Seleccionar el workflow a testear
5. Verificar que Paso 1 muestra las imágenes
6. Continuar con el flujo
```

---

## Patrones Descubiertos

> Esta sección se actualiza durante la implementación.

| Patrón | Descripción | Archivo/Ubicación |
|--------|-------------|-------------------|
| [Patrón 1] | [Descripción] | `[ruta/al/archivo]` |

---

## Índice de Specs

| Spec | Status | Archivo |
|------|--------|---------|
| [Feature] | 🟡 En Progreso | `specs/[feature].md` |
```

---

### specs/prompt.md (Template de Instrucciones)

Este archivo contiene las instrucciones que Claude recibe en CADA iteración del loop.

```markdown
# Prompt para Implementación de [Feature]

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
│  2. Cargar skill obligatorio (si aplica)                    │
│  3. Identificar UNA tarea pendiente del plan                │
│  4. Ejecutar SOLO esa tarea                                 │
│  5. Verificar (lint + build + Chrome si UI)                 │
│  6. Commit atómico (código + plan en UNO SOLO)              │
│  7. ⛔ TERMINAR LA SESIÓN                                   │
│                                                             │
│  ❌ NO continuar con la siguiente tarea                     │
│  ❌ NO "aprovechar" para hacer una más                      │
│  ❌ NO agrupar tareas "porque son pequeñas"                 │
│  ❌ NO hacer commits separados para código y plan           │
└─────────────────────────────────────────────────────────────┘
```

---

## Contexto

Estás implementando **[Feature]**, un [descripción breve del feature].

**Diferencias clave vs otros módulos:**

| Aspecto | Módulo Existente | [Feature] |
|---------|-----------------|-----------|
| [Aspecto 1] | [Valor existente] | **[Valor nuevo]** |
| [Aspecto 2] | [Valor existente] | **[Valor nuevo]** |

## Documentos de Referencia

Antes de empezar, estudia estos archivos:

1. **Lookup table**: `specs/README.md`
2. **Especificación completa**: `specs/[feature].md`
3. **Plan de implementación**: `specs/implementation_plan.md`

## Skill Obligatorio (si aplica)

**ANTES de escribir cualquier código, ejecuta:**
```
/[skill-name]
```

**NO implementes nada sin haber cargado este skill primero.**

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
- Sigue los patrones existentes en el codebase
- **NO te desvíes** a otras tareas

### 3. Verificar Calidad

```bash
pnpm lint && pnpm build
```

### 4. Testing (Cuando la Tarea lo Requiera)

| Tipo de Tarea | Testing Requerido |
|---------------|-------------------|
| Archivos de texto/config/prompts | `pnpm lint` es suficiente |
| Código backend/lógica | `pnpm lint && pnpm build` |
| UI/páginas/componentes | Playwright MCP |

### 4.5 CHECKPOINT: Actualizar Discoveries (OBLIGATORIO)

```
╔══════════════════════════════════════════════════════════════════╗
║  ⛔ NO PUEDES hacer commit sin completar este paso.              ║
║                                                                  ║
║  Esto es "back pressure" - DEBES escribir algo antes de avanzar. ║
╚══════════════════════════════════════════════════════════════════╝
```

### ⛔ REGLA DE HONESTIDAD (CRÍTICO)

```
╔══════════════════════════════════════════════════════════════════╗
║  Si documentas que algo NO fue testado, NO puedes marcarlo [x]   ║
║                                                                  ║
║  ❌ PROHIBIDO: "Quick edit no testado" + marcar tarea [x]        ║
║  ✅ CORRECTO:  "Quick edit no testado" + dejar tarea [ ]         ║
╚══════════════════════════════════════════════════════════════════╝
```

### 4.6 Bug Auto-Healing Loop

```
╔══════════════════════════════════════════════════════════════════╗
║  ⛔ SI ENCUENTRAS UN BUG DURANTE TESTING:                        ║
║                                                                  ║
║  1. NO marques la tarea como bloqueada inmediatamente           ║
║  2. Analiza el root cause profundamente                         ║
║  3. Fixea de manera inteligente (NO patches temporales)         ║
║  4. Re-testa hasta que funcione                                 ║
║  5. Documenta el bug + fix en discoveries.md                    ║
║                                                                  ║
║  Máximo: 10 reintentos. Si falla después de 10 → RALPH_BLOCKED  ║
╚══════════════════════════════════════════════════════════════════╝
```

### 5. Commit Atómico

```bash
git add <archivos-de-código> specs/implementation_plan.md specs/discoveries.md
git commit -m "<tipo>(<scope>): <descripción>

Co-Authored-By: Claude <noreply@anthropic.com>"
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

## Archivos Clave

### Para crear [componente 1]
```
# Referencia (LEER PRIMERO)
[ruta/referencia]

# Destino (CREAR)
[ruta/destino]
```

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
```

---

### specs/discoveries.md (Template de Memoria)

```markdown
# Discoveries - [Feature]

> Memoria dinámica entre iteraciones del Ralph Loop.
> Se limpia al iniciar un nuevo feature.

## Patrones Descubiertos

> Agrega aquí patrones reutilizables que descubras.

### [Nombre del Patrón]
- **Archivo:** `[ruta/al/archivo]`
- **Qué:** [descripción breve]
- **Cuándo usarlo:** [contexto]
- **Ejemplo:**
```typescript
// código mínimo
```

## Soluciones a Problemas

> Documenta soluciones no obvias.

### [Nombre del Problema]
- **Síntoma:** [qué se ve]
- **Causa:** [por qué pasa]
- **Solución:** [cómo arreglarlo]

## Bugs Encontrados y Resueltos

> Documenta bugs auto-resueltos durante testing.

## Notas de Sesión

- **[fecha] (X.X):** Inicio de [Feature].
```

---

### specs/implementation_plan.md (Template del Plan)

```markdown
# Implementation Plan: [Feature]

## Resumen
[1-2 líneas describiendo el objetivo]

## Tareas

### Fase 1: [Nombre de la Fase] (~X min)

- [ ] **1.1** [Descripción de la tarea]
  - Archivo: `[ruta/al/archivo]`
  - Cambio: [qué hacer específicamente]
  - Referencia: `[archivo de referencia]`

- [ ] **1.2** [Descripción de la tarea]
  - Archivo: `[ruta/al/archivo]`
  - Cambio: [qué hacer específicamente]

### Fase 2: [Nombre de la Fase] (~X min)

- [ ] **2.1** [Descripción de la tarea]
  - Archivo: `[ruta/al/archivo]`
  - Cambio: [qué hacer específicamente]

### Fase 3: Testing E2E (~X min)

- [ ] **3.1** Testing manual del flujo completo
  - Usar Playwright MCP
  - Verificar todos los pasos del wizard

---

## Notas

- [Nota importante 1]
- [Nota importante 2]
```

---

### ralph-loop.sh (Script Orquestador)

Este script maneja el loop infinito, el servidor de desarrollo, y la comunicación con Claude.

```bash
#!/bin/bash
# Ralph Loop v3.1 - Infinite Agentic Loop
# Uso: ./ralph-loop.sh
#
# Características:
# - Inicia servidor de desarrollo automáticamente
# - Espera compilación de CSS (Tailwind)
# - Monitor de reinicio (agente puede solicitar restart)
# - Limpieza automática al terminar (Ctrl+C)

set -e  # Exit on error

PROMPT_FILE="specs/prompt.md"
LOG_FILE="ralph-log.txt"
ITERATION=0
SERVER_PID=""
MONITOR_PID=""
RESTART_SIGNAL="/tmp/ralph-restart-server"
MAX_TIMEOUT=600  # 10 minutos

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════
# FUNCIONES DE SERVIDOR
# ═══════════════════════════════════════════════════════════════

start_server() {
    echo -e "${BLUE}[SERVER] Iniciando servidor de desarrollo...${NC}"
    pnpm dev > /tmp/next-dev.log 2>&1 &
    SERVER_PID=$!
    echo -e "${GREEN}[SERVER] Servidor iniciado (PID: $SERVER_PID)${NC}"

    # Esperar a que el servidor esté listo
    echo -e "${YELLOW}[SERVER] Esperando que el servidor esté listo...${NC}"
    for i in $(seq 1 30); do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}[SERVER] ✅ Servidor responde en puerto 3000${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}[SERVER] ❌ Timeout esperando servidor${NC}"
            cat /tmp/next-dev.log
            return 1
        fi
        sleep 1
    done

    # Esperar a que Tailwind compile
    echo -e "${YELLOW}[SERVER] Esperando compilación de CSS (10s)...${NC}"
    sleep 10
    echo -e "${GREEN}[SERVER] ✅ Servidor completamente listo${NC}"
}

kill_server() {
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        echo -e "${YELLOW}[SERVER] Matando servidor (PID: $SERVER_PID)${NC}"
        kill -TERM "$SERVER_PID" 2>/dev/null || true
        sleep 2
        kill -9 "$SERVER_PID" 2>/dev/null || true
    fi

    # Matar cualquier next-server huérfano en puertos 3000-3010
    for port in $(seq 3000 3010); do
        PID=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$PID" ]; then
            kill -9 $PID 2>/dev/null || true
        fi
    done
    sleep 1
}

restart_server() {
    echo -e "${YELLOW}[SERVER] ═══ REINICIANDO SERVIDOR ═══${NC}"
    echo "[SERVER] Reinicio solicitado por agente: $(date)" >> "$LOG_FILE"
    kill_server
    start_server
    echo -e "${GREEN}[SERVER] ═══ SERVIDOR REINICIADO ═══${NC}"
    echo "[SERVER] Reinicio completado: $(date)" >> "$LOG_FILE"
}

# Monitor de señal de reinicio (corre en background)
restart_monitor() {
    while true; do
        if [ -f "$RESTART_SIGNAL" ]; then
            echo -e "${YELLOW}[MONITOR] Señal de reinicio detectada${NC}"
            rm -f "$RESTART_SIGNAL"
            restart_server
        fi
        sleep 2
    done
}

# ═══════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════

cleanup() {
    echo ""
    echo -e "${YELLOW}[CLEANUP] Limpiando procesos...${NC}"

    # Matar monitor de reinicio
    if [ -n "$MONITOR_PID" ] && kill -0 "$MONITOR_PID" 2>/dev/null; then
        kill -9 "$MONITOR_PID" 2>/dev/null || true
    fi

    # Matar servidor
    kill_server

    # Limpiar archivo de señal
    rm -f "$RESTART_SIGNAL"

    echo -e "${GREEN}[CLEANUP] ✅ Limpieza completada${NC}"
    echo "═══ RALPH LOOP TERMINADO (cleanup): $(date) ═══" >> "$LOG_FILE"
}

trap cleanup EXIT
trap cleanup SIGINT
trap cleanup SIGTERM

# ═══════════════════════════════════════════════════════════════
# PRE-LIMPIEZA
# ═══════════════════════════════════════════════════════════════

echo -e "${YELLOW}[PRE-CLEANUP] Verificando servidores existentes...${NC}"
kill_server
rm -f "$RESTART_SIGNAL"
echo -e "${GREEN}[PRE-CLEANUP] ✅ Listo${NC}"

# ═══════════════════════════════════════════════════════════════
# INICIAR SERVIDOR
# ═══════════════════════════════════════════════════════════════

cd "$(dirname "$0")"
start_server || exit 1

# ═══════════════════════════════════════════════════════════════
# INICIAR MONITOR DE REINICIO
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}[MONITOR] Iniciando monitor de reinicio...${NC}"
restart_monitor &
MONITOR_PID=$!
echo -e "${GREEN}[MONITOR] Monitor activo (PID: $MONITOR_PID)${NC}"
echo -e "${BLUE}[MONITOR] El agente puede reiniciar con: echo restart > $RESTART_SIGNAL${NC}"

# Header
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                     RALPH LOOP v3.1                           ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Servidor: PID $SERVER_PID (puerto 3000)                      ║"
echo "║  Monitor:  PID $MONITOR_PID (reinicio automático)             ║"
echo "║  Log: $LOG_FILE                                      ║"
echo "║  Reinicio: echo restart > $RESTART_SIGNAL      ║"
echo "║  Para detener: Ctrl+C (limpia automáticamente)               ║"
echo "║  Para monitorear: tail -f $LOG_FILE                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Iniciar log
echo "" >> "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$LOG_FILE"
echo "RALPH LOOP v3.1 INICIADO: $(date)" >> "$LOG_FILE"
echo "Servidor PID: $SERVER_PID" >> "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$LOG_FILE"

# ═══════════════════════════════════════════════════════════════
# LOOP PRINCIPAL
# ═══════════════════════════════════════════════════════════════

while true; do
    ITERATION=$((ITERATION + 1))

    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} ═══ ITERACIÓN $ITERATION ═══"

    # Siguiente tarea
    NEXT_TASK=$(grep -E "^\- \[ \]" specs/implementation_plan.md 2>/dev/null | head -1)

    if [ -z "$NEXT_TASK" ]; then
        echo -e "${GREEN}✅ ¡TODAS LAS TAREAS COMPLETADAS!${NC}"
        echo "RALPH_COMPLETE: Todas las tareas del plan completadas" >> "$LOG_FILE"
        break
    fi

    echo -e "${YELLOW}Siguiente:${NC} $NEXT_TASK"

    # Log
    echo "" >> "$LOG_FILE"
    echo "═══ ITERACIÓN $ITERATION - $(date '+%H:%M:%S') ═══" >> "$LOG_FILE"
    echo "Tarea: $NEXT_TASK" >> "$LOG_FILE"

    # Ejecutar Claude
    echo -e "${BLUE}Ejecutando Claude...${NC}"

    cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions >> "$LOG_FILE" 2>&1 || {
        echo -e "${YELLOW}[WARN] Claude terminó con código de salida $?${NC}"
    }

    # Resultado
    echo -e "${GREEN}✓${NC} Iteración $ITERATION completada"
    echo "Commits recientes:"
    git log --oneline -2 2>/dev/null || true

    echo ""
    echo -e "${YELLOW}Siguiente iteración en 3s... (Ctrl+C para detener)${NC}"
    sleep 3
done

echo ""
echo -e "${GREEN}═══ RALPH LOOP COMPLETADO EXITOSAMENTE ═══${NC}"
```

**Requisitos:**
- `claude` CLI instalado y configurado
- `pnpm` como package manager
- Puerto 3000 disponible
- Permisos de ejecución: `chmod +x ralph-loop.sh`

**Uso:**
```bash
# Iniciar el loop
./ralph-loop.sh

# Monitorear en otra terminal
tail -f ralph-log.txt

# Detener
Ctrl+C
```

---

## Historial de Cambios

| Fecha | Cambio |
|-------|--------|
| 2025-01-14 | Documento inicial creado |
| 2025-01-14 | Agregado: Regla de honestidad |
| 2025-01-14 | Agregado: Registro en Supabase como crítico |
| 2025-01-14 | Agregado: Testing via subcarpeta, no catálogo |
| 2026-01-14 | **Agregado: Bug Auto-Healing Loop (sección 6)** - Ralph ahora itera hasta 10 veces para resolver bugs automáticamente |
| 2026-01-15 | **Agregado: Contenido inicial de archivos** - Templates completos para specs/README.md, specs/prompt.md, specs/discoveries.md, specs/implementation_plan.md y ralph-loop.sh |
