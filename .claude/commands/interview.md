---
name: interview
description: Entrevista profunda sobre UX, producto y flujo. Reescribe el spec con lo aprendido.
argument-hint: "[ruta al spec.md, ej: docs/specs/my-feature/spec.md]"
---

# Entrevista de Producto/UX

Entrevista al usuario para entender completamente el feature antes de implementar.

## Archivo de Spec

<spec_file>$ARGUMENTS</spec_file>

**Si el archivo no existe o está vacío**, pregunta primero: "¿Cuál es el feature que quieres crear? Dame una descripción inicial."

## Filosofía

### SÍ Preguntar (Producto/UX)
- ¿Cómo debe **sentirse** el usuario al usar esto?
- ¿Cuál es el **flujo** paso a paso?
- ¿Qué pasa si algo **falla**?
- ¿Hay **casos edge** que no estás viendo?
- ¿Cuál es el **MVP** vs nice-to-have?
- ¿Qué **no** debe hacer esta feature?
- ¿Cómo **sabrás** que funcionó bien?

### NO Preguntar (Técnico)
- ❌ ¿Qué stack usar?
- ❌ ¿Qué patrón de arquitectura?
- ❌ ¿Qué librería para X?
- ❌ ¿Cómo estructurar el código?

**Las decisiones técnicas las toma Claude automáticamente** siguiendo:
- Simplicidad (KISS)
- Patrones existentes en el codebase
- Mejores prácticas

## Proceso

### 1. Leer Contexto

Lee el archivo de spec (puede estar vacío) y entiende el codebase:
- ¿Qué patterns usa el proyecto?
- ¿Hay features similares?
- ¿Qué componentes existen?

### 2. Entrevista Profunda

Usa **AskUserQuestion** para hacer preguntas **no obvias** y **profundas**.

**Reglas:**
- Máximo 4 preguntas por ronda
- Preguntas específicas, no genéricas
- Continúa hasta que el feature esté claro
- Si el usuario dice "listo" o "continúa", procede

**Ejemplo de preguntas profundas:**
- "Mencionas que el usuario sube una imagen. ¿Qué pasa si sube un archivo corrupto? ¿Debería poder reintentar?"
- "El flujo tiene 3 pasos. ¿El usuario puede volver atrás? ¿Se guarda progreso parcial?"
- "Dices que muestra un resultado. ¿Qué información específica necesita ver el usuario para saber que funcionó?"

### 3. Reescribir Spec

Una vez completada la entrevista, reescribe el **mismo archivo** con toda la información.

**Estructura del spec:**

```markdown
# Feature: [Nombre]

## Visión
[Qué problema resuelve, para quién, por qué importa]

## Flujo del Usuario
1. [Paso 1 con detalles]
2. [Paso 2 con detalles]
3. ...

## UI/UX
- [Cómo debe verse]
- [Cómo debe sentirse]
- [Estados importantes: loading, error, éxito]

## Edge Cases
- [Caso 1]: [Qué pasa, cómo se maneja]
- [Caso 2]: [Qué pasa, cómo se maneja]

## Alcance

### MVP (Primera versión)
- [Feature esencial 1]
- [Feature esencial 2]

### Diferido (Futuro)
- [Feature que puede esperar]

## Éxito
[Cómo sabremos que el feature funciona bien]

## Notas de la Entrevista
[Contexto adicional, decisiones tomadas, trade-offs]
```

### 4. Siguiente Paso

Después de guardar el spec, sugiere:

"✅ Spec guardado en `[ruta]`.

Siguiente paso: `/workflows:plan [ruta]` para agregar arquitectura técnica."

## Ejemplo de Entrevista

**Ronda 1:**
```
¿Qué problema específico resuelve este feature para el usuario?
- Opción A: Ahorra tiempo (¿cuánto? ¿en qué tarea?)
- Opción B: Mejora calidad (¿de qué manera?)
- Opción C: Nuevo flujo (¿qué no podían hacer antes?)
```

**Ronda 2 (basada en respuesta):**
```
Mencionas que ahorra tiempo en X. Algunas preguntas de seguimiento:

1. ¿Cuántos pasos tiene el flujo actual vs el nuevo?
2. ¿Qué información necesita el usuario para empezar?
3. ¿El resultado se guarda automáticamente o el usuario decide?
```

**Ronda 3 (edge cases):**
```
Para los edge cases:

1. ¿Qué pasa si el usuario cierra la ventana a mitad del proceso?
2. ¿Puede haber errores del servidor? ¿Cómo se comunican?
3. ¿El usuario puede cancelar una operación en progreso?
```
