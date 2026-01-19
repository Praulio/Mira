# Spec Validation

Pre-flight checklist and Spec Specificity Score calculation. Run BEFORE starting Ralph Loop.

---

## Pre-Flight Checklist

Answer ALL questions before running `./ralph-loop.sh`:

### 1. Structure (5 items)

- [ ] **Fase 0 exists** with activation + smoke test
- [ ] **4 spec files** present (README.md, prompt.md, implementation_plan.md, discoveries.md)
- [ ] **Tasks are numbered** correctly (X.Y format)
- [ ] **Phases are ordered** logically
- [ ] **Intermediate checkpoints** between phases

### 2. Task Quality (5 items)

- [ ] **BEFORE/AFTER code** in ≥80% of tasks
- [ ] **Location specified** (line number or element)
- [ ] **Validation criteria** are specific (not "works correctly")
- [ ] **Files listed** for each task
- [ ] **Pitfalls documented** for complex tasks

### 3. Context (5 items)

- [ ] **prompt.md** has clear instructions
- [ ] **Verification commands** are correct for your stack
- [ ] **Reference patterns** are documented
- [ ] **Dependencies** are in correct order
- [ ] **No vague words** (improve, update, modify without specifics)

### Quick Validation

Run these checks (replace `[feature]` with your feature folder name):

```bash
# 1. Check all 4 files exist
ls docs/specs/[feature]/spec.md docs/specs/[feature]/prompt.md docs/specs/[feature]/implementation_plan.md docs/specs/[feature]/discoveries.md

# 2. Check Fase 0 exists
grep -i "Fase 0" docs/specs/[feature]/implementation_plan.md

# 3. Count tasks with BEFORE/AFTER
grep -c "BEFORE:" docs/specs/[feature]/implementation_plan.md
grep -c "AFTER:" docs/specs/[feature]/implementation_plan.md

# 4. Check for vague words
grep -iE "update|modify|improve|fix|change" docs/specs/[feature]/implementation_plan.md | head -5
```

---

## Spec Specificity Score

Calculate quality score for each task.

### Scoring Criteria

| Criterion | Question | Points |
|-----------|----------|--------|
| **BEFORE/AFTER** | Does task have exact code snippets? | 1 |
| **Location** | Does task specify line number or element? | 1 |
| **Strategy** | Does task decide HOW to implement? | 1 |
| **Validation** | Does task have specific pass/fail criteria? | 1 |
| **Context** | Does task explain WHY it exists? | 1 |

### How to Score

For each task, check each criterion:

```
Task 2.3: Add league dropdown
- BEFORE/AFTER code: ✅ Yes → 1 point
- Location (line ~78): ✅ Yes → 1 point
- Strategy (use Select component): ✅ Yes → 1 point
- Validation (5 options visible): ✅ Yes → 1 point
- Context (why needed): ✅ Yes → 1 point
Score: 5/5
```

### Score Interpretation

| Score | Quality | Ralph Behavior | Action |
|-------|---------|----------------|--------|
| 5/5 | Excellent | Executes perfectly | Go |
| 4/5 | Good | Minor inference needed | Go |
| 3/5 | Acceptable | Some guessing required | Consider improving |
| 2/5 | Poor | High chance of error | Improve before running |
| 0-1/5 | Unacceptable | Will fail | Must rewrite |

### Feature-Level Score

Calculate average across ALL tasks:

```
Task 0.1: 5/5
Task 0.2: 4/5
Task 1.1: 5/5
Task 1.2: 3/5  ← Below target
Task 1.3: 5/5
Task 2.1: 4/5
Task 2.2: 5/5

Average: (5+4+5+3+5+4+5) / 7 = 4.4/5 ✅

Target: ≥4.0/5
```

---

## Go/No-Go Decision

### GO (Start Ralph Loop)

All must be true:
- [ ] Pre-flight checklist complete
- [ ] Average Specificity Score ≥4/5
- [ ] Fase 0 has activation step
- [ ] No tasks with Score <2/5
- [ ] Verification commands tested

### NO-GO (Fix First)

If any:
- Pre-flight items missing
- Average Score <4/5
- Any task with Score <2/5
- No Fase 0
- Vague validation criteria

---

## Score Improvement Guide

### Raising from 2/5 to 4/5

**Before (Score 2/5):**
```markdown
- [ ] **2.3** Add dark mode support
  - File: globals.css
  - Change: Add dark variables
```

**After (Score 4/5):**
```markdown
- [ ] **2.3** Add --background variable to .dark selector

📋 **Context:**
- Why: Dark mode needs distinct background
- Current: Variable only in :root
- Target: Dark variant in .dark block

📁 **Files:**
- Primary: `app/globals.css`

🔧 **Changes:**
- Location: `.dark {}` block, line ~117
- AFTER:
  ```css
  .dark {
    --background: oklch(0.12 0.015 250);
  }
  ```

✅ **Validation:**
- [ ] Build passes
- [ ] Background changes when dark mode active
```

### Common Improvements

| From | To | Points Gained |
|------|-----|---------------|
| "Update X" | "Add Y to X at line Z" | +1 (Location) |
| No code | BEFORE/AFTER snippets | +1 (Code) |
| "Works" | "Build passes, X visible" | +1 (Validation) |
| No reason | "Why: needed for feature X" | +1 (Context) |
| "Somehow" | "Using pattern X" | +1 (Strategy) |

---

## Validation Examples

### Example: High Quality Spec (Average 4.6/5)

```markdown
## Fase 0: Activation (Score 5/5)
- [ ] **0.1** Add /game-days route
  - Context: ✅
  - Location: ✅ (app/game-days/page.tsx)
  - Code: ✅ (full page template)
  - Validation: ✅ (page renders)
  - Strategy: ✅ (copy from ad-studio)

## Fase 1: Form (Average 4.5/5)
- [ ] **1.1** Create EventForm component (5/5)
- [ ] **1.2** Add league dropdown (5/5)
- [ ] **1.3** Add team inputs (4/5) ← Missing pitfalls
- [ ] **1.4** Add promo textarea (4/5) ← Missing pitfalls

Overall: 4.6/5 → GO
```

### Example: Low Quality Spec (Average 2.3/5)

```markdown
## Fase 1: Build Feature
- [ ] **1.1** Create the main component (2/5)
  - No context, no location, vague validation
- [ ] **1.2** Add form fields (2/5)
  - Which fields? What order? What types?
- [ ] **1.3** Connect to API (3/5)
  - Some details but no BEFORE/AFTER
- [ ] **1.4** Style the UI (2/5)
  - What styles? What components?

Overall: 2.3/5 → NO-GO, rewrite required
```

---

## Validation Workflow

```
1. Write spec
      ↓
2. Run pre-flight checklist
      ↓
3. Calculate Specificity Score
      ↓
4. Score ≥4/5?
      ↓
   YES → GO (start Ralph Loop)
   NO  → Improve spec, return to step 2
```

---

## Quick Reference Card

### Pre-Flight (Must Have)
- [ ] Fase 0 with activation
- [ ] 4 spec files exist
- [ ] BEFORE/AFTER in tasks
- [ ] Specific validation
- [ ] Correct verification commands

### Scoring
```
5/5 = Perfect, execute immediately
4/5 = Good, execute
3/5 = Okay, consider improving
2/5 = Poor, must improve
1/5 = Fail, must rewrite
```

### Decision
```
Average ≥4/5 → GO
Average <4/5 → NO-GO
```

---

## Checklist Template

Copy and fill for your spec:

```markdown
# Spec Validation: [Feature Name]

## Pre-Flight Checklist

### Structure
- [ ] Fase 0 exists
- [ ] 4 spec files present
- [ ] Tasks numbered correctly
- [ ] Phases ordered logically
- [ ] Intermediate checkpoints

### Task Quality
- [ ] BEFORE/AFTER code ≥80%
- [ ] Locations specified
- [ ] Validation specific
- [ ] Files listed
- [ ] Pitfalls documented

### Context
- [ ] prompt.md clear
- [ ] Verification commands correct
- [ ] Reference patterns documented
- [ ] Dependencies ordered
- [ ] No vague words

## Specificity Scores

| Task | Score | Notes |
|------|-------|-------|
| 0.1 | /5 | |
| 0.2 | /5 | |
| 1.1 | /5 | |
| ... | /5 | |

**Average:** /5

## Decision

- [ ] GO - Average ≥4/5, all pre-flight passed
- [ ] NO-GO - Improvements needed: [list]
```
