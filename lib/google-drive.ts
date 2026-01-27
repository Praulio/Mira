import { google, drive_v3 } from 'googleapis';

/**
 * Google Drive client for managing task attachments.
 * Uses Service Account authentication for server-side access.
 */

// Singleton instance
let driveClient: drive_v3.Drive | null = null;

/**
 * Root folder ID in Google Drive where Mira stores all task attachments.
 * Structure: {MIRA_FOLDER_ID}/tasks/{taskId}/{filename}
 */
export const MIRA_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

/**
 * Get or create a Google Drive client using Service Account credentials.
 * Uses singleton pattern to avoid recreating auth on each request.
 */
export function getGoogleDriveClient(): drive_v3.Drive {
  if (driveClient) {
    return driveClient;
  }

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  if (!MIRA_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set');
  }

  let credentials: {
    client_email: string;
    private_key: string;
  };

  try {
    // Parse the Service Account key (supports both JSON string and base64)
    const keyString = serviceAccountKey.startsWith('{')
      ? serviceAccountKey
      : Buffer.from(serviceAccountKey, 'base64').toString('utf-8');

    credentials = JSON.parse(keyString);
  } catch {
    throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON or base64-encoded JSON.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    // Full drive scope needed to access folder shared with service account
    // TODO: Consider using drive.file with app-created folders for better security
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });

  return driveClient;
}

/**
 * Find or create a folder for a specific task inside the Mira root folder.
 * Structure: {MIRA_FOLDER_ID}/tasks/{taskId}/
 */
export async function getOrCreateTaskFolder(taskId: string): Promise<string> {
  const drive = getGoogleDriveClient();

  // First, check if 'tasks' folder exists under root
  const tasksFolder = await findFolder(drive, 'tasks', MIRA_FOLDER_ID);
  const tasksFolderId = tasksFolder || await createFolder(drive, 'tasks', MIRA_FOLDER_ID);

  // Then, check if taskId folder exists under 'tasks'
  const taskFolder = await findFolder(drive, taskId, tasksFolderId);
  const taskFolderId = taskFolder || await createFolder(drive, taskId, tasksFolderId);

  return taskFolderId;
}

/**
 * Escape single quotes in strings for Google Drive API queries.
 * Prevents query injection attacks.
 */
function escapeQueryString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Find a folder by name within a parent folder.
 */
async function findFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string | null> {
  // Escape special characters to prevent query injection
  const safeName = escapeQueryString(name);
  const safeParentId = escapeQueryString(parentId);

  const response = await drive.files.list({
    q: `name='${safeName}' and '${safeParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  return response.data.files?.[0]?.id || null;
}

/**
 * Create a new folder within a parent folder.
 */
async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string> {
  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  if (!response.data.id) {
    throw new Error(`Failed to create folder '${name}'`);
  }

  return response.data.id;
}

/**
 * Upload a file to a specific task's folder in Google Drive.
 * Returns the file ID and web view link.
 */
export async function uploadFileToDrive(
  taskId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<{ fileId: string; webViewLink: string | null }> {
  const drive = getGoogleDriveClient();
  const taskFolderId = await getOrCreateTaskFolder(taskId);

  const { Readable } = await import('stream');
  const readable = new Readable();
  readable.push(fileBuffer);
  readable.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [taskFolderId],
    },
    media: {
      mimeType,
      body: readable,
    },
    fields: 'id, webViewLink',
  });

  if (!response.data.id) {
    throw new Error('Failed to upload file to Google Drive');
  }

  return {
    fileId: response.data.id,
    webViewLink: response.data.webViewLink || null,
  };
}

/**
 * Download a file from Google Drive by its file ID.
 * Returns the file content as a Buffer.
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  const drive = getGoogleDriveClient();

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Delete a file from Google Drive by its file ID.
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getGoogleDriveClient();

  await drive.files.delete({ fileId });
}

/**
 * Delete an entire task folder and all its contents.
 * Used when a task is deleted or for cleanup.
 */
export async function deleteTaskFolder(taskId: string): Promise<void> {
  const drive = getGoogleDriveClient();

  // Find 'tasks' folder
  const tasksFolder = await findFolder(drive, 'tasks', MIRA_FOLDER_ID);
  if (!tasksFolder) return;

  // Find task folder
  const taskFolder = await findFolder(drive, taskId, tasksFolder);
  if (!taskFolder) return;

  // Delete the folder (this deletes all contents recursively)
  await drive.files.delete({ fileId: taskFolder });
}

/**
 * Get metadata for a file in Google Drive.
 */
export async function getFileMetadata(fileId: string): Promise<{
  name: string;
  mimeType: string;
  size: string;
} | null> {
  const drive = getGoogleDriveClient();

  try {
    const response = await drive.files.get({
      fileId,
      fields: 'name, mimeType, size',
    });

    return {
      name: response.data.name || 'unknown',
      mimeType: response.data.mimeType || 'application/octet-stream',
      size: response.data.size || '0',
    };
  } catch {
    return null;
  }
}
