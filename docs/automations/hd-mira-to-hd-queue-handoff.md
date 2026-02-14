# Mira -> HD Queue Handoff (Offline-Friendly)

This flow avoids live DB dependency during HD execution.

## Goal

1. Export all HD tasks assigned to Rogelio from Mira once per cycle.
2. Include complete task context in Markdown + machine JSON.
3. Download image attachments into evidence folders.
4. Copy export bundle manually into HD repo.
5. HD automation processes one `pending` task per run from the exported file only.

## Export output

Default output root:

`/Users/rogelioguz/Documents/Code House/Activos/Mira/automation_exports/hd_queue`

Per run:

- `<timestamp>/queue.md`
- `<timestamp>/queue.json`
- `<timestamp>/evidence/<task_id>/...images...`
- `latest/queue.md`
- `latest/queue.json`

## Export command

```bash
cd "/Users/rogelioguz/Documents/Code House/Activos/Mira"
npm run automation:hd:export-queue
```

If dependencies are missing in that workspace, run `npm ci` once before exporting.

Optional flags:

```bash
node scripts/automation/hd-task-export.js --download-images --include-all-status --limit 20
```

## Automation A prompt (Mira exporter)

```text
Genera un snapshot de cola de tasks HD desde Mira y termina.

1) Ejecuta:
node "/Users/rogelioguz/Documents/Code House/Activos/Mira/scripts/automation/hd-task-export.js" --download-images

2) Si falla con errorType=infra_dns_failure o infra_network_failure, reporta infraestructura y termina sin cambios.

3) Si exporta bien, reporta:
- tasksCount
- snapshotDir
- queueMdPath
- queueJsonPath
- warnings

No implementar código de HD en esta automation.
```

## Manual handoff

Copy from Mira export into HD repo:

- `latest/queue.md` -> `<HD_REPO>/automation_inputs/queue.md`
- `latest/queue.json` -> `<HD_REPO>/automation_inputs/queue.json`
- `latest` evidence snapshot folder -> `<HD_REPO>/automation_inputs/evidence/`

## Automation B prompt (HD worker)

```text
Procesa exactamente 1 task desde el queue local, sin consultar Mira DB.

1) Lee:
- /Users/rogelioguz/Documents/Code House/Activos/happy_dreamersV2/automation_inputs/queue.json
- evidencia en /Users/rogelioguz/Documents/Code House/Activos/happy_dreamersV2/automation_inputs/evidence/

2) Selecciona el primer task con queue_status="pending".
- Si no hay pending, reporta "no work" y termina.

3) Marca ese task en queue.json como "in_progress" y guarda.

4) Implementa solo ese task en HD:
- rama fix/hd-<task-id>-<short-slug>
- usa descripción + actividad + adjuntos/evidencia como contexto
- corre pruebas + validación UI

5) Si éxito:
- commit atómico referenciando task-id
- actualizar queue_status="done"
- guardar branch/commit_sha/result_notes en el task

6) Si falla:
- actualizar queue_status="failed"
- guardar error resumido

7) Guardar queue.json y actualizar queue.md en sync.
No procesar más de una task por corrida.
```
