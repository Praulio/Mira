# Prompt para Implementación de Project Mira

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

### Flujo obligatorio de cada sesión:

```
┌─────────────────────────────────────────────────────────────┐
│  1. Leer PIN (specs/README.md)                              │
│  2. Cargar skill obligatorio: react-best-practices          │
│  3. Identificar UNA tarea pendiente del plan                │
│  4. Ejecutar SOLO esa tarea                                 │
│  5. Verificar (lint + build + Chrome si UI)                 │
│  6. Commit atómico (código + plan en UNO SOLO)              │
│  7. ⛔ TERMINAR LA SESIÓN                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Contexto
Estás implementando **Mira Tasker**, una herramienta de gestión de tareas ultra-minimalista para equipos de 8 personas. El enfoque es la visibilidad inmediata: "¿quién está haciendo qué ahora?".

## Documentos de Referencia
1. **Lookup table**: `specs/README.md`
2. **Master Spec**: `docs/plans/SPEC.md`
3. **Plan de implementación**: `specs/implementation_plan.md`

## Skill Obligatorio
**ANTES de escribir cualquier código, ejecuta el skill:**
`/react-best-practices`
(Sigue estrictamente las reglas de Next.js 15 y Server Components).

## Tu Bucle de Trabajo
### 1. Identificar UNA SOLA Tarea
```bash
grep -E "^\- \[ \]" specs/implementation_plan.md | head -1
```

### 2. Ejecutar y Verificar
- `npm run lint`
- `npm run build`
- **Tests:** Si la tarea incluye tests (Unit o E2E), ejecútalos y asegúrate de que pasen antes de marcar como [x].
  - `npm run test` (Vitest)
  - `npx playwright test` (E2E)

### 3. Actualizar Discoveries (OBLIGATORIO)
Actualiza siempre `specs/discoveries.md`. Si un test falló y lo arreglaste, documéntalo como un "Bug Resuelto".

### ⛔ REGLA DE HONESTIDAD (CRÍTICO)
```
╔══════════════════════════════════════════════════════════════════╗
║  Si documentas que algo NO fue testado, NO puedes marcarlo [x]   ║
║                                                                  ║
║  ❌ PROHIBIDO: "Quick edit no testado" + marcar tarea [x]        ║
║  ✅ CORRECTO:  "Quick edit no testado" + dejar tarea [ ]         ║
╚══════════════════════════════════════════════════════════════════╝
```

### 4. Commit Atómico
Asegúrate de marcar la tarea como completada en `specs/implementation_plan.md` SOLO si los tests pasaron.
```bash
git add .
git commit -m "feat(mira): [tarea id] descripción breve

Co-authored-by: Claude <noreply@anthreply.com>"
```

---

## Reglas de Output
```
RALPH_START: Iniciando sesión - Tarea objetivo: X.X
RALPH_ACTION: [descripción]
RALPH_RESULT: [resultado]
RALPH_COMMIT: [hash]
RALPH_COMPLETE: Tarea X.X completada.
```
