# HD task automation cycle (Mira -> Happy Dreamers)

This flow processes exactly one HD task per run, with atomic commit in Happy Dreamers and DB deduping in Mira.

## Backend-only tracking fields (not for UI)

Added in `tasks` table:

- `automation_status` (`claimed` | `completed` | `failed`)
- `automation_claimed_by`
- `automation_claimed_at`
- `automation_completed_at`
- `automation_run_id`
- `automation_target_repo`
- `automation_branch`
- `automation_commit_sha`
- `automation_last_error`

These fields are orchestration metadata and should not be displayed in UI components.

## Single-run lifecycle

1. Ensure dependencies are installed in each worktree (`npm ci` when `node_modules` is missing).
2. Claim one task atomically in Mira DB.
3. Pull task context, including attachment metadata.
4. If the task has image attachments, download and inspect them before planning implementation.
5. Create isolated branch in HD repo (`fix/hd-<task-id>`).
6. Implement fix for that task only.
7. Run lint/test + targeted UI validation (Playwright/Chrome DevTools).
8. Create atomic commit referencing task id.
9. Mark task as `completed` with branch + commit SHA.
10. If any failure, mark task as `failed` and store `automation_last_error`.

## CLI helpers in Mira repo

```bash
# Claim one task + include downloaded image context in /tmp/mira-task-images/<taskId>/
npm run automation:hd:claim

# Complete a claimed task after successful HD fix
npm run automation:hd:complete -- --task-id <task-id> --branch <branch> --commit-sha <sha> --run-id <run-id>

# Mark task failed if implementation/test/UI validation fails
npm run automation:hd:fail -- --task-id <task-id> --error "<failure summary>" --run-id <run-id>
```

## Claim query pattern (atomic)

Use a transaction with `FOR UPDATE SKIP LOCKED`:

```sql
WITH candidate AS (
  SELECT t.id
  FROM tasks t
  JOIN users u ON u.id = t.assignee_id
  WHERE LOWER(u.name) IN ('rogelio guzmán', 'rogelio guzman')
    AND t.status NOT IN ('done', 'in_progress')
    AND (LOWER(t.title) LIKE '%hd%' OR LOWER(t.title) LIKE '%happy dreamers%')
    AND COALESCE(t.automation_status::text, '') NOT IN ('claimed', 'completed')
  ORDER BY t.updated_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
UPDATE tasks t
SET automation_status = 'claimed',
    automation_claimed_by = $1,
    automation_claimed_at = NOW(),
    automation_run_id = $2,
    automation_last_error = NULL
FROM candidate
WHERE t.id = candidate.id
RETURNING t.id, t.title, t.description, t.area;
```

## Completion update

```sql
UPDATE tasks
SET automation_status = 'completed',
    automation_completed_at = NOW(),
    automation_target_repo = 'happy_dreamersV2',
    automation_branch = $1,
    automation_commit_sha = $2,
    automation_last_error = NULL,
    updated_at = NOW()
WHERE id = $3;
```

## Failure update

```sql
UPDATE tasks
SET automation_status = 'failed',
    automation_last_error = $1,
    updated_at = NOW()
WHERE id = $2;
```

## Final automation prompt (recommended)

```text
Procesa exactamente 1 task HD por corrida, end-to-end.

1) En el repo Mira, haz claim atómico de una task:
- si no existe `node_modules`, ejecuta `npm ci` primero.
- ejecuta: npm run automation:hd:claim
- usa el JSON de salida.
- si claimed=false, reporta "no work" y termina.
- si claimed=true, toma task.id, task.title, task.automation_run_id, attachments e imageDownload.

2) Si hay imágenes adjuntas descargadas (imageDownload.downloaded), revísalas antes de planear.

3) En happy_dreamersV2:
- si no existe `node_modules`, ejecuta `npm ci` primero.
- crea branch: fix/hd-<task-id>-<short-slug>
- plan breve (causa raíz + archivos + pruebas)
- implementa solo esa task

4) Validación obligatoria antes de commit:
- lint/tests del área tocada
- validación UI con browser automation (Playwright o Chrome DevTools)
- reporta evidencia breve de lo validado

5) Crea un commit atómico, referenciando task-id.

6) Actualiza Mira DB:
- éxito: npm run automation:hd:complete -- --task-id <id> --branch <branch> --commit-sha <sha> --run-id <runId>
- fallo: npm run automation:hd:fail -- --task-id <id> --error "<resumen>" --run-id <runId>

7) Entrega resumen final:
- task id/título
- archivos cambiados
- tests/UI checks ejecutados
- commit sha o error

No proceses más de una task por corrida.
```

## Scheduling

Recommended: multiple runs per day, each run handles one task.

- 2x/day equivalent: hourly interval 12
- Higher throughput: hourly interval 4 or 6
