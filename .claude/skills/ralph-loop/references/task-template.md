# Task Template

High-quality task structure for Ralph Loop specs. Tasks following this template score 5/5 on Spec Specificity.

---

## Complete Task Template

```markdown
- [ ] **X.Y** [Brief, specific description - verb + object]

📋 **Context:**
- Why: [Business/technical reason this task exists]
- Current state: [What exists now, or "Nothing - new file"]
- Target state: [Clear description of desired outcome]

📁 **Files:**
- Primary: `path/to/main-file.ts`
- Secondary: `path/to/other-file.ts` (if applicable)

🔧 **Changes:**
- Location: [Line ~XX or specific element/selector]
- Strategy: [CSS class | Inline style | API call | Config update | etc.]
- BEFORE:
  ```[lang]
  [Exact current code - copy from file]
  ```
- AFTER:
  ```[lang]
  [Exact expected code - what you want]
  ```

✅ **Validation:**
- [ ] Build: `[command]` passes
- [ ] Visual: [Specific criterion - "Button appears in header"]
- [ ] Functional: [Test criterion - "Click triggers modal"]

⚠️ **Pitfalls:**
- [Common mistake 1]: [How to avoid]
- [Common mistake 2]: [How to avoid]

📖 **Reference:**
- Spec section: [Link or section name]
- Related task: [X.Y if dependent]
```

---

## Spec Specificity Score

Evaluate each task against these criteria:

| Criterion | Question | Points |
|-----------|----------|--------|
| BEFORE/AFTER | Does it have exact code snippets? | 1 |
| Location | Does it specify line number or element? | 1 |
| Strategy | Does it decide HOW to implement? | 1 |
| Validation | Does it have specific pass/fail criteria? | 1 |
| Context | Does it explain WHY this task exists? | 1 |

**Scoring Guide:**

| Score | Quality | Ralph Behavior |
|-------|---------|----------------|
| 5/5 | Excellent | Executes without ambiguity |
| 4/5 | Good | Minor inference needed |
| 3/5 | Acceptable | Some guessing required |
| 2/5 | Poor | High chance of wrong output |
| 0-1/5 | Unacceptable | Will almost certainly fail |

**Target:** Average ≥4/5 across all tasks before starting.

---

## Examples

### Score 5/5 (Excellent)

```markdown
- [ ] **1.3** Add dark mode background variable to .dark selector

📋 **Context:**
- Why: Tailwind dark mode uses `.dark` selector on html element
- Current state: Variables exist only in `:root` (line 15-45)
- Target state: Dark variants in `.dark {}` block (line 117+)

📁 **Files:**
- Primary: `app/globals.css`

🔧 **Changes:**
- Location: `.dark {}` block, line ~117
- Strategy: Add CSS custom property
- BEFORE:
  ```css
  .dark {
    --foreground: oklch(0.95 0.01 240);
  }
  ```
- AFTER:
  ```css
  .dark {
    --foreground: oklch(0.95 0.01 240);
    --background: oklch(0.12 0.015 250);
  }
  ```

✅ **Validation:**
- [ ] Build: `pnpm build` passes
- [ ] Visual: Background changes when `.dark` class on html

⚠️ **Pitfalls:**
- Don't add to `:root` - dark mode won't work
- Check variable name matches what components use
```

### Score 1/5 (Poor - Don't Do This)

```markdown
- [ ] **1.3** Update dark mode colors

📁 **Files:**
- `app/globals.css`

🔧 **Changes:**
- Update the CSS variables for dark mode
```

**Why it fails:**
- ❌ No BEFORE/AFTER code
- ❌ No line number
- ❌ No strategy (which variables? what values?)
- ❌ No validation criteria
- ❌ No context

---

## Variable Mapping Table

When modifying existing configuration, include a mapping table:

```markdown
| Variable | Location | Current Value | New Value |
|----------|----------|---------------|-----------|
| `--background` | line ~117 | `oklch(0.12 0.015 240)` | `oklch(0.12 0.015 250)` |
| `--foreground` | line ~118 | `oklch(0.95 0.01 240)` | `oklch(0.95 0.01 250)` |
| `--primary` | line ~119 | `oklch(0.65 0.2 240)` | `oklch(0.70 0.18 250)` |
```

This eliminates all ambiguity about which values change.

---

## Task Types and Templates

### Type: New File

```markdown
- [ ] **X.Y** Create [ComponentName] component

📋 **Context:**
- Why: [Need this component for feature X]
- Current state: File doesn't exist
- Target state: New component at `path/to/Component.tsx`

📁 **Files:**
- Primary: `components/[ComponentName].tsx` (new)

🔧 **Changes:**
- Location: New file
- AFTER:
  ```tsx
  // Full component code here
  export function ComponentName() {
    return <div>...</div>
  }
  ```

✅ **Validation:**
- [ ] File exists at correct path
- [ ] TypeScript compiles
- [ ] Component renders without error
```

### Type: Modify Existing

```markdown
- [ ] **X.Y** Add [feature] to [Component]

📋 **Context:**
- Why: [Feature needed for X]
- Current state: Component lacks [feature]
- Target state: Component has [feature]

📁 **Files:**
- Primary: `components/[Component].tsx`

🔧 **Changes:**
- Location: [Function/line]
- BEFORE:
  ```tsx
  [current code]
  ```
- AFTER:
  ```tsx
  [new code]
  ```

✅ **Validation:**
- [ ] Existing functionality unchanged
- [ ] New [feature] works
```

### Type: Configuration

```markdown
- [ ] **X.Y** Add [setting] to [config]

📋 **Context:**
- Why: [Setting needed for feature]
- Current state: Setting doesn't exist
- Target state: Setting configured in [file]

📁 **Files:**
- Primary: `[config-file]`

🔧 **Changes:**
- Location: [Section/key]
- BEFORE:
  ```json
  {
    "existingKey": "value"
  }
  ```
- AFTER:
  ```json
  {
    "existingKey": "value",
    "newSetting": "value"
  }
  ```

✅ **Validation:**
- [ ] Config file valid (no syntax errors)
- [ ] Setting takes effect
```

### Type: Database/Migration

```markdown
- [ ] **X.Y** Add [column/table] to database

📋 **Context:**
- Why: [Data needed for feature]
- Current state: [Table/column] doesn't exist
- Target state: Schema updated with [change]

📁 **Files:**
- Primary: `migrations/[timestamp]_[name].sql` (new)

🔧 **Changes:**
- Location: New migration file
- AFTER:
  ```sql
  -- Migration SQL
  ALTER TABLE users ADD COLUMN preferences JSONB;
  ```

✅ **Validation:**
- [ ] Migration applies without error
- [ ] Schema updated correctly
- [ ] Existing data preserved

⚠️ **Pitfalls:**
- Always include rollback/down migration
- Test with existing data
```

---

## Checklist Before Writing Tasks

- [ ] Do I know the exact file(s)?
- [ ] Do I know the exact location (line/element)?
- [ ] Do I have the current code?
- [ ] Do I have the target code?
- [ ] Can I describe specific validation criteria?
- [ ] Have I listed common pitfalls?

If any answer is "no", do more research before writing the task.
