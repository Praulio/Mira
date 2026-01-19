# Task Template (Simplificado)

**Principio:** Describe el QUÉ con precisión, no el CÓMO.

Las tareas deben ser **granulares pero simples**. Ralph decide la implementación.

---

## Template Principal

```markdown
- [ ] **X.Y** [Verbo + Objeto específico]
  - Input: [qué recibe]
  - Output: [qué produce]
  - Comportamiento: [qué hace, 1-2 bullets]
  - Referencia: [archivo existente como pattern]
```

**Resultado esperado:** ~5 líneas por tarea. Plan total: ~150 líneas.

---

## Templates por Tipo

### Componente React

```markdown
- [ ] **2.1** Componente CastSelector
  - Props: { assets, characters, onCharactersChange, styleReference }
  - Render: Grid de assets seleccionables + campo para nombrar personajes
  - Comportamiento: Click en asset → agrega a characters con nombre editable
  - Referencia: ver components/workflow/ad-studio/AssetSelector.tsx
```

### API Endpoint

```markdown
- [ ] **1.4** POST /api/comic-studio/parse
  - Input: { storyboardText: string, knownCharacters?: string[] }
  - Output: { panels: ComicPanel[], meta: { panelCount, latencyMs } }
  - Comportamiento: Usar Gemini para parsear texto libre → JSON estructurado
  - Rate limiting por organización
  - Referencia: ver /api/edit-image para patterns
```

### Hook React

```markdown
- [ ] **3.2** Hook useComicWizard
  - Input: organizationId, initialAssets?
  - Output: { step, panels, characters, actions }
  - Comportamiento: Wizard de 3 pasos (storyboard → cast → generate)
  - Referencia: ver hooks/use-ad-studio-wizard.ts
```

### Migración DB

```markdown
- [ ] **4.1** Tabla comic_sessions
  - Columns: id, org_id, panels (jsonb), characters (jsonb), status
  - RLS: Política por org_id
  - Referencia: ver migration de ad_studio_sessions
```

---

## Anti-Patterns

### ❌ Muy Vago (Ralph no conecta)

```markdown
- [ ] **1.4** Crear API de parseo
```

**Problema:** ¿Qué recibe? ¿Qué devuelve? ¿Qué modelo usar?

### ❌ Muy Técnico (plan muy largo)

```markdown
- [ ] **1.4** Crear API route para parsear storyboard
📋 Context: Why/Current/Target...
📁 Files: app/api/comic-studio/parse/route.ts
🔧 Changes:
- BEFORE: [50 líneas]
- AFTER: [100 líneas]
✅ Validation:
- [ ] Build passes    ← CONFUNDE A RALPH
- [ ] Tests pass
```

**Problema:**
- Plan de 1800 líneas → Ralph se pierde
- Checkboxes de validación → regex los detecta como tareas

### ✅ Correcto (granular pero simple)

```markdown
- [ ] **1.4** POST /api/comic-studio/parse
  - Input: { storyboardText: string, knownCharacters?: string[] }
  - Output: { panels: ComicPanel[], meta: { panelCount, latencyMs } }
  - Usar Gemini para parsear texto libre → JSON estructurado
  - Rate limiting por organización
  - Referencia: ver /api/edit-image para patterns
```

**Resultado:** ~5 líneas. Ralph entiende el contrato, decide implementación.

---

## Validaciones (usar bullets, NO checkboxes)

```markdown
Validación Fase 1:
• Build pasa: `pnpm build`
• API responde JSON válido
• Rate limiting funciona
```

**IMPORTANTE:** Usar `•` o `-` para validaciones, NUNCA `- [ ]`.
El regex de Ralph (`^\- \[ \] \*\*[0-9]`) ignora bullets pero matchea checkboxes.

---

## Checklist Rápido

Antes de escribir una tarea, verifica:

• ¿Tiene verbo + objeto específico? (no "Update X")
• ¿Input/Output o Props/Render están claros?
• ¿Hay referencia a pattern existente?
• ¿Las validaciones usan bullets, no checkboxes?
• ¿Son ~5 líneas, no ~100?

Si alguna respuesta es "no", simplifica o investiga más.
