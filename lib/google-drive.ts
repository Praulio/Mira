import { google, drive_v3 } from 'googleapis';

// Root folder ID where Mira stores all attachments
export const MIRA_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Singleton instance
let driveClient: drive_v3.Drive | null = null;

/**
 * Get or create a Google Drive client instance using Service Account credentials
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
    credentials = JSON.parse(serviceAccountKey);
  } catch {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY: must be valid JSON');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  driveClient = google.drive({ version: 'v3', auth });

  return driveClient;
}

/**
 * Create a folder for a task under the Mira root folder
 * Returns the folder ID
 */
export async function createTaskFolder(taskId: string): Promise<string> {
  const drive = getGoogleDriveClient();

  // Check if folder already exists
  const existingFolder = await drive.files.list({
    q: `name='${taskId}' and '${MIRA_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (existingFolder.data.files && existingFolder.data.files.length > 0) {
    return existingFolder.data.files[0].id!;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name: taskId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [MIRA_FOLDER_ID!],
    },
    fields: 'id',
  });

  return folder.data.id!;
}

/**
 * Upload a file to the task folder
 * Returns the Drive file ID
 */
export async function uploadFileToDrive(
  taskId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<string> {
  const drive = getGoogleDriveClient();
  const folderId = await createTaskFolder(taskId);

  const { Readable } = await import('stream');
  const stream = Readable.from(fileBuffer);

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id',
  });

  return file.data.id!;
}

/**
 * Download a file from Google Drive
 * Returns the file as a Buffer
 */
export async function downloadFileFromDrive(driveFileId: string): Promise<Buffer> {
  const drive = getGoogleDriveClient();

  const response = await drive.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFileFromDrive(driveFileId: string): Promise<void> {
  const drive = getGoogleDriveClient();
  await drive.files.delete({ fileId: driveFileId });
}

/**
 * Delete a task folder and all its contents from Google Drive
 */
export async function deleteTaskFolder(taskId: string): Promise<void> {
  const drive = getGoogleDriveClient();

  // Find the task folder
  const folder = await drive.files.list({
    q: `name='${taskId}' and '${MIRA_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (folder.data.files && folder.data.files.length > 0) {
    // Deleting a folder also deletes all its contents
    await drive.files.delete({ fileId: folder.data.files[0].id! });
  }
}
