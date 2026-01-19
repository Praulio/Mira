# Anti-Patterns

What NOT to do when using Ralph Loop. Learn from past mistakes.

---

## Section 1: Execution Anti-Patterns

Mistakes made during Ralph Loop execution.

### 1.1 Multiple Tasks Per Loop

**Anti-pattern:**
```
"I'll complete tasks 2.1, 2.2, and 2.3 since they're all related to forms..."
```

**Why it's wrong:**
- Violates core rule #1 (ONE TASK = ONE LOOP)
- Creates large commits (hard to review/revert)
- Risk of partial completion if something fails
- Context overflow if tasks are complex

**Correct approach:**
```
RALPH_TASK: Executing 2.1 - Create form component
[Complete only 2.1]
[Commit]
[Exit]
[New session picks up 2.2]
```

---

### 1.2 Skipping Tasks

**Anti-pattern:**
```
"Task 3.2 depends on 3.4, so I'll do 3.4 first..."
```

**Why it's wrong:**
- Violates core rule #4 (SEQUENTIAL)
- Plan was written in correct order for a reason
- Dependencies should be reflected in task order

**Correct approach:**
```
If task order is wrong:
→ Document in discoveries
→ Exit cleanly
→ Human should reorder plan before next session
```

---

### 1.3 Commit Without Discoveries

**Anti-pattern:**
```bash
git add code.ts implementation_plan.md
git commit -m "Complete task 3.2"
# Missing: discoveries.md
```

**Why it's wrong:**
- Next session loses context
- Patterns not captured
- Issues will repeat
- Violates core rule #7 (DISCOVERIES MANDATORY)

**Correct approach:**
```bash
git add code.ts implementation_plan.md discoveries.md
git commit -m "Complete task 3.2"
# Always include discoveries
```

---

### 1.4 Skipping Verification

**Anti-pattern:**
```
"The change is small, no need to run lint/build..."
```

**Why it's wrong:**
- Small changes cause big failures
- TypeScript errors only appear at build time
- Lint catches issues before they compound

**Correct approach:**
```
ALWAYS run verification:
RALPH_VERIFY: Running pnpm lint && pnpm build
RALPH_RESULT: ✅ All checks passed
```

---

### 1.5 Surface-Level Bug Fixes

**Anti-pattern:**
```
Error: Cannot read property 'length' of undefined
Fix: Add || [] to make it work
```

**Why it's wrong:**
- Treats symptom, not cause
- Bug will resurface elsewhere
- Creates fragile code
- Doesn't identify why it's undefined

**Correct approach:**
```
RALPH_ROOT_CAUSE: Data is undefined because API returns null when empty
Fix: Handle null case in API response processing
```

---

### 1.6 Ignoring Discoveries from Previous Sessions

**Anti-pattern:**
```
[Starts executing immediately without reading discoveries]
```

**Why it's wrong:**
- Repeats mistakes already solved
- Misses important context
- Ignores patterns already established

**Correct approach:**
```
PASO 0: Read PIN + Discoveries
RALPH_READING: docs/specs/[feature]/discoveries.md
  - Session 3 learned: SchemaJson must not be empty
  - Session 4 pattern: Use Zod for validation
```

---

## Section 2: Spec Writing Anti-Patterns

Mistakes made when writing specs (before Ralph executes).

### 2.1 Vague Tasks (Low Specificity)

**Anti-pattern:**
```markdown
- [ ] **1.3** Update dark mode colors
```

**Why it's wrong:**
- Score 1/5 (see Spec Specificity Score)
- No BEFORE/AFTER code
- No location specified
- No validation criteria
- Ralph will guess (wrong)

**Correct approach:**
```markdown
- [ ] **1.3** Add --background variable to .dark selector

📋 **Context:**
- Why: Dark mode needs distinct background color
- Current: Variable exists only in :root
- Target: Add dark variant in .dark block

📁 **Files:**
- Primary: `app/globals.css`

🔧 **Changes:**
- Location: `.dark {}` block, line ~117
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
- [ ] Build passes
- [ ] Dark mode background changes when active
```

---

### 2.2 Missing Fase 0 (Activation)

**Anti-pattern:**
```markdown
## Fase 1: Core Components
- [ ] **1.1** Create UserProfile component
- [ ] **1.2** Add avatar display
...
```

**Why it's wrong:**
- No activation step
- Feature might not be accessible
- No smoke test to verify basics

**Correct approach:**
```markdown
## Fase 0: Activation & Smoke Test (CRITICAL)
- [ ] **0.1** Add /user-profile route to app
- [ ] **0.2** Smoke test - page renders without error

## Fase 1: Core Components
- [ ] **1.1** Create UserProfile component
...
```

---

### 2.3 Testing Only at End

**Anti-pattern:**
```markdown
Fase 1: Build forms (4 tasks)
Fase 2: Build display (3 tasks)
Fase 3: Build logic (5 tasks)
Fase 4: Testing (1 task)  ← Only testing at end
```

**Why it's wrong:**
- 12 tasks before first visual check
- Issues compound unnoticed
- Late discovery = expensive fix

**Correct approach:**
```markdown
Fase 0: Activation + Smoke test     ← Checkpoint
Fase 1: Build forms + Checkpoint    ← Checkpoint
Fase 2: Build display + Checkpoint  ← Checkpoint
Fase 3: Build logic + Checkpoint    ← Checkpoint
Fase 4: Full E2E testing
```

---

### 2.4 Assuming Implicit Knowledge

**Anti-pattern:**
```
Spec writer thinks: "Ralph knows that Tailwind dark mode requires className='dark' on html"
Task says: "Add dark mode CSS variables"
Result: Variables added, but dark mode doesn't work (missing activation)
```

**Why it's wrong:**
- Ralph is LITERAL
- Ralph does NOT infer
- If it's not written, it doesn't exist

**Correct approach:**
```markdown
## Fase 0: Activation
- [ ] **0.1** Add className="dark" to html element in layout.tsx
  ...BEFORE/AFTER code...

## Fase 1: CSS Variables
- [ ] **1.1** Add dark mode CSS variables
  ...
```

---

### 2.5 No Variable Mapping Table

**Anti-pattern:**
```markdown
- [ ] **2.1** Update color variables for dark theme

  **Files:** globals.css

  **Changes:** Update the dark mode colors
```

**Why it's wrong:**
- Which variables?
- What current values?
- What new values?
- Ralph will guess

**Correct approach:**
```markdown
- [ ] **2.1** Update color variables for dark theme

  **Variable Mapping:**
  | Variable | Location | Current | New |
  |----------|----------|---------|-----|
  | --background | line ~117 | oklch(0.12 0.015 240) | oklch(0.12 0.015 250) |
  | --foreground | line ~118 | oklch(0.95 0.01 240) | oklch(0.95 0.01 250) |
  | --primary | line ~119 | oklch(0.65 0.2 240) | oklch(0.70 0.18 250) |
```

---

### 2.6 Ambiguous Validation

**Anti-pattern:**
```markdown
✅ **Validation:**
- [ ] Works correctly
- [ ] Looks good
```

**Why it's wrong:**
- "Works correctly" = undefined
- "Looks good" = subjective
- Ralph can't verify vague criteria

**Correct approach:**
```markdown
✅ **Validation:**
- [ ] Build: `pnpm build` passes
- [ ] Visual: Dark background (#1a1a1a) visible when .dark class present
- [ ] Functional: Toggle button switches between light/dark
```

---

## Section 3: Red Flags

Warning signs that a spec or execution is going wrong.

### Spec Red Flags

| Red Flag | Problem | Action |
|----------|---------|--------|
| Average Specificity Score <3 | Tasks too vague | Rewrite tasks with BEFORE/AFTER |
| No Fase 0 | Missing activation | Add Fase 0 before starting |
| Vague words: "improve", "update", "modify" | Undefined scope | Specify exactly what changes |
| No line numbers | Location unknown | Find exact locations |
| Single testing phase at end | Late verification | Add intermediate checkpoints |

### Execution Red Flags

| Red Flag | Problem | Action |
|----------|---------|--------|
| "I'll also fix..." | Scope creep | Stop, one task only |
| "Skipping discovery update" | Memory loss | Always update |
| "Build is slow, skipping..." | Missing verification | Always verify |
| Same error 3+ times | Root cause not addressed | Dig deeper |
| Touching files not in task | Uncontrolled changes | Only spec files |

---

## Lessons from Production Use

### Case Study: Midnight Dark Mode

**What happened:**
- 13 tasks executed perfectly (38.7 min)
- All tasks marked complete
- Dark mode didn't work

**Root cause:**
- Spec said "add CSS variables to .dark"
- Spec did NOT say "add className='dark' to html"
- Ralph added variables correctly
- But activation step was never specified

**Lesson learned:**
> Ralph is LITERAL. If the spec doesn't say it, Ralph doesn't do it.

**Prevention:**
- Fase 0 is mandatory
- Activation steps must be explicit
- Smoke test verifies feature is accessible

---

## Checklist: Avoiding Anti-Patterns

### Before Writing Spec
- [ ] Do I understand the feature completely?
- [ ] Have I identified ALL necessary steps?
- [ ] Is there an activation step (Fase 0)?
- [ ] Can I provide BEFORE/AFTER code for each task?

### Before Starting Ralph Loop
- [ ] Spec Specificity Score ≥4/5 average?
- [ ] Fase 0 exists with smoke test?
- [ ] Intermediate visual checkpoints?
- [ ] Variable mapping tables where needed?

### During Execution
- [ ] Am I executing only ONE task?
- [ ] Did I read discoveries from previous sessions?
- [ ] Am I running verification (lint && build)?
- [ ] Am I updating discoveries before commit?

### If Something Goes Wrong
- [ ] Am I fixing root cause, not symptoms?
- [ ] Am I documenting in discoveries?
- [ ] Am I tracking attempt count (max 10)?
- [ ] Am I escalating if truly blocked?
