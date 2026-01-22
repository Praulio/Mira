import { test, expect } from '@playwright/test';

/**
 * E2E Test: Task Done Blocking
 *
 * Tests that completed (Done) tasks cannot be moved:
 * 1. Complete a task -> Attempt to drag -> Verify toast error
 * 2. Verify task remains in Done column after drag attempt
 * 3. Verify error message is correct
 *
 * Prerequisites:
 * - Valid Clerk test credentials in .env.local
 * - Development server running on http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Task Done Blocking', () => {
  test.beforeEach(async ({ page }) => {
    // Add bypass header for testing
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true'
    });
    // Navigate to the app
    await page.goto(BASE_URL);
  });

  test('completed task cannot be moved and shows error toast', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create task and move to Done', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Block Done Test ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.fill('[data-testid="task-description-input"]', 'Testing done blocking functionality');

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

      // Move to Done directly
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await expect(doneColumn).toBeVisible();

      await taskCard.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Verify task is now in Done column
      await expect(doneColumn.locator(`[data-task-id="${taskId}"]`)).toBeVisible({ timeout: 5000 });
    });

    await test.step('Attempt to drag completed task to In Progress', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Verify task is in Done status
      await expect(taskCard).toHaveAttribute('data-task-status', 'done');

      // Attempt to drag to In Progress
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await expect(inProgressColumn).toBeVisible();

      await taskCard.dragTo(inProgressColumn);

      // Verify error toast appears
      await page.waitForSelector('text=Las tareas completadas no se pueden mover', { timeout: 5000 });
    });

    await test.step('Verify task remains in Done column', async () => {
      // Task should still be in Done column after failed drag
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      const taskCard = doneColumn.locator(`[data-task-id="${taskId}"]`);

      await expect(taskCard).toBeVisible();
      await expect(taskCard).toHaveAttribute('data-task-status', 'done');

      // Verify task is NOT in In Progress column
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await expect(inProgressColumn.locator(`[data-task-id="${taskId}"]`)).not.toBeVisible();
    });
  });

  test('completed task cannot be moved to Backlog', async ({ page }) => {
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

      taskTitle = `Block Backlog Test ${Date.now()}`;
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

      // Move to Done
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCard.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Attempt to drag completed task to Backlog', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Attempt to drag to Backlog
      const backlogColumn = page.locator('[data-testid="kanban-column-backlog"]');
      await expect(backlogColumn).toBeVisible();

      await taskCard.dragTo(backlogColumn);

      // Verify error toast appears
      await page.waitForSelector('text=Las tareas completadas no se pueden mover', { timeout: 5000 });
    });

    await test.step('Verify task remains in Done column', async () => {
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      const taskCard = doneColumn.locator(`[data-task-id="${taskId}"]`);

      await expect(taskCard).toBeVisible();

      // Verify task is NOT in Backlog column
      const backlogColumn = page.locator('[data-testid="kanban-column-backlog"]');
      await expect(backlogColumn.locator(`[data-task-id="${taskId}"]`)).not.toBeVisible();
    });
  });

  test('completed task cannot be moved to Todo', async ({ page }) => {
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

      taskTitle = `Block Todo Test ${Date.now()}`;
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

      // Move to Done
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCard.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Attempt to drag completed task to Todo', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Attempt to drag to Todo
      const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
      await expect(todoColumn).toBeVisible();

      await taskCard.dragTo(todoColumn);

      // Verify error toast appears
      await page.waitForSelector('text=Las tareas completadas no se pueden mover', { timeout: 5000 });
    });

    await test.step('Verify task remains in Done column', async () => {
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      const taskCard = doneColumn.locator(`[data-task-id="${taskId}"]`);

      await expect(taskCard).toBeVisible();

      // Verify task is NOT in Todo column
      const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
      await expect(todoColumn.locator(`[data-task-id="${taskId}"]`)).not.toBeVisible();
    });
  });

  test('non-completed task can still be moved normally', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create task in Backlog', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Normal Move Test ${Date.now()}`;
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

    await test.step('Move task from Backlog to In Progress', async () => {
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');

      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Verify task moved successfully
      await expect(inProgressColumn.locator(`[data-task-id="${taskId}"]`)).toBeVisible();
    });

    await test.step('Move task from In Progress back to Todo', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      const todoColumn = page.locator('[data-testid="kanban-column-todo"]');

      await taskCard.dragTo(todoColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Verify task moved successfully
      await expect(todoColumn.locator(`[data-task-id="${taskId}"]`)).toBeVisible();
    });

    await test.step('Move task from Todo back to Backlog', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      const backlogColumn = page.locator('[data-testid="kanban-column-backlog"]');

      await taskCard.dragTo(backlogColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Verify task moved successfully
      await expect(backlogColumn.locator(`[data-task-id="${taskId}"]`)).toBeVisible();
    });
  });
});
