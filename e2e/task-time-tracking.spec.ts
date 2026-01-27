import { test, expect } from '@playwright/test';

/**
 * E2E Test: Task Time Tracking
 *
 * Tests the time tracking feature:
 * 1. Create task → drag to In Progress → verify startedAt is captured
 * 2. Verify duration displays in TaskCard (amber pulsing for in_progress)
 * 3. Complete task → verify duration in TaskCard (green for done)
 * 4. Verify duration is visible in TaskDetailDialog
 *
 * Prerequisites:
 * - Development server running on http://localhost:3000
 * - E2E test bypass headers configured
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Task Time Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Add bypass header for testing
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true'
    });
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });

  test('captures startedAt when task moves to In Progress', async ({ page }) => {
    const taskTitle = `Time Track Test ${Date.now()}`;

    await test.step('Create a new task in Backlog', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');

      // Create task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });
    });

    await test.step('Move task to In Progress and verify startedAt', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find the task card
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await expect(taskCard).toBeVisible();

      // Get task ID
      const taskId = await taskCard.getAttribute('data-task-id');
      expect(taskId).toBeTruthy();

      // Find In Progress column
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await expect(inProgressColumn).toBeVisible();

      // Drag to In Progress
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Wait for update
      await page.waitForTimeout(500);

      // Find the task in In Progress column
      const movedTask = inProgressColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(movedTask).toBeVisible();

      // Verify status changed
      await expect(movedTask).toHaveAttribute('data-task-status', 'in_progress');
    });

    await test.step('Verify duration displays in TaskCard', async () => {
      // Find the task card in In Progress
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();

      // Duration should show (either "<1m" initially or a time value)
      // The duration is shown with a Clock icon
      const durationDisplay = taskCard.locator('text=/\\d+[hmd]|<1m/');
      await expect(durationDisplay).toBeVisible({ timeout: 5000 });

      // Verify amber color class for in_progress (animate-pulse)
      const clockSection = taskCard.locator('.text-amber-400');
      await expect(clockSection).toBeVisible();
    });

    await test.step('Open detail dialog and verify startedAt info', async () => {
      // Click on task to open detail
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await taskCard.click();

      // Wait for dialog
      await page.waitForSelector('text=Iniciada', { timeout: 5000 });

      // Verify "Iniciada" field is visible with a date value
      const startedAtRow = page.locator('text=Iniciada').locator('..');
      await expect(startedAtRow).toBeVisible();

      // Verify duration section exists with amber color
      const durationSection = page.locator('text=Duración').locator('..');
      await expect(durationSection).toBeVisible();

      // Close dialog
      await page.keyboard.press('Escape');
    });
  });

  test('shows correct duration format after completing task', async ({ page }) => {
    const taskTitle = `Duration Format Test ${Date.now()}`;

    await test.step('Create and move task to In Progress', async () => {
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

      // Move to In Progress
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Complete the task', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find task and drag to Done
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      const taskId = await taskCard.getAttribute('data-task-id');

      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCard.dragTo(doneColumn);

      // Complete task modal should appear
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });

      // Submit completion
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });

      // Verify task is in Done column
      await page.reload();
      await page.waitForLoadState('networkidle');

      const completedTask = doneColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(completedTask).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify green duration in completed TaskCard', async () => {
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();

      // Duration should show
      const durationDisplay = taskCard.locator('text=/\\d+[hmd]|<1m/');
      await expect(durationDisplay).toBeVisible({ timeout: 5000 });

      // Verify green color class for done (emerald-400)
      const clockSection = taskCard.locator('.text-emerald-400');
      await expect(clockSection).toBeVisible();
    });

    await test.step('Open detail and verify Completada field', async () => {
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await taskCard.click();

      // Wait for dialog with done status
      await page.waitForSelector('text=done', { timeout: 5000 });

      // Verify "Completada" field is visible
      const completedAtRow = page.locator('text=Completada').locator('..');
      await expect(completedAtRow).toBeVisible();

      // Verify "Duración" section shows green color
      const durationValue = page.locator('.text-green-400').filter({ hasText: /\d+[hmd]|<1m/ });
      await expect(durationValue).toBeVisible();
    });
  });

  test('task without startedAt shows dash for duration', async ({ page }) => {
    // This tests edge case: a task completed without going through In Progress
    // For now, we verify that tasks in backlog/todo don't show duration

    await test.step('Create a task and verify no duration shown', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');

      const taskTitle = `No Duration Test ${Date.now()}`;

      // Create task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find the task in Backlog
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await expect(taskCard).toBeVisible();

      // Verify NO duration/clock is shown (only status dot)
      const clockIcon = taskCard.locator('.text-emerald-400, .text-amber-400');
      await expect(clockIcon).not.toBeVisible();

      // Verify status dot IS shown
      const statusDot = taskCard.locator('.h-1\\.5.w-1\\.5.rounded-full');
      await expect(statusDot).toBeVisible();
    });
  });

  test('duration updates live for in_progress tasks', async ({ page }) => {
    // This test verifies the live update mechanism
    // Note: Full timing test would require waiting 60+ seconds
    // We verify the mechanism exists and initial state is correct

    const taskTitle = `Live Duration Test ${Date.now()}`;

    await test.step('Create and move task to In Progress', async () => {
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

      // Move to In Progress
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Verify amber pulsing animation for in_progress', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();

      // Verify animate-pulse class is present on in_progress duration
      const pulsingElement = taskCard.locator('.animate-pulse');
      await expect(pulsingElement).toBeVisible();

      // Verify text-amber-400 class
      const amberElement = taskCard.locator('.text-amber-400');
      await expect(amberElement).toBeVisible();
    });
  });
});
