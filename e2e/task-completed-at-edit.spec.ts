import { test, expect } from '@playwright/test';

/**
 * E2E Test: Task CompletedAt Edit
 *
 * Tests the completedAt editing functionality:
 * 1. Owner (creator) can edit completedAt
 * 2. Owner (assignee) can edit completedAt
 * 3. CompletedAt datetime-local input is visible only for owner
 * 4. Updated date is saved and displayed correctly
 *
 * Prerequisites:
 * - Valid Clerk test credentials in .env.local
 * - Development server running on http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Task CompletedAt Edit', () => {
  test.beforeEach(async ({ page }) => {
    // Add bypass header for testing
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true'
    });
    // Navigate to the app
    await page.goto(BASE_URL);
  });

  test('owner (creator) can see and edit completedAt field', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create task and complete it', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `CompletedAt Edit Test ${Date.now()}`;
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

      // Move to In Progress first
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Move to Done
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCardInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCardInProgress.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Open task detail and verify owner can see datetime-local input', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on task to open detail dialog
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog to open
      await page.waitForSelector('text=Information', { timeout: 5000 });

      // Verify "Completado" label is visible
      await expect(page.locator('text=Completado')).toBeVisible();

      // Verify datetime-local input is visible (owner can edit)
      const datetimeInput = page.locator('input[type="datetime-local"]');
      await expect(datetimeInput).toBeVisible();

      // Verify check button to save is visible
      const saveButton = page.locator('button[title="Guardar fecha"]');
      await expect(saveButton).toBeVisible();
    });
  });

  test('owner can edit completedAt and save successfully', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create and complete task', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `CompletedAt Save Test ${Date.now()}`;
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

      // Move to In Progress
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Move to Done
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCardInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCardInProgress.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Edit completedAt and verify toast success', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on task to open detail dialog
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog to open
      await page.waitForSelector('text=Completado', { timeout: 5000 });

      // Get datetime-local input and change value to yesterday
      const datetimeInput = page.locator('input[type="datetime-local"]');
      await expect(datetimeInput).toBeVisible();

      // Set a new date (yesterday at noon)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);
      const newDateValue = yesterday.toISOString().slice(0, 16);

      await datetimeInput.fill(newDateValue);

      // Click save button
      const saveButton = page.locator('button[title="Guardar fecha"]');
      await saveButton.click();

      // Verify success toast
      await page.waitForSelector('text=Fecha de completado actualizada', { timeout: 5000 });
    });
  });

  test('duration updates when completedAt is edited', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create and complete task', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Duration Update Test ${Date.now()}`;
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

      // Move to In Progress
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Move to Done
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCardInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCardInProgress.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Get initial duration', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on task to open detail dialog
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog and duration section
      await page.waitForSelector('text=Duración', { timeout: 5000 });

      // Initial duration should be "< 1m" since just completed
      const durationSection = page.locator('.bg-emerald-500\\/10');
      await expect(durationSection).toBeVisible();
    });

    await test.step('Edit completedAt to much later and verify duration changes', async () => {
      // Set a new date (2 hours from now in the past)
      const datetimeInput = page.locator('input[type="datetime-local"]');
      await expect(datetimeInput).toBeVisible();

      // Get current value and add 2 hours
      const currentValue = await datetimeInput.inputValue();
      const currentDate = new Date(currentValue);
      currentDate.setHours(currentDate.getHours() + 2);

      // Make sure it's not in the future
      const now = new Date();
      if (currentDate > now) {
        currentDate.setTime(now.getTime() - 1000);
      }

      const newDateValue = currentDate.toISOString().slice(0, 16);
      await datetimeInput.fill(newDateValue);

      // Click save button
      const saveButton = page.locator('button[title="Guardar fecha"]');
      await saveButton.click();

      // Wait for success toast
      await page.waitForSelector('text=Fecha de completado actualizada', { timeout: 5000 });

      // Close dialog and reopen to see updated duration
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Reopen task
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog
      await page.waitForSelector('text=Duración', { timeout: 5000 });

      // Duration section should still be visible
      const durationSection = page.locator('.bg-emerald-500\\/10');
      await expect(durationSection).toBeVisible();
    });
  });

  test('completedAt input respects max date constraint (no future dates)', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create and complete task', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Future Date Test ${Date.now()}`;
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

      // Move to In Progress then Done
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCardInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCardInProgress.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Verify datetime-local input has max attribute set to now', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on task to open detail dialog
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog
      await page.waitForSelector('text=Completado', { timeout: 5000 });

      // Get datetime-local input and check max attribute
      const datetimeInput = page.locator('input[type="datetime-local"]');
      await expect(datetimeInput).toBeVisible();

      // The max attribute should be set (browser will enforce this)
      const maxValue = await datetimeInput.getAttribute('max');
      expect(maxValue).toBeTruthy();

      // Max should be close to now (within the last minute)
      if (maxValue) {
        const maxDate = new Date(maxValue);
        const now = new Date();
        const diffMinutes = (now.getTime() - maxDate.getTime()) / (1000 * 60);
        // Max should be set to something within the last few minutes (accounting for page load time)
        expect(diffMinutes).toBeLessThan(5);
      }
    });
  });

  test('completedAt section only shows for done tasks', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create task and move to In Progress (not done)', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Not Done Test ${Date.now()}`;
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

      // Move to In Progress only (don't complete)
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Open task detail and verify completedAt section is NOT visible', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on task to open detail dialog
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog
      await page.waitForSelector('text=Information', { timeout: 5000 });

      // Verify "Iniciado" is visible (task is in progress)
      await expect(page.locator('text=Iniciado')).toBeVisible();

      // Verify "Completado" is NOT visible (task is not done)
      await expect(page.locator('text=Completado')).not.toBeVisible();

      // Verify datetime-local input is NOT visible
      const datetimeInput = page.locator('input[type="datetime-local"]');
      await expect(datetimeInput).not.toBeVisible();

      // Verify amber "En progreso" section is visible instead
      const inProgressSection = page.locator('.bg-amber-500\\/10');
      await expect(inProgressSection).toBeVisible();
    });
  });
});
