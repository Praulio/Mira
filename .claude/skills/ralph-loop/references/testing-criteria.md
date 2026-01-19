# Testing Criteria

Matrix of testing requirements by task type, plus visual checkpoint guidance.

---

## Testing Matrix

| Task Type | Build | Lint | Unit Test | Visual | E2E | Notes |
|-----------|-------|------|-----------|--------|-----|-------|
| New component | ✅ | ✅ | ⚪ | ✅ | ⚪ | Check renders without error |
| Modify component | ✅ | ✅ | ✅ | ✅ | ⚪ | Existing tests must pass |
| New API endpoint | ✅ | ✅ | ✅ | ⚪ | ⚪ | Test response format |
| Modify API | ✅ | ✅ | ✅ | ⚪ | ⚪ | Existing tests must pass |
| Database migration | ✅ | ⚪ | ⚪ | ⚪ | ⚪ | Check migration applies |
| Config change | ✅ | ✅ | ⚪ | ⚪ | ⚪ | Verify setting takes effect |
| Bug fix | ✅ | ✅ | ✅ | ✅ | ⚪ | Bug no longer reproduces |
| Style/CSS | ✅ | ✅ | ⚪ | ✅ | ⚪ | Visual verification critical |
| Activation (Fase 0) | ✅ | ✅ | ⚪ | ✅ | ⚪ | Smoke test required |

**Legend:**
- ✅ Required
- ⚪ Optional (if applicable)

---

## Minimum Testing Requirements

### ALWAYS Required (Every Task)

```bash
# 1. Lint must pass
pnpm lint  # or equivalent

# 2. Build must pass
pnpm build  # or equivalent
```

### Per Task Type

#### New Component
```
- [ ] Component file exists at correct path
- [ ] TypeScript compiles (no type errors)
- [ ] Component renders without runtime error
- [ ] Props work as expected
- [ ] No console errors
```

#### UI/Style Change
```
- [ ] Build passes
- [ ] Visual change is visible
- [ ] Change matches spec exactly
- [ ] No layout/styling regressions
- [ ] Responsive (if applicable)
```

#### API Endpoint
```
- [ ] Build passes
- [ ] Endpoint responds (200/201)
- [ ] Response format correct
- [ ] Error cases handled
- [ ] Auth works (if applicable)
```

#### Database Migration
```
- [ ] Migration applies without error
- [ ] Schema updated correctly
- [ ] Existing data preserved
- [ ] Rollback works (if applicable)
```

#### Bug Fix
```
- [ ] Build passes
- [ ] Bug no longer reproduces
- [ ] Fix doesn't break other functionality
- [ ] Root cause addressed (not just symptoms)
```

---

## Visual Checkpoints

### What Are Visual Checkpoints?

Points in the implementation where you verify the feature LOOKS correct, not just compiles.

### When to Use

- After completing Fase 0 (activation)
- After completing each major phase
- After any UI/style task
- Before final phase

### Checkpoint Structure

```markdown
### Visual Checkpoint: [Phase Name]

**What to verify:**
- [ ] [Visual criterion 1]
- [ ] [Visual criterion 2]
- [ ] [Visual criterion 3]

**How to verify:**
1. Navigate to [URL/route]
2. Perform [action]
3. Observe [expected result]

**Screenshots:** (if using browser automation)
- `checkpoint-phase-1.png` - [description]
```

### Example Checkpoints

#### After Fase 0 (Activation)
```markdown
### Visual Checkpoint: Smoke Test

**What to verify:**
- [ ] Page loads without error
- [ ] Basic layout renders
- [ ] No console errors

**How to verify:**
1. Navigate to /game-days
2. Wait for page load
3. Check console for errors

**Pass criteria:** Page renders, shows loading state or empty form
```

#### After Phase 2 (Form Complete)
```markdown
### Visual Checkpoint: Form Renders

**What to verify:**
- [ ] All form fields visible
- [ ] Labels correct
- [ ] Default values set
- [ ] Dropdown options populated

**How to verify:**
1. Navigate to /game-days
2. Check all form fields
3. Open dropdowns, verify options

**Pass criteria:** All 5 form fields visible with correct options
```

#### Before Final Phase
```markdown
### Visual Checkpoint: Full Feature

**What to verify:**
- [ ] Form submits
- [ ] Loading state shows
- [ ] Result displays
- [ ] Error handling works

**How to verify:**
1. Fill form with test data
2. Submit
3. Wait for result
4. Test error case

**Pass criteria:** Full happy path works
```

---

## E2E Testing Criteria (12 Points)

For features with critical UI, verify these 12 criteria:

### Functionality (4 points)
1. **Happy path** - Main flow works end-to-end
2. **Edge cases** - Boundary conditions handled
3. **Error handling** - Errors display appropriately
4. **Loading states** - Loading indicators show

### Visual (4 points)
5. **Layout** - Components positioned correctly
6. **Spacing** - Margins/padding consistent
7. **Typography** - Text readable, hierarchy clear
8. **Colors** - Brand colors correct

### Interaction (4 points)
9. **Clicks** - Buttons/links work
10. **Forms** - Input/validation works
11. **Navigation** - Routing works
12. **Feedback** - User gets response to actions

### Scoring

| Points | Status |
|--------|--------|
| 12/12 | Feature complete |
| 10-11 | Minor issues, can ship |
| 8-9 | Needs attention |
| <8 | Not ready |

---

## Testing Commands by Stack

### Node.js / Next.js
```bash
pnpm lint           # ESLint
pnpm build          # TypeScript + Next.js build
pnpm test           # Vitest/Jest
pnpm test:e2e       # Playwright (if available)
```

### Python
```bash
ruff check .        # Linting
python -m py_compile  # Syntax check
pytest              # Unit tests
pytest --e2e        # E2E tests (if available)
```

### Ruby / Rails
```bash
rubocop             # Linting
rails assets:precompile  # Build
rspec               # Tests
```

### Go
```bash
go vet ./...        # Linting
go build ./...      # Build
go test ./...       # Tests
```

---

## When Testing Fails

### Build/Lint Failure
→ Go to Bug Auto-Healing loop

### Test Failure
1. Check if test is for your changes
2. If yes → fix the code
3. If no → investigate if your changes broke something
4. Document in discoveries

### Visual Failure
1. Check if spec was unclear
2. If yes → document and ask for clarification
3. If no → fix the implementation

---

## Checkpoint Documentation Template

Add to `docs/specs/[feature]/discoveries.md`:

```markdown
## Visual Checkpoints Log

### Checkpoint: [Name] - [Date]

**Status:** ✅ Pass / ❌ Fail

**Verified:**
- [x] [Criterion 1]
- [x] [Criterion 2]
- [ ] [Criterion 3] - Issue: [description]

**Notes:**
[Any observations]

**Screenshot:** [filename if taken]
```

---

## Checklist

### Per Task
- [ ] Lint passes
- [ ] Build passes
- [ ] Task-specific tests pass
- [ ] Visual verification (if UI task)

### Per Phase
- [ ] All phase tasks pass
- [ ] Visual checkpoint passes
- [ ] No regressions

### Feature Complete
- [ ] All tasks completed
- [ ] All checkpoints pass
- [ ] E2E criteria met (if applicable)
- [ ] No console errors
- [ ] No type errors
