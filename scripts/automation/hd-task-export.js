#!/usr/bin/env node

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');
let postgresLib = null;
let googleApi = null;

const rawArgs = process.argv.slice(2);

function readArg(name, defaultValue = null) {
  const index = rawArgs.findIndex((arg) => arg === name);
  if (index === -1) return defaultValue;
  return rawArgs[index + 1] ?? defaultValue;
}

function hasFlag(name) {
  return rawArgs.includes(name);
}

function usage() {
  console.log(
    [
      'Usage:',
      '  node scripts/automation/hd-task-export.js [--download-images] [--include-all-status]',
      '                                        [--output-root <dir>] [--limit <n>]',
      '',
      'Defaults:',
      '  output-root: /Users/rogelioguz/Documents/Code House/Activos/Mira/automation_exports/hd_queue',
      '  status filter: excludes done and in_progress',
      '  limit: none',
      '',
      'Env required:',
      '  DATABASE_URL',
      '',
      'Optional env (for image downloads):',
      '  GOOGLE_SERVICE_ACCOUNT_KEY',
    ].join('\n')
  );
}

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
}

function getPostgres() {
  if (postgresLib) return postgresLib;
  try {
    postgresLib = require('postgres');
  } catch {
    throw new Error("Dependency 'postgres' is missing. Run 'npm ci' in the Mira workspace.");
  }
  return postgresLib;
}

function getGoogleApi() {
  if (googleApi) return googleApi;
  try {
    googleApi = require('googleapis').google;
  } catch {
    throw new Error("Dependency 'googleapis' is missing. Run 'npm ci' in the Mira workspace.");
  }
  return googleApi;
}

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1);

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return true;
}

function bootstrapEnv() {
  if (process.env.DATABASE_URL) return;

  const envPaths = [
    path.resolve(process.cwd(), '.env.local'),
    '/Users/rogelioguz/Documents/Code House/Activos/Mira/.env.local',
  ];

  for (const envPath of envPaths) {
    loadEnvFromFile(envPath);
    if (process.env.DATABASE_URL) return;
  }
}

function isInfraError(error) {
  const infraCodes = new Set([
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'ECONNRESET',
  ]);

  return Boolean(error && error.code && infraCodes.has(error.code));
}

function classifyError(error) {
  const message = error?.message || 'Unknown error';

  if (error?.code === 'ENOTFOUND' || error?.code === 'EAI_AGAIN') {
    return { errorType: 'infra_dns_failure', message };
  }
  if (isInfraError(error)) {
    return { errorType: 'infra_network_failure', message };
  }
  if (message.includes('DATABASE_URL environment variable is required')) {
    return { errorType: 'infra_missing_config', message };
  }
  if (message.includes("Dependency 'postgres' is missing") || message.includes("Dependency 'googleapis' is missing")) {
    return { errorType: 'infra_missing_dependency', message };
  }
  return { errorType: 'export_runtime_failure', message };
}

function checkTcpReachability(hostname, port, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: hostname, port });

    const onError = (error) => {
      socket.destroy();
      reject(error);
    };

    socket.setTimeout(timeoutMs);
    socket.once('error', onError);
    socket.once('timeout', () => {
      const timeoutError = new Error(`TCP timeout connecting to ${hostname}:${port}`);
      timeoutError.code = 'ETIMEDOUT';
      onError(timeoutError);
    });
    socket.once('connect', () => {
      socket.end();
      resolve();
    });
  });
}

async function runInfraPreflight() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const hostname = dbUrl.hostname;
  const port = Number(dbUrl.port || 5432);

  await dns.lookup(hostname);
  await checkTcpReachability(hostname, port, 5000);
}

function parseServiceAccountKey() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    return null;
  }

  const keyString = serviceAccountKey.startsWith('{')
    ? serviceAccountKey
    : Buffer.from(serviceAccountKey, 'base64').toString('utf-8');

  const parsed = JSON.parse(keyString);
  return {
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

function getDriveClient() {
  const credentials = parseServiceAccountKey();
  if (!credentials) {
    return {
      drive: null,
      warning: 'GOOGLE_SERVICE_ACCOUNT_KEY is not configured; image download skipped.',
    };
  }

  const google = getGoogleApi();
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return {
    drive: google.drive({ version: 'v3', auth }),
    warning: null,
  };
}

function sanitizeFilename(fileName) {
  return fileName.replace(/[^\w.-]/g, '_');
}

function toIso(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function buildSnapshotDir(outputRoot) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(outputRoot, stamp);
}

async function fetchTasks(sql, { includeAllStatus, limit }) {
  const whereStatus = includeAllStatus ? '' : `AND t.status NOT IN ('done', 'in_progress')`;
  const limitClause = Number.isFinite(limit) && limit > 0 ? `LIMIT ${limit}` : '';

  return sql.unsafe(
    `
      SELECT
        t.*,
        assignee.name AS assignee_name,
        assignee.email AS assignee_email,
        creator.name AS creator_name,
        creator.email AS creator_email
      FROM tasks t
      LEFT JOIN users assignee ON assignee.id = t.assignee_id
      LEFT JOIN users creator ON creator.id = t.creator_id
      WHERE (
        lower(assignee.name) LIKE '%rogelio%'
        OR lower(assignee.email) LIKE '%rogelio%'
        OR lower(assignee.email) = 'roger@ezyai.pro'
      )
        AND (
          lower(t.title) LIKE '%hd%'
          OR lower(t.title) LIKE '%happy dreamers%'
        )
        ${whereStatus}
      ORDER BY t.updated_at DESC
      ${limitClause};
    `
  );
}

async function fetchAttachments(sql, taskIds) {
  if (!taskIds.length) return [];
  return sql.unsafe(
    `
      SELECT
        a.*,
        uploader.name AS uploaded_by_name,
        uploader.email AS uploaded_by_email
      FROM attachments a
      LEFT JOIN users uploader ON uploader.id = a.uploaded_by
      WHERE a.task_id = ANY($1)
      ORDER BY a.uploaded_at ASC;
    `,
    [taskIds]
  );
}

async function fetchActivity(sql, taskIds) {
  if (!taskIds.length) return [];
  return sql.unsafe(
    `
      SELECT
        act.*,
        actor.name AS actor_name,
        actor.email AS actor_email
      FROM activity act
      LEFT JOIN users actor ON actor.id = act.user_id
      WHERE act.task_id = ANY($1)
      ORDER BY act.created_at ASC;
    `,
    [taskIds]
  );
}

async function downloadImageEvidence({ tasks, attachmentsByTask, evidenceRoot, shouldDownloadImages }) {
  const warnings = [];

  if (!shouldDownloadImages) {
    return { warnings };
  }

  const { drive, warning } = getDriveClient();
  if (!drive) {
    warnings.push(warning);
    return { warnings };
  }

  for (const task of tasks) {
    const attachments = attachmentsByTask.get(task.id) || [];
    const imageAttachments = attachments.filter((a) => a.mime_type && a.mime_type.startsWith('image/'));
    if (!imageAttachments.length) continue;

    const taskEvidenceDir = path.join(evidenceRoot, task.id);
    fs.mkdirSync(taskEvidenceDir, { recursive: true });

    for (const attachment of imageAttachments) {
      try {
        const response = await drive.files.get(
          { fileId: attachment.drive_file_id, alt: 'media', supportsAllDrives: true },
          { responseType: 'arraybuffer' }
        );
        const fileName = `${attachment.id}-${sanitizeFilename(attachment.name)}`;
        const localPath = path.join(taskEvidenceDir, fileName);
        fs.writeFileSync(localPath, Buffer.from(response.data));
        attachment.evidence_relative_path = path.relative(path.dirname(evidenceRoot), localPath);
      } catch (error) {
        warnings.push(
          `Failed downloading image for task ${task.id}, attachment ${attachment.id}: ${error.message}`
        );
      }
    }
  }

  return { warnings };
}

function formatTaskSection(task) {
  const lines = [];
  lines.push(`## ${task.title}`);
  lines.push('');
  lines.push(`- Task ID: \`${task.id}\``);
  lines.push(`- Current Status in Mira: \`${task.current_status}\``);
  lines.push(`- Queue Status: \`${task.queue_status}\``);
  lines.push(`- Area: \`${task.area}\``);
  lines.push(`- Assignee: ${task.assignee_name || '-'} (${task.assignee_email || '-'})`);
  lines.push(`- Creator: ${task.creator_name || '-'} (${task.creator_email || '-'})`);
  lines.push(`- Created At: ${task.created_at || '-'}`);
  lines.push(`- Updated At: ${task.updated_at || '-'}`);
  lines.push(`- Due Date: ${task.due_date || '-'}`);
  lines.push(`- Progress: ${task.progress}`);
  lines.push(`- Critical: ${task.is_critical}`);
  lines.push('');
  lines.push('### Description');
  lines.push(task.description ? task.description : '_No description_');
  lines.push('');
  lines.push('### Blocker / Completion Context');
  lines.push(`- blocker_reason: ${task.blocker_reason || '-'}`);
  lines.push(`- completion_notes: ${task.completion_notes || '-'}`);
  lines.push(`- completion_links: ${JSON.stringify(task.completion_links || [])}`);
  lines.push(`- mentions: ${JSON.stringify(task.mentions || [])}`);
  lines.push('');
  lines.push('### Attachments');
  if (!task.attachments.length) {
    lines.push('- None');
  } else {
    for (const attachment of task.attachments) {
      lines.push(
        `- \`${attachment.name}\` | mime: \`${attachment.mime_type}\` | size: ${attachment.size_bytes} | drive_file_id: \`${attachment.drive_file_id}\` | evidence: ${attachment.evidence_relative_path || '-'}`
      );
    }
  }
  lines.push('');
  lines.push('### Activity Timeline');
  if (!task.activity.length) {
    lines.push('- None');
  } else {
    for (const act of task.activity) {
      lines.push(
        `- ${act.created_at} | action=\`${act.action}\` | actor=${act.actor_name || act.user_id} | metadata=${JSON.stringify(act.metadata || {})}`
      );
    }
  }
  lines.push('');
  return lines.join('\n');
}

function buildQueueData(tasks, snapshotMeta) {
  return {
    version: 1,
    generated_at: snapshotMeta.generatedAt,
    source: 'mira',
    exporter: 'scripts/automation/hd-task-export.js',
    snapshot_dir: snapshotMeta.snapshotDir,
    evidence_dir: snapshotMeta.evidenceDir,
    tasks,
  };
}

function buildMarkdown(queueData, warnings) {
  const parts = [];
  parts.push('# HD Task Queue Snapshot');
  parts.push('');
  parts.push(`- generated_at: ${queueData.generated_at}`);
  parts.push(`- tasks_count: ${queueData.tasks.length}`);
  parts.push(`- snapshot_dir: ${queueData.snapshot_dir}`);
  parts.push(`- evidence_dir: ${queueData.evidence_dir}`);
  parts.push('');
  if (warnings.length) {
    parts.push('## Export Warnings');
    for (const warning of warnings) {
      parts.push(`- ${warning}`);
    }
    parts.push('');
  }
  parts.push('## Machine Queue JSON');
  parts.push('');
  parts.push('```json');
  parts.push(JSON.stringify(queueData, null, 2));
  parts.push('```');
  parts.push('');
  parts.push('## Human Detail');
  parts.push('');
  for (const task of queueData.tasks) {
    parts.push(formatTaskSection(task));
  }
  return parts.join('\n');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeSnapshotFiles({ snapshotDir, queueData, markdown }) {
  const queueJsonPath = path.join(snapshotDir, 'queue.json');
  const queueMdPath = path.join(snapshotDir, 'queue.md');
  fs.writeFileSync(queueJsonPath, `${JSON.stringify(queueData, null, 2)}\n`);
  fs.writeFileSync(queueMdPath, `${markdown}\n`);
  return { queueJsonPath, queueMdPath };
}

function refreshLatest(outputRoot, snapshotDir) {
  const latestDir = path.join(outputRoot, 'latest');
  ensureDir(latestDir);
  const srcJson = path.join(snapshotDir, 'queue.json');
  const srcMd = path.join(snapshotDir, 'queue.md');
  const dstJson = path.join(latestDir, 'queue.json');
  const dstMd = path.join(latestDir, 'queue.md');
  fs.copyFileSync(srcJson, dstJson);
  fs.copyFileSync(srcMd, dstMd);
  return { latestDir, latestJsonPath: dstJson, latestMdPath: dstMd };
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    usage();
    process.exit(0);
  }

  bootstrapEnv();
  ensureDatabaseUrl();
  await runInfraPreflight();

  const shouldDownloadImages = hasFlag('--download-images');
  const includeAllStatus = hasFlag('--include-all-status');
  const limitArg = readArg('--limit', null);
  const parsedLimit = limitArg ? Number(limitArg) : null;
  const outputRoot = readArg(
    '--output-root',
    '/Users/rogelioguz/Documents/Code House/Activos/Mira/automation_exports/hd_queue'
  );

  ensureDir(outputRoot);

  const postgres = getPostgres();
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    const tasksRaw = await fetchTasks(sql, {
      includeAllStatus,
      limit: parsedLimit,
    });

    const taskIds = tasksRaw.map((t) => t.id);
    const attachmentsRaw = await fetchAttachments(sql, taskIds);
    const activityRaw = await fetchActivity(sql, taskIds);

    const attachmentsByTask = new Map();
    for (const attachment of attachmentsRaw) {
      const list = attachmentsByTask.get(attachment.task_id) || [];
      list.push(attachment);
      attachmentsByTask.set(attachment.task_id, list);
    }

    const activityByTask = new Map();
    for (const activity of activityRaw) {
      const list = activityByTask.get(activity.task_id) || [];
      list.push(activity);
      activityByTask.set(activity.task_id, list);
    }

    const snapshotDir = buildSnapshotDir(outputRoot);
    const evidenceDir = path.join(snapshotDir, 'evidence');
    ensureDir(snapshotDir);
    ensureDir(evidenceDir);

    const evidenceResult = await downloadImageEvidence({
      tasks: tasksRaw,
      attachmentsByTask,
      evidenceRoot: evidenceDir,
      shouldDownloadImages,
    });

    const queueTasks = tasksRaw.map((task) => ({
      id: task.id,
      queue_status: 'pending',
      current_status: task.status,
      title: task.title,
      description: task.description,
      area: task.area,
      assignee_id: task.assignee_id,
      assignee_name: task.assignee_name,
      assignee_email: task.assignee_email,
      creator_id: task.creator_id,
      creator_name: task.creator_name,
      creator_email: task.creator_email,
      is_critical: task.is_critical,
      progress: task.progress,
      blocker_reason: task.blocker_reason,
      completion_notes: task.completion_notes,
      completion_links: task.completion_links || [],
      mentions: task.mentions || [],
      due_date: toIso(task.due_date),
      started_at: toIso(task.started_at),
      completed_at: toIso(task.completed_at),
      created_at: toIso(task.created_at),
      updated_at: toIso(task.updated_at),
      parent_task_id: task.parent_task_id,
      attachments: (attachmentsByTask.get(task.id) || []).map((a) => ({
        id: a.id,
        task_id: a.task_id,
        drive_file_id: a.drive_file_id,
        name: a.name,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
        uploaded_by: a.uploaded_by,
        uploaded_by_name: a.uploaded_by_name,
        uploaded_by_email: a.uploaded_by_email,
        uploaded_at: toIso(a.uploaded_at),
        evidence_relative_path: a.evidence_relative_path || null,
      })),
      activity: (activityByTask.get(task.id) || []).map((act) => ({
        id: act.id,
        task_id: act.task_id,
        user_id: act.user_id,
        actor_name: act.actor_name,
        actor_email: act.actor_email,
        action: act.action,
        metadata: act.metadata,
        area: act.area,
        created_at: toIso(act.created_at),
      })),
    }));

    const snapshotMeta = {
      generatedAt: new Date().toISOString(),
      snapshotDir,
      evidenceDir,
    };

    const queueData = buildQueueData(queueTasks, snapshotMeta);
    const markdown = buildMarkdown(queueData, evidenceResult.warnings);
    const written = writeSnapshotFiles({ snapshotDir, queueData, markdown });
    const latest = refreshLatest(outputRoot, snapshotDir);

    console.log(
      JSON.stringify(
        {
          ok: true,
          exported: true,
          tasksCount: queueTasks.length,
          warnings: evidenceResult.warnings,
          snapshotDir,
          queueJsonPath: written.queueJsonPath,
          queueMdPath: written.queueMdPath,
          latestDir: latest.latestDir,
          latestJsonPath: latest.latestJsonPath,
          latestMdPath: latest.latestMdPath,
        },
        null,
        2
      )
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  const { errorType, message } = classifyError(error);
  console.error(
    JSON.stringify(
      {
        ok: false,
        errorType,
        errorCode: error?.code || null,
        error: message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
