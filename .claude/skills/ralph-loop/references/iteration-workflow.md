# Iteration Workflow

Detailed flow for each Ralph Loop iteration. Follow this EXACTLY.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ONE ITERATION                                │
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  PASO 0  │──▶│  PASO 1  │──▶│  PASO 2  │──▶│  PASO 3  │     │
│  │  Read    │   │  Identify│   │  Execute │   │  Verify  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│                                                    │             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐       │             │
│  │  PASO 6  │◀──│  PASO 5  │◀──│  PASO 4  │◀──────┘             │
│  │  EXIT    │   │  Commit  │   │  Test    │                     │
│  └──────────┘   └──────────┘   └────┬─────┘                     │
│                                     │                            │
│                               ┌─────▼─────┐                      │
│                               │  PASO 4.5 │                      │
│                               │ Discover  │                      │
│                               └─────┬─────┘                      │
│                                     │                            │
│                               ┌─────▼─────┐                      │
│                               │ PASO 4.6  │                      │
│                               │ Auto-Heal │ (if errors)          │
│                               └───────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## PASO 0: Read Context

**Purpose:** Understand the feature and what previous sessions learned.

### Actions

1. **Read Spec (feature context)**
   ```
   RALPH_READING: docs/specs/[feature]/spec.md
   ```
   - Understand feature vision and UX
   - Note architecture decisions
   - Check reference patterns

2. **Read Discoveries (session memory)**
   ```
   RALPH_READING: docs/specs/[feature]/discoveries.md
   ```
   - What did previous sessions learn?
   - Any known issues?
   - Important context for current work?

3. **Read Implementation Plan (find task)**
   ```
   RALPH_READING: docs/specs/[feature]/implementation_plan.md
   ```
   - Find your task (first `- [ ]`)
   - Understand task context
   - Note dependencies

### Example Output

```
RALPH_START: Iniciando sesión Ralph Loop
RALPH_READING: docs/specs/game-days/spec.md
  - Feature: Game Days workflow
  - Patterns: EventForm, preset system
RALPH_READING: docs/specs/game-days/discoveries.md
  - Session 3 found: SchemaJson must not be empty
  - Session 4 noted: Use client-side validation with Zod
RALPH_READING: docs/specs/game-days/implementation_plan.md
  - Progress: 7/15 tasks complete
  - Next task: 3.2 - Add league dropdown
```

---

## PASO 1: Identify Task

**Purpose:** Find the ONE task you will complete this session.

### Actions

1. **Find first unchecked task**
   ```bash
   grep -n "- \[ \]" docs/specs/[feature]/implementation_plan.md | head -1
   ```

2. **Read task details completely**
   - Context (why)
   - Files involved
   - Changes (BEFORE/AFTER)
   - Validation criteria
   - Pitfalls to avoid

3. **Announce task**
   ```
   RALPH_TASK: Executing [X.Y] - [description]
   ```

### Example Output

```
RALPH_TASK: Executing 3.2 - Add league dropdown to EventForm

Task details:
- Files: components/workflow/game-days/EventForm.tsx
- Changes: Add Select component with league options
- Validation: Build passes, dropdown renders with 5 options
```

### Critical Rules

- **NEVER skip ahead** - Always first `- [ ]`
- **NEVER combine tasks** - Even if they seem related
- **NEVER start without reading** - Context is essential

---

## PASO 2: Execute Task

**Purpose:** Make the changes specified in the task.

### Actions

1. **Read source files** (only those needed)
   ```
   RALPH_ACTION: Reading components/workflow/game-days/EventForm.tsx
   ```

2. **Make changes** (following BEFORE/AFTER exactly)
   ```
   RALPH_ACTION: Adding league Select component
   RALPH_ACTION: Importing Select from @/components/ui/select
   ```

3. **Save files**

### Guidelines

| Do | Don't |
|----|-------|
| Follow spec exactly | Add "improvements" |
| Use BEFORE/AFTER code | Invent new patterns |
| Change only specified files | Touch unrelated files |
| Match existing code style | Introduce new conventions |

### Example Output

```
RALPH_ACTION: Reading EventForm.tsx (245 lines)
RALPH_ACTION: Adding import { Select } from '@/components/ui/select'
RALPH_ACTION: Adding league dropdown at line ~78 (after team inputs)
RALPH_RESULT: League dropdown added with 5 options (NFL, NBA, Liga MX, MLB, Custom)
```

---

## PASO 3: Verify Quality

**Purpose:** Ensure changes don't break the build.

### Actions

1. **Run linter**
   ```bash
   # Adapt to your stack
   pnpm lint    # Node.js
   ruff check . # Python
   rubocop      # Ruby
   ```

2. **Run build**
   ```bash
   pnpm build   # Node.js
   cargo build  # Rust
   go build     # Go
   ```

3. **Report result**
   ```
   RALPH_VERIFY: Running pnpm lint && pnpm build
   RALPH_RESULT: ✅ All checks passed
   ```

### If Verification Fails

Go to **PASO 4.6 (Bug Auto-Healing)** instead of continuing.

### Example Output

```
RALPH_VERIFY: Running pnpm lint && pnpm build
RALPH_RESULT: ✅ Lint passed (0 errors, 0 warnings)
RALPH_RESULT: ✅ Build passed (compiled in 12.3s)
```

---

## PASO 4: Testing

**Purpose:** Verify the task works correctly.

### Testing Matrix

| Task Type | Required Testing |
|-----------|------------------|
| New component | Build + renders without error |
| UI change | Build + visual verification |
| API change | Build + endpoint responds |
| Database | Migration applies + data preserved |
| Config | Build + setting takes effect |
| Bug fix | Build + bug no longer reproduces |

### Visual Testing (if applicable)

For UI tasks:
1. Navigate to the page/component
2. Verify visual criteria from task spec
3. Check console for errors

### Example Output

```
RALPH_VERIFY: Testing league dropdown
RALPH_ACTION: Checking dropdown renders
RALPH_RESULT: ✅ Dropdown visible with 5 options
RALPH_ACTION: Checking selection works
RALPH_RESULT: ✅ Selection updates form state
```

---

## PASO 4.5: Update Discoveries (MANDATORY)

**Purpose:** Document what you learned for future sessions.

### This Step is NEVER Optional

Even if "nothing special happened", document:
- Task completed
- Files modified
- Any observations

### Template

```markdown
### Session [N] - [Date]

**Task Completed:**
[X.Y] [Task description]

**Patterns Discovered:**
- [Pattern name]: [Brief description]
- (none if nothing new)

**Issues Encountered:**
- [Issue]: [How resolved]
- (none if smooth execution)

**Files Modified:**
- `path/to/file.ts` - [What changed]

**Notes for Next Session:**
- [Important context]
- (none if straightforward)
```

### Example

```markdown
### Session 5 - 2024-01-15

**Task Completed:**
3.2 - Add league dropdown to EventForm

**Patterns Discovered:**
- Select component: Uses value/onValueChange pattern, not onChange
- Form state: League value stored as slug (e.g., "nfl", "liga-mx")

**Issues Encountered:**
- None

**Files Modified:**
- `components/workflow/game-days/EventForm.tsx` - Added Select import, league dropdown

**Notes for Next Session:**
- Next task (3.3) will use league value to fetch presets
- Preset images are in /public/presets/game-days/[league].webp
```

---

## PASO 4.6: Bug Auto-Healing

**Purpose:** Fix errors without human intervention (up to 10 attempts).

See [bug-auto-healing.md](bug-auto-healing.md) for detailed process.

### Quick Summary

```
Bug detected
    ↓
Analyze deeply (not surface level)
    ↓
Identify root cause
    ↓
Document in discoveries
    ↓
Apply fix
    ↓
Re-verify (PASO 3)
    ↓
Still failing? → Retry (max 10)
    ↓
After 10 failures → RALPH_BLOCKED
```

---

## PASO 5: Atomic Commit

**Purpose:** Save all changes in ONE commit.

### Files to Commit

```bash
git add docs/specs/[feature]/implementation_plan.md  # Task marked [x]
git add docs/specs/[feature]/discoveries.md          # Session documented
git add [code files]                  # Changes made
```

### Commit Message Format

```bash
git commit -m "feat([scope]): [task description]

- [Change 1]
- [Change 2]

Task X.Y completed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Example

```bash
git add docs/specs/[feature]/implementation_plan.md docs/specs/[feature]/discoveries.md \
        components/workflow/game-days/EventForm.tsx

git commit -m "feat(game-days): add league dropdown to event form

- Add Select component with 5 league options
- Store league as slug in form state
- Update types for league field

Task 3.2 completed

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Output Signal

```
RALPH_COMMIT: abc1234 - feat(game-days): add league dropdown to event form
```

---

## PASO 6: EXIT

**Purpose:** End the session cleanly.

### Actions

1. **Announce completion**
   ```
   RALPH_COMPLETE: Task 3.2 completed
   ```

2. **Exit**
   - Session ends
   - Context is destroyed
   - Script will start new session if tasks remain

### What Happens Next

```
Ralph Loop script checks implementation_plan.md
    ↓
More [ ] tasks remain?
    ↓
YES → Start new session (PASO 0)
NO  → Feature complete!
```

---

## Complete Example

```
RALPH_START: Iniciando sesión Ralph Loop

--- PASO 0: Read Context ---
RALPH_READING: docs/specs/[feature]/spec.md
  - Feature: Game Days workflow
RALPH_READING: docs/specs/[feature]/discoveries.md
  - Session 4: Use Zod for client validation
RALPH_READING: docs/specs/[feature]/implementation_plan.md
  - Progress: 7/15 tasks
  - Next: 3.2

--- PASO 1: Identify Task ---
RALPH_TASK: Executing 3.2 - Add league dropdown to EventForm

--- PASO 2: Execute Task ---
RALPH_ACTION: Reading EventForm.tsx
RALPH_ACTION: Adding Select import
RALPH_ACTION: Adding league dropdown
RALPH_RESULT: Dropdown added with 5 options

--- PASO 3: Verify Quality ---
RALPH_VERIFY: Running pnpm lint && pnpm build
RALPH_RESULT: ✅ All checks passed

--- PASO 4: Testing ---
RALPH_VERIFY: Testing league dropdown
RALPH_RESULT: ✅ Dropdown renders correctly
RALPH_RESULT: ✅ Selection updates state

--- PASO 4.5: Update Discoveries ---
RALPH_ACTION: Updating docs/specs/[feature]/discoveries.md
RALPH_RESULT: Session 5 documented

--- PASO 5: Atomic Commit ---
RALPH_COMMIT: abc1234 - feat(game-days): add league dropdown

--- PASO 6: EXIT ---
RALPH_COMPLETE: Task 3.2 completed
```

---

## Checklist Per Iteration

- [ ] Read PIN (docs/specs/[feature]/spec.md)
- [ ] Read discoveries (docs/specs/[feature]/discoveries.md)
- [ ] Find first `- [ ]` task
- [ ] Execute ONLY that task
- [ ] Run lint && build
- [ ] Test per task type
- [ ] Update discoveries (MANDATORY)
- [ ] Commit atomically
- [ ] Exit cleanly
