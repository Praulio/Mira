# Bug Auto-Healing Loop

When verification or testing fails, use this loop to fix issues autonomously.

---

## Overview

```
Bug Detected
    │
    ▼
┌─────────────────────────┐
│   ANALYZE DEEPLY        │ ◀─────────────────┐
│   (not surface level)   │                   │
└───────────┬─────────────┘                   │
            │                                 │
            ▼                                 │
┌─────────────────────────┐                   │
│   IDENTIFY ROOT CAUSE   │                   │
│   (not just symptoms)   │                   │
└───────────┬─────────────┘                   │
            │                                 │
            ▼                                 │
┌─────────────────────────┐                   │
│   DOCUMENT IN           │                   │
│   DISCOVERIES           │                   │
└───────────┬─────────────┘                   │
            │                                 │
            ▼                                 │
┌─────────────────────────┐                   │
│   APPLY INTELLIGENT     │                   │
│   FIX                   │                   │
└───────────┬─────────────┘                   │
            │                                 │
            ▼                                 │
┌─────────────────────────┐                   │
│   RE-VERIFY             │                   │
│   (lint && build)       │                   │
└───────────┬─────────────┘                   │
            │                                 │
            ▼                                 │
        Pass? ────YES────▶ Continue to PASO 5
            │
            NO
            │
            ▼
    Attempt < 10? ───YES───┘
            │
            NO
            │
            ▼
    RALPH_BLOCKED
    (Escalate to human)
```

---

## Step 1: Detect Bug

### Output Signal
```
RALPH_BUG_DETECTED: [Error description]
```

### Capture Information
- Full error message
- Stack trace (if available)
- File and line number
- What command failed

### Example
```
RALPH_BUG_DETECTED: TypeScript compilation error
  Error: Property 'league' does not exist on type 'FormData'
  File: components/workflow/game-days/EventForm.tsx
  Line: 78
```

---

## Step 2: Analyze Deeply

**DO NOT** apply surface-level fixes. Dig deeper.

### Analysis Questions

1. **What is the actual error?**
   - Read the FULL error message
   - Understand what it's telling you

2. **Why is this happening?**
   - Trace the error to its source
   - Check related code
   - Check types/interfaces

3. **What other files might be involved?**
   - Imports
   - Type definitions
   - Configuration

4. **Is there a pattern in discoveries.md?**
   - Has this error happened before?
   - Was there a documented solution?

### Analysis Checklist

- [ ] Read complete error message
- [ ] Identify the exact line/file
- [ ] Check if types are correct
- [ ] Check if imports are correct
- [ ] Check if dependencies are installed
- [ ] Search discoveries for similar issues

---

## Step 3: Identify Root Cause

### Output Signal
```
RALPH_ROOT_CAUSE: [Explanation of why error occurs]
```

### Root Cause Categories

| Category | Signs | Typical Fix |
|----------|-------|-------------|
| **Missing type** | "Property X does not exist" | Add property to type/interface |
| **Missing import** | "X is not defined" | Add import statement |
| **Wrong syntax** | "Unexpected token" | Fix syntax error |
| **Async issue** | "Promise pending" | Add await or handle promise |
| **Null reference** | "Cannot read property of null" | Add null check |
| **Config error** | "Module not found" | Check paths/config |

### Example
```
RALPH_ROOT_CAUSE: Type 'FormData' in types.ts doesn't include 'league' field
  - EventForm.tsx uses formData.league
  - But types.ts defines FormData without league
  - Need to add league: string to FormData type
```

---

## Step 4: Document in Discoveries

### ALWAYS document before fixing

```markdown
### Bug Found: [Brief title]

**Symptoms:**
- [What you observed]

**Root Cause:**
- [Why it happened]

**Fix Applied:**
- [What you changed]

**Prevention:**
- [How to avoid in future]
```

### Example
```markdown
### Bug Found: Missing league type

**Symptoms:**
- TypeScript error: Property 'league' does not exist on type 'FormData'
- File: EventForm.tsx line 78

**Root Cause:**
- FormData type in types.ts was not updated when adding league field
- Task spec had BEFORE/AFTER for EventForm but not for types

**Fix Applied:**
- Added `league: string` to FormData interface in types.ts

**Prevention:**
- When adding new form fields, always update type definitions
- Check related type files before marking task complete
```

---

## Step 5: Apply Fix

### Output Signal
```
RALPH_FIX_ATTEMPT: [N/10] - [Description of fix]
```

### Fix Guidelines

| Do | Don't |
|----|-------|
| Fix the root cause | Apply band-aid patches |
| Follow existing patterns | Introduce new patterns |
| Update types if needed | Ignore type errors |
| Check related files | Only fix the error file |
| Keep changes minimal | Over-engineer the fix |

### Example
```
RALPH_FIX_ATTEMPT: 1/10 - Adding league field to FormData type

Changes:
- File: lib/types.ts
- Line: ~45
- Added: league: string;
```

---

## Step 6: Re-Verify

### Run Same Verification
```bash
# Whatever failed before
pnpm lint && pnpm build
```

### Output Signal

**If passes:**
```
RALPH_BUG_FIXED: Fix exitoso, continuando con PASO 5
```

**If still fails:**
```
RALPH_BUG_DETECTED: [New or same error]
```

---

## Step 7: Retry Logic

### Maximum Attempts: 10

```
Attempt 1: Initial fix
Attempt 2: Refined fix based on new error
Attempt 3: Different approach
...
Attempt 10: Last try
```

### When to Try Different Approaches

- **Same error after fix** → Dig deeper, root cause incomplete
- **New error** → Progress! Fix the new error
- **Multiple errors** → Start with first one
- **Build succeeds but test fails** → Different problem, different fix

### Retry Strategy

| Attempt | Strategy |
|---------|----------|
| 1-3 | Direct fix based on error |
| 4-5 | Check related files/types |
| 6-7 | Search discoveries for similar issues |
| 8-9 | Simplify approach |
| 10 | Document everything, escalate |

---

## Step 8: Escalation

### When to Escalate

After 10 failed attempts, escalate to human.

### Output Signal
```
RALPH_BLOCKED: Escalando al usuario

Reason: [Why fix failed]
Attempts: 10
Last error: [Error message]
Approaches tried:
1. [Approach 1]
2. [Approach 2]
...

Recommendation: [What human should investigate]
```

### Escalation Template for Discoveries

```markdown
### BLOCKED: [Task X.Y] - [Brief title]

**Task:** [X.Y] - [Description]

**Error:** [Full error message]

**Root Cause Analysis:**
[What you determined was the issue]

**Attempts Made:**
1. [Attempt 1]: [Result]
2. [Attempt 2]: [Result]
...
10. [Attempt 10]: [Result]

**Files Modified:**
- [List of files changed during fix attempts]

**Hypothesis:**
[What you think might be wrong but couldn't verify]

**Recommended Action:**
[What human should investigate or decide]
```

---

## Complete Example

```
RALPH_VERIFY: Running pnpm lint && pnpm build
RALPH_BUG_DETECTED: TypeScript error
  Error: Property 'league' does not exist on type 'FormData'
  File: EventForm.tsx:78

--- Analysis ---
Reading full error...
Checking FormData type in lib/types.ts...
FormData type exists but lacks 'league' field

RALPH_ROOT_CAUSE: FormData type missing 'league' field
  - EventForm uses formData.league
  - types.ts defines FormData without league
  - Need to add league: string

--- Document ---
Adding to discoveries.md:
  Bug: Missing league type
  Root cause: Type not updated
  Fix: Add league to FormData

--- Fix ---
RALPH_FIX_ATTEMPT: 1/10 - Adding league to FormData type
Editing lib/types.ts line 45
Adding: league: string;

--- Re-verify ---
RALPH_VERIFY: Running pnpm lint && pnpm build
RALPH_BUG_FIXED: Fix exitoso, continuando con PASO 5
```

---

## Checklist

- [ ] Captured full error message
- [ ] Analyzed beyond surface level
- [ ] Identified true root cause
- [ ] Documented in discoveries BEFORE fixing
- [ ] Applied minimal, targeted fix
- [ ] Re-verified with same command
- [ ] Tracked attempt number (max 10)
- [ ] Escalated cleanly if blocked
