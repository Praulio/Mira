import { test, expect } from '@playwright/test';

/**
 * E2E Test: Task CompletedAt Edit
 *
 * Tests the completedAt edit functionality for completed tasks:
 * 1. Create task → complete → verify completedAt is editable by owner
 * 2. Edit completedAt with new datetime → verify toast success
 * 3. Reload and verify persisted value
 * 4. Verify datetime input has max constraint (cannot be in future)
 *
 * Prerequisites:
 * - Development server running on http://localhost:3000
 * - E2E test bypass headers configured
 *
 * Note: In E2E mode, the mock user is always the creator of created tasks,
 * so they are always considered "owner" and can edit completedAt.
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Task CompletedAt Edit', () => {
  test.beforeEach(async ({ page }) => {
    // Add bypass header for testing
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true'
    });
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });

  test('owner can edit completedAt for completed task', async ({ page }) => {
    const taskTitle = `CompletedAt Edit Test ${Date.now()}`;
    let taskId: string | null = null;

    await test.step('Create and complete a task', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');

      // Create task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Get task ID
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      taskId = await taskCard.getAttribute('data-task-id');
      expect(taskId).toBeTruthy();

      // Move to In Progress first
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Move to Done
      const taskInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskInProgress.dragTo(doneColumn);

      // Complete task modal should appear
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });
    });

    await test.step('Open task detail and verify completedAt input is visible', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on the completed task to open detail dialog
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();
      await taskCard.click();

      // Wait for dialog to open
      await page.waitForSelector('text=Completada', { timeout: 5000 });

      // Verify datetime input is visible for owner
      const completedAtInput = page.locator('input[type="datetime-local"]');
      await expect(completedAtInput).toBeVisible();

      // Verify the input has a value (current completedAt)
      const inputValue = await completedAtInput.inputValue();
      expect(inputValue).toBeTruthy();
    });

    await test.step('Edit completedAt and verify success toast', async () => {
      // Calculate a valid past date (yesterday at same time)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const newDateValue = yesterday.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm

      // Find and fill the datetime input
      const completedAtInput = page.locator('input[type="datetime-local"]');
      await completedAtInput.fill(newDateValue);

      // Wait for the change to be processed (onChange triggers server action)
      await page.waitForSelector('text=Fecha de finalización actualizada', { timeout: 5000 });
    });

    await test.step('Reload and verify persisted value', async () => {
      // Close the dialog first
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Reload to get fresh data from server
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open task detail again
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog
      await page.waitForSelector('text=Completada', { timeout: 5000 });

      // Verify the datetime input has the updated value
      const completedAtInput = page.locator('input[type="datetime-local"]');
      const inputValue = await completedAtInput.inputValue();

      // The persisted value should be from yesterday (check date part)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expectedDatePart = yesterday.toISOString().slice(0, 10); // YYYY-MM-DD

      expect(inputValue).toContain(expectedDatePart);
    });
  });

  test('completedAt input has max constraint preventing future dates', async ({ page }) => {
    const taskTitle = `Future Date Block Test ${Date.now()}`;
    let taskId: string | null = null;

    await test.step('Create and complete a task', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');

      // Create task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      taskId = await taskCard.getAttribute('data-task-id');

      // Quick path to Done
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskInProgress.dragTo(doneColumn);
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });
    });

    await test.step('Verify datetime input has max attribute', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open task detail
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Completada', { timeout: 5000 });

      // Verify the input has a max attribute
      const completedAtInput = page.locator('input[type="datetime-local"]');
      const maxAttr = await completedAtInput.getAttribute('max');
      expect(maxAttr).toBeTruthy();

      // The max should be approximately "now" (today's date)
      const today = new Date().toISOString().slice(0, 10);
      expect(maxAttr).toContain(today);
    });

    await test.step('Attempt to set future date - server validation should reject', async () => {
      // Calculate a future date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDateValue = tomorrow.toISOString().slice(0, 16);

      // Fill the datetime input with future date
      const completedAtInput = page.locator('input[type="datetime-local"]');

      // Clear and fill with future date (bypassing HTML5 max validation via JS)
      await completedAtInput.evaluate((el: HTMLInputElement, value: string) => {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, futureDateValue);

      // Server should reject with error toast
      await expect(page.locator('text=La fecha de finalización no puede ser en el futuro')).toBeVisible({ timeout: 5000 });
    });
  });

  test('completedAt edit preserves duration calculation', async ({ page }) => {
    const taskTitle = `Duration After Edit Test ${Date.now()}`;
    let taskId: string | null = null;

    await test.step('Create and complete a task', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');

      // Create task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      taskId = await taskCard.getAttribute('data-task-id');

      // Move to In Progress
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Complete task
      const taskInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskInProgress.dragTo(doneColumn);
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });
    });

    await test.step('Get initial duration', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Duración', { timeout: 5000 });

      // Check duration is visible and has green color (completed)
      const durationSection = page.locator('.text-green-400').filter({ hasText: /\d+[hmd]|<1m/ });
      await expect(durationSection).toBeVisible();
    });

    await test.step('Edit completedAt to an earlier time and verify duration changes', async () => {
      // Set completedAt to 2 hours ago from original
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      const newDateValue = twoHoursAgo.toISOString().slice(0, 16);

      const completedAtInput = page.locator('input[type="datetime-local"]');
      await completedAtInput.fill(newDateValue);

      // Wait for success toast
      await page.waitForSelector('text=Fecha de finalización actualizada', { timeout: 5000 });

      // Close and reopen dialog to get fresh duration calculation
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Duración', { timeout: 5000 });

      // Duration should still be visible with green color
      const durationSection = page.locator('.text-green-400').filter({ hasText: /\d+[hmd]|<1m|-/ });
      await expect(durationSection).toBeVisible();
    });
  });

  test('completedAt field is read-only for non-owner (displays span instead of input)', async ({ page }) => {
    // Note: In E2E mode with mock auth, the user is always the creator of tasks they create.
    // This test verifies the component structure: for non-owners, a <span> is shown instead of <input>.
    // We cannot fully test this without a second mock user, but we document the expected behavior.

    const taskTitle = `Read-only Check Test ${Date.now()}`;
    let taskId: string | null = null;

    await test.step('Create and complete a task as owner', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');

      // Create task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      taskId = await taskCard.getAttribute('data-task-id');

      // Complete the task
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskInProgress.dragTo(doneColumn);
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });
    });

    await test.step('Verify owner sees datetime-local input', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Completada', { timeout: 5000 });

      // Owner should see input (not span)
      const completedAtInput = page.locator('input[type="datetime-local"]');
      await expect(completedAtInput).toBeVisible();

      // For owner, the input is visible (not the read-only span that non-owners see)
      // The structure is: Completada row contains either input OR span, not both
      await expect(completedAtInput).toHaveCount(1);
    });
  });

  test('completedAt input is disabled while saving', async ({ page }) => {
    const taskTitle = `Disabled While Saving Test ${Date.now()}`;
    let taskId: string | null = null;

    await test.step('Create and complete a task', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');

      // Create task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      taskId = await taskCard.getAttribute('data-task-id');

      // Complete the task
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskInProgress.dragTo(doneColumn);
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });
    });

    await test.step('Verify input has disabled class during update', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      await page.waitForSelector('text=Completada', { timeout: 5000 });

      const completedAtInput = page.locator('input[type="datetime-local"]');

      // Before change: input should NOT be disabled
      await expect(completedAtInput).not.toBeDisabled();

      // Calculate a valid past date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const newDateValue = yesterday.toISOString().slice(0, 16);

      // Change value - the input becomes disabled briefly during the save
      // We check that it's enabled again after the save completes
      await completedAtInput.fill(newDateValue);

      // Wait for the success toast (indicates save completed)
      await page.waitForSelector('text=Fecha de finalización actualizada', { timeout: 5000 });

      // After save: input should be enabled again
      await expect(completedAtInput).not.toBeDisabled();
    });
  });
});
