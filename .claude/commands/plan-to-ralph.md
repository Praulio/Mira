---
name: plan-to-ralph
description: Transforma un spec completo en tareas ejecutables para Ralph Loop con BEFORE/AFTER exactos.
argument-hint: "[ruta al spec.md, ej: docs/specs/my-feature/spec.md]"
---

# Plan to Ralph

Transforma un spec (con entrevista + arquitectura técnica) en tareas ejecutables para Ralph Loop.

## Input

<spec_path>$ARGUMENTS</spec_path>

**Validar:**
1. El archivo debe existir
2. Debe tener secciones de entrevista (Visión, Flujo, Edge Cases)
3. Debe tener secciones técnicas (Arquitectura, Fases)

**Si falta algo:** Informar al usuario qué falta y sugerir ejecutar `/interview` o `/workflows:plan` primero.

## Proceso

### 1. Leer Spec Completo

Lee el spec y extrae:
- Feature name
- Flujo del usuario
- Edge cases
- Arquitectura técnica
- Fases de implementación
- Archivos a modificar/crear

### 2. Analizar Código Actual

Para cada archivo mencionado en el spec:
- **Si existe:** Leer contenido actual para generar BEFORE/AFTER
- **Si no existe:** Solo necesita AFTER (archivo nuevo)

**CRÍTICO:** El BEFORE debe ser código REAL del codebase, no inventado.

### 3. Generar Tareas con Formato Ralph (Simplificado)

**Principio:** Describe el QUÉ con precisión, no el CÓMO.

Las tareas deben ser **granulares pero simples**. Ralph decide la implementación.

**Formato de tarea:**
```markdown
- [ ] **X.Y** [Verbo + Objeto específico]
  - Input: [qué recibe]
  - Output: [qué produce]
  - Comportamiento: [qué hace, en 1-2 bullets]
  - Referencia: [archivo existente como pattern]
```

**Ejemplo real:**
```markdown
- [ ] **2.2** Componente CastSelector
  - Props: { assets, characters, onCharactersChange, styleReference }
  - Render: Grid de assets seleccionables + campo para nombrar personajes
  - Comportamiento: Click en asset → agrega a characters con nombre editable
  - Referencia: ver components/workflow/ad-studio/AssetSelector.tsx
```

**Anti-patterns a evitar:**
- ❌ Muy vago: "Crear API endpoints" (Ralph no conecta)
- ❌ Muy técnico: BEFORE/AFTER de 50+ líneas (plan muy largo, Ralph se pierde)
- ✅ Justo: Props/Input/Output claros + referencia a patterns existentes

**Resultado esperado:** ~5 líneas por tarea (no ~100). Plan total: ~150 líneas

### 4. Crear Archivos de Ejecución

En el mismo folder del spec, generar:

#### `implementation_plan.md`

```markdown
# Implementation Plan: [Feature Name]

Generado desde: `[spec_path]`
Fecha: [timestamp]

---

## Fase 0: Activation & Smoke Test

- [ ] **0.1** Crear ruta/página base
  - Output: Página accesible en `/[feature]`
  - Comportamiento: Muestra "Feature [name] coming soon"
  - Referencia: ver cualquier `app/[workflow]/page.tsx`

Validación Fase 0:
• `pnpm build` pasa
• Página accesible en browser
• Sin errores en consola

---

## Fase 1: [Nombre de la fase]

- [ ] **1.1** [Verbo + Objeto específico]
  - Input: [qué recibe]
  - Output: [qué produce]
  - Comportamiento: [descripción breve]
  - Referencia: [archivo existente como pattern]

- [ ] **1.2** [Siguiente tarea...]
  - Props: [si es componente]
  - Render: [qué muestra]
  - Comportamiento: [interacciones]
  - Referencia: [pattern existente]

Validación Fase 1:
• Build pasa
• [Criterio específico visual/funcional]

---

## Fase N: [...]

[misma estructura]

---

## Summary

| Fase | Tareas | Descripción |
|------|--------|-------------|
| 0 | 1 | Activation |
| 1 | X | [descripción] |
| Total | Z | |
```

**IMPORTANTE:** Validaciones usan bullets (`•`), NO checkboxes (`- [ ]`).
Esto evita que Ralph confunda validaciones con tareas pendientes.

#### `prompt.md`

```markdown
# Ralph Loop Instructions: [Feature Name]

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
1. Leer `docs/specs/[feature]/spec.md` (contexto del feature)
2. Leer `docs/specs/[feature]/discoveries.md` (aprendizajes previos)
3. Leer `docs/specs/[feature]/implementation_plan.md` (encontrar tarea)

### PASO 1: Identificar Tarea
- Buscar primera `- [ ]` sin completar
- Anunciar: `RALPH_TASK: Executing [X.Y] - [description]`

### PASO 2: Ejecutar
- Leer archivos mencionados
- Aplicar cambios EXACTOS del BEFORE/AFTER
- NO agregar nada extra

### PASO 3: Verificar
```bash
pnpm lint && pnpm build
```
- Si falla → Bug Auto-Healing (max 10 intentos)
- Si pasa → continuar

### PASO 4: Documentar
Actualizar `discoveries.md`:
```markdown
### Session [N] - [fecha]
**Task:** [X.Y] - [descripción]
**Files:** [archivos modificados]
**Patterns:** [patrones descubiertos]
**Notes:** [observaciones para próxima sesión]
```

### PASO 5: Commit
```bash
git add .
git commit -m "feat([scope]): [task description]

Task [X.Y] completed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### PASO 6: Exit
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
| API endpoint | Build + endpoint responde |
| Database | Migration aplica |
| Bug fix | Build + bug no reproduce |

## Spec Reference

Feature: [Feature Name]
Spec: `docs/specs/[feature]/spec.md`
```

#### `discoveries.md` (vacío inicial)

```markdown
# Discoveries: [Feature Name]

Log de aprendizajes entre sesiones de Ralph Loop.

---

## Patrones Descubiertos

(Se llena durante la implementación)

---

## Sesiones

### Session 0 - [fecha]

**Setup inicial**
- Implementation plan generado
- Archivos de ejecución creados
- Listo para `./ralph-loop.sh docs/specs/[feature]`
```

### 5. Actualizar PIN

Agregar entrada al `docs/specs/README.md` si no existe.

### 6. Instrucciones Finales

Mostrar al usuario:

```
✅ Archivos de Ralph Loop generados:

📁 docs/specs/[feature]/
├── spec.md                  (sin cambios)
├── implementation_plan.md   ← [N] tareas
├── prompt.md                ← instrucciones
└── discoveries.md           ← vacío (se llena durante ejecución)

Para ejecutar:
./ralph-loop.sh docs/specs/[feature]

Para monitorear:
tail -f ralph-log.txt
```

## Validación de Calidad

Antes de generar, verificar:

• Fase 0 tiene paso de activación
• Todas las tareas tienen Input/Output o Props/Render claros
• Referencias a archivos existentes como patterns
• Validaciones usan bullets (•), NO checkboxes
• Plan total ≤200 líneas (~5 líneas/tarea)
• No hay palabras vagas (improve, update, modify sin contexto)

**Si el plan excede 200 líneas**, probablemente estás siendo muy técnico. Simplifica.

**Si la calidad es baja**, advertir al usuario y sugerir mejorar el spec primero.
