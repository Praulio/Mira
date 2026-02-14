#!/usr/bin/env node

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
let postgresLib = null;

const command = process.argv[2];
const rawArgs = process.argv.slice(3);

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
      '  node scripts/automation/hd-task-lifecycle.js claim [--run-id <id>] [--claimed-by <name>] [--download-images]',
      '  node scripts/automation/hd-task-lifecycle.js complete --task-id <uuid> --branch <branch> --commit-sha <sha> [--run-id <id>] [--target-repo <name>]',
      '  node scripts/automation/hd-task-lifecycle.js fail --task-id <uuid> --error <message> [--run-id <id>]',
      '',
      'Env required:',
      '  DATABASE_URL',
    ].join('\n')
  );
}

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
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

function buildRunId() {
  return `run_${new Date().toISOString()}_${Math.random().toString(36).slice(2, 8)}`;
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

function getPostgres() {
  if (postgresLib) return postgresLib;
  try {
    // Load lazily so the script can print a clear error when dependencies are missing.
    postgresLib = require('postgres');
  } catch {
    throw new Error("Dependency 'postgres' is missing. Run 'npm ci' in the Mira workspace.");
  }
  return postgresLib;
}

function getDriveClient() {
  const credentials = parseServiceAccountKey();
  if (!credentials) {
    return {
      drive: null,
      warning: 'GOOGLE_SERVICE_ACCOUNT_KEY is not configured; image download skipped.',
    };
  }

  let googleApi = null;
  try {
    googleApi = require('googleapis').google;
  } catch {
    return {
      drive: null,
      warning: "Dependency 'googleapis' is missing. Run 'npm ci' in the Mira workspace.",
    };
  }

  const auth = new googleApi.auth.GoogleAuth({
    credentials: {
      client_email: credentials.clientEmail,
      private_key: credentials.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return {
    drive: googleApi.drive({ version: 'v3', auth }),
    warning: null,
  };
}

function sanitizeFilename(fileName) {
  return fileName.replace(/[^\w.-]/g, '_');
}

async function fetchTaskAttachments(sql, taskId) {
  const rows = await sql.unsafe(
    `
      SELECT id, name, mime_type, drive_file_id, size_bytes
      FROM attachments
      WHERE task_id = $1
      ORDER BY uploaded_at ASC;
    `,
    [taskId]
  );

  return rows;
}

async function downloadImageAttachments(taskId, attachments) {
  const { drive, warning } = getDriveClient();
  if (!drive) {
    return {
      downloaded: [],
      warning,
    };
  }

  const imageAttachments = attachments.filter((a) => a.mime_type && a.mime_type.startsWith('image/'));
  if (!imageAttachments.length) {
    return { downloaded: [] };
  }

  const outputDir = path.join('/tmp', 'mira-task-images', taskId);
  fs.mkdirSync(outputDir, { recursive: true });

  const downloaded = [];

  for (const attachment of imageAttachments) {
    const response = await drive.files.get(
      { fileId: attachment.drive_file_id, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );

    const filePath = path.join(outputDir, sanitizeFilename(attachment.name));
    fs.writeFileSync(filePath, Buffer.from(response.data));
    downloaded.push({
      attachmentId: attachment.id,
      name: attachment.name,
      mimeType: attachment.mime_type,
      localPath: filePath,
    });
  }

  return { downloaded };
}

async function claimTask(sql) {
  const runId = readArg('--run-id', buildRunId());
  const claimedBy = readArg('--claimed-by', process.env.AUTOMATION_ID || 'regvisar-mis-tasks');
  const shouldDownloadImages = hasFlag('--download-images');

  const rows = await sql.begin(async (tx) => tx.unsafe(
    `
      WITH candidate AS (
        SELECT t.id
        FROM tasks t
        INNER JOIN users u ON u.id = t.assignee_id
        WHERE (
          lower(u.name) LIKE '%rogelio%'
          OR lower(u.email) LIKE '%rogelio%'
          OR lower(u.email) = 'roger@ezyai.pro'
        )
          AND t.status NOT IN ('done', 'in_progress')
          AND (
            lower(t.title) LIKE '%hd%'
            OR lower(t.title) LIKE '%happy dreamers%'
          )
          AND COALESCE(t.automation_status::text, '') NOT IN ('claimed', 'completed')
        ORDER BY t.updated_at DESC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE tasks t
      SET
        automation_status = 'claimed',
        automation_claimed_by = $1,
        automation_claimed_at = NOW(),
        automation_run_id = $2,
        automation_last_error = NULL,
        updated_at = NOW()
      FROM candidate
      WHERE t.id = candidate.id
      RETURNING t.id, t.title, t.description, t.status, t.area, t.assignee_id, t.updated_at, t.automation_run_id;
    `,
    [claimedBy, runId]
  ));

  if (!rows.length) {
    console.log(JSON.stringify({ ok: true, claimed: false, reason: 'no_eligible_task' }, null, 2));
    return;
  }

  const task = rows[0];
  const attachments = await fetchTaskAttachments(sql, task.id);
  const imageDownload = shouldDownloadImages
    ? await downloadImageAttachments(task.id, attachments)
    : { downloaded: [] };

  console.log(
    JSON.stringify(
      {
        ok: true,
        claimed: true,
        task,
        attachments,
        imageDownload,
      },
      null,
      2
    )
  );
}

async function completeTask(sql) {
  const taskId = readArg('--task-id');
  const branch = readArg('--branch');
  const commitSha = readArg('--commit-sha');
  const runId = readArg('--run-id', null);
  const targetRepo = readArg('--target-repo', 'happy_dreamersV2');

  if (!taskId || !branch || !commitSha) {
    throw new Error('Missing required args for complete: --task-id --branch --commit-sha');
  }

  const rows = await sql.unsafe(
    `
      UPDATE tasks
      SET
        automation_status = 'completed',
        automation_completed_at = NOW(),
        automation_target_repo = $1,
        automation_branch = $2,
        automation_commit_sha = $3,
        automation_run_id = COALESCE($4, automation_run_id),
        automation_last_error = NULL,
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, title, automation_status, automation_branch, automation_commit_sha, automation_completed_at;
    `,
    [targetRepo, branch, commitSha, runId, taskId]
  );

  if (!rows.length) {
    throw new Error(`Task not found for completion: ${taskId}`);
  }

  console.log(JSON.stringify({ ok: true, completed: true, task: rows[0] }, null, 2));
}

async function failTask(sql) {
  const taskId = readArg('--task-id');
  const errorMessage = readArg('--error');
  const runId = readArg('--run-id', null);

  if (!taskId || !errorMessage) {
    throw new Error('Missing required args for fail: --task-id --error');
  }

  const rows = await sql.unsafe(
    `
      UPDATE tasks
      SET
        automation_status = 'failed',
        automation_last_error = $1,
        automation_run_id = COALESCE($2, automation_run_id),
        updated_at = NOW()
      WHERE id = $3
      RETURNING id, title, automation_status, automation_last_error, updated_at;
    `,
    [errorMessage, runId, taskId]
  );

  if (!rows.length) {
    throw new Error(`Task not found for fail update: ${taskId}`);
  }

  console.log(JSON.stringify({ ok: true, failed: true, task: rows[0] }, null, 2));
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    usage();
    process.exit(command ? 0 : 1);
  }

  bootstrapEnv();
  ensureDatabaseUrl();

  const postgres = getPostgres();
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    if (command === 'claim') {
      await claimTask(sql);
    } else if (command === 'complete') {
      await completeTask(sql);
    } else if (command === 'fail') {
      await failTask(sql);
    } else {
      usage();
      throw new Error(`Unknown command: ${command}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
