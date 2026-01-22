import { test, expect } from '@playwright/test';

/**
 * E2E Test: Task Attachments
 *
 * Tests the attachment functionality:
 * 1. Upload file -> Verify appears in attachment list
 * 2. Download file -> Verify download triggers
 * 3. Delete file -> Verify removed from list
 * 4. Blocking behavior for done tasks
 *
 * Prerequisites:
 * - Valid Clerk test credentials in .env.local
 * - Development server running on http://localhost:3000
 * - Google Drive API configured (GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_FOLDER_ID)
 *
 * Note: These tests require Google Drive credentials to be configured.
 * If credentials are not available, upload/download tests may fail gracefully.
 */

const BASE_URL = 'http://localhost:3000';

// Create a temporary test file for upload tests
const TEST_FILE_NAME = 'test-attachment.txt';
const TEST_FILE_CONTENT = 'This is a test file for Mira attachment E2E tests.';

test.describe('Task Attachments', () => {
  test.beforeEach(async ({ page }) => {
    // Add bypass header for testing
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true'
    });
    // Navigate to the app
    await page.goto(BASE_URL);
  });

  test('can upload a file and see it in attachment list', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create a new task in Backlog', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Attachment Upload Test ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.fill('[data-testid="task-description-input"]', 'Testing attachment upload functionality');

      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      // Reload and find task
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await expect(taskCard).toBeVisible({ timeout: 5000 });

      taskId = await taskCard.getAttribute('data-task-id') || '';
      expect(taskId).toBeTruthy();
    });

    await test.step('Open task detail dialog', async () => {
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog to open - check for Adjuntos section
      await page.waitForSelector('text=Adjuntos', { timeout: 5000 });
    });

    await test.step('Upload a test file via file input', async () => {
      // Find the hidden file input inside FileDropzone
      const fileInput = page.locator('input[type="file"]');

      // Create a test file buffer
      const testFileBuffer = Buffer.from(TEST_FILE_CONTENT, 'utf-8');

      // Upload the file
      await fileInput.setInputFiles({
        name: TEST_FILE_NAME,
        mimeType: 'text/plain',
        buffer: testFileBuffer,
      });

      // Wait for upload success toast
      await page.waitForSelector(`text="${TEST_FILE_NAME}" subido correctamente`, { timeout: 15000 });
    });

    await test.step('Verify file appears in attachment list', async () => {
      // Verify the file name appears in the attachment list
      const attachmentItem = page.locator('text=' + TEST_FILE_NAME);
      await expect(attachmentItem).toBeVisible({ timeout: 5000 });

      // Verify download button is present
      const downloadButton = page.locator(`a[href*="/api/attachments/"][href*="/download"]`).first();
      await expect(downloadButton).toBeVisible();
    });
  });

  test('can delete an attachment from the list', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';
    const deleteTestFileName = `delete-test-${Date.now()}.txt`;

    await test.step('Create a new task in Backlog', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Attachment Delete Test ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);

      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await expect(taskCard).toBeVisible({ timeout: 5000 });

      taskId = await taskCard.getAttribute('data-task-id') || '';
    });

    await test.step('Open task detail and upload a file', async () => {
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Adjuntos', { timeout: 5000 });

      // Upload a file
      const fileInput = page.locator('input[type="file"]');
      const testFileBuffer = Buffer.from('File to be deleted', 'utf-8');

      await fileInput.setInputFiles({
        name: deleteTestFileName,
        mimeType: 'text/plain',
        buffer: testFileBuffer,
      });

      await page.waitForSelector(`text="${deleteTestFileName}" subido correctamente`, { timeout: 15000 });

      // Verify file appears in list
      await expect(page.locator(`text=${deleteTestFileName}`)).toBeVisible();
    });

    await test.step('Delete the attachment', async () => {
      // Find and click the delete button (Trash2 icon button)
      // The delete button is in the same row as the file name
      const attachmentRow = page.locator('div').filter({ hasText: deleteTestFileName }).first();
      const deleteButton = attachmentRow.locator('button[title="Eliminar"]');

      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      // Wait for deletion success toast
      await page.waitForSelector(`text="${deleteTestFileName}" eliminado`, { timeout: 10000 });
    });

    await test.step('Verify file is removed from list', async () => {
      // The file should no longer be visible in the attachment list
      await expect(page.locator(`text=${deleteTestFileName}`)).not.toBeVisible({ timeout: 5000 });
    });
  });

  test('completed task shows dropzone as blocked', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create and complete a task', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Blocked Dropzone Test ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);

      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await expect(taskCard).toBeVisible({ timeout: 5000 });

      taskId = await taskCard.getAttribute('data-task-id') || '';

      // Move task to Done
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCard.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Open completed task detail', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Adjuntos', { timeout: 5000 });
    });

    await test.step('Verify dropzone shows blocked message', async () => {
      // The dropzone should show the blocked message for completed tasks
      const blockedMessage = page.locator('text=Adjuntos bloqueados en tareas completadas');
      await expect(blockedMessage).toBeVisible();

      // The file input should not be present or the dropzone should be disabled
      // Verify the upload area is not interactive (no drag prompt)
      const uploadPrompt = page.locator('text=Arrastra archivos aquí');
      await expect(uploadPrompt).not.toBeVisible();
    });
  });

  test('attachment count shows as clip icon on task card', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';
    const clipTestFileName = `clip-test-${Date.now()}.txt`;

    await test.step('Create a new task in Backlog', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Clip Icon Test ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);

      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await expect(taskCard).toBeVisible({ timeout: 5000 });

      taskId = await taskCard.getAttribute('data-task-id') || '';
    });

    await test.step('Verify task card has no clip icon initially', async () => {
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);

      // The Paperclip icon should not be visible when attachmentCount is 0
      // Paperclip icon is from lucide-react, checking for the SVG or wrapper
      const clipIcon = taskCard.locator('svg.lucide-paperclip');
      await expect(clipIcon).not.toBeVisible();
    });

    await test.step('Upload a file to the task', async () => {
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Adjuntos', { timeout: 5000 });

      // Upload a file
      const fileInput = page.locator('input[type="file"]');
      const testFileBuffer = Buffer.from('Test file for clip icon', 'utf-8');

      await fileInput.setInputFiles({
        name: clipTestFileName,
        mimeType: 'text/plain',
        buffer: testFileBuffer,
      });

      await page.waitForSelector(`text="${clipTestFileName}" subido correctamente`, { timeout: 15000 });

      // Close the dialog
      await page.click('button:has-text("Close")');
    });

    await test.step('Verify clip icon appears on task card', async () => {
      // Reload to get fresh attachment count
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // The Paperclip icon should now be visible
      // Check for the attachment count indicator (the span with "1")
      const attachmentIndicator = taskCard.locator('text=1').first();
      await expect(attachmentIndicator).toBeVisible({ timeout: 5000 });
    });
  });

  test('completed task shows attachments as readonly (no delete button)', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';
    const readonlyTestFileName = `readonly-test-${Date.now()}.txt`;

    await test.step('Create a task and upload a file', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Readonly Attachment Test ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);

      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await expect(taskCard).toBeVisible({ timeout: 5000 });

      taskId = await taskCard.getAttribute('data-task-id') || '';

      // Open dialog and upload file
      await taskCard.click();
      await page.waitForSelector('text=Adjuntos', { timeout: 5000 });

      const fileInput = page.locator('input[type="file"]');
      const testFileBuffer = Buffer.from('Test file for readonly check', 'utf-8');

      await fileInput.setInputFiles({
        name: readonlyTestFileName,
        mimeType: 'text/plain',
        buffer: testFileBuffer,
      });

      await page.waitForSelector(`text="${readonlyTestFileName}" subido correctamente`, { timeout: 15000 });

      // Close dialog
      await page.click('button:has-text("Close")');
    });

    await test.step('Complete the task', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');

      await taskCard.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Open completed task and verify attachment is readonly', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Adjuntos', { timeout: 5000 });

      // Verify the attachment is visible
      await expect(page.locator(`text=${readonlyTestFileName}`)).toBeVisible();

      // Verify the download button is still visible
      const downloadButton = page.locator(`a[href*="/api/attachments/"][href*="/download"]`).first();
      await expect(downloadButton).toBeVisible();

      // Verify the delete button is NOT visible (readonly mode)
      const deleteButton = page.locator('button[title="Eliminar"]');
      await expect(deleteButton).not.toBeVisible();
    });
  });
});
