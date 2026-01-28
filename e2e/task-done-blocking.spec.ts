import { test, expect } from '@playwright/test';

/**
 * E2E Test: Task Done Blocking
 *
 * Tests that completed tasks (status 'done') cannot be moved:
 * 1. Create task → move to In Progress → complete → verify in Done
 * 2. Attempt to drag from Done to another column
 * 3. Verify toast error appears
 * 4. Verify task position unchanged (still in Done)
 *
 * Prerequisites:
 * - Development server running on http://localhost:3000
 * - E2E test bypass headers configured
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Task Done Blocking', () => {
  test.beforeEach(async ({ page }) => {
    // Add bypass header for testing
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true'
    });
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });

  test('completed task cannot be dragged to another column', async ({ page }) => {
    const taskTitle = `Done Block Test ${Date.now()}`;
    let taskId: string | null = null;

    await test.step('Create a new task', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');

      // Create task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });
    });

    await test.step('Move task through columns to Done', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find the task
      const taskCard = page.locator('[data-testid^="task-card-"]', {
        hasText: taskTitle
      }).first();
      await expect(taskCard).toBeVisible();
      taskId = await taskCard.getAttribute('data-task-id');
      expect(taskId).toBeTruthy();

      // Move to In Progress first
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Wait for update
      await page.waitForTimeout(500);

      // Now move to Done
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskInProgress = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskInProgress).toBeVisible();

      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskInProgress.dragTo(doneColumn);

      // Complete task modal should appear
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });

      // Submit completion
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });
    });

    await test.step('Verify task is in Done column', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      const taskInDone = doneColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(taskInDone).toBeVisible({ timeout: 5000 });
      await expect(taskInDone).toHaveAttribute('data-task-status', 'done');
    });

    await test.step('Attempt to drag from Done to In Progress - should be blocked', async () => {
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Target column - In Progress
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await expect(inProgressColumn).toBeVisible();

      // Attempt drag
      await taskCard.dragTo(inProgressColumn);

      // Verify error toast appears
      await expect(page.locator('text=Las tareas completadas no se pueden mover')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify task is still in Done column after blocked drag', async () => {
      // Task should still be in Done column
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      const taskInDone = doneColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(taskInDone).toBeVisible();

      // Task should NOT be in In Progress column
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      const taskInProgress = inProgressColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(taskInProgress).not.toBeVisible();
    });
  });

  test('completed task cannot be dragged to Backlog', async ({ page }) => {
    const taskTitle = `Done to Backlog Block ${Date.now()}`;
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

      // Move to In Progress
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Move to Done
      const taskInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskInProgress.dragTo(doneColumn);

      // Complete task
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });
    });

    await test.step('Attempt to drag from Done to Backlog - should be blocked', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Target column - Backlog
      const backlogColumn = page.locator('[data-testid="kanban-column-backlog"]');
      await expect(backlogColumn).toBeVisible();

      // Attempt drag
      await taskCard.dragTo(backlogColumn);

      // Verify error toast appears
      await expect(page.locator('text=Las tareas completadas no se pueden mover')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify task is still in Done column', async () => {
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      const taskInDone = doneColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(taskInDone).toBeVisible();

      // Task should NOT be in Backlog
      const backlogColumn = page.locator('[data-testid="kanban-column-backlog"]');
      const taskInBacklog = backlogColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(taskInBacklog).not.toBeVisible();
    });
  });

  test('completed task cannot be dragged to To Do', async ({ page }) => {
    const taskTitle = `Done to Todo Block ${Date.now()}`;
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

      // Move directly through to Done (In Progress first is required for startedAt)
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskInProgress = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskInProgress.dragTo(doneColumn);

      // Complete task
      await page.waitForSelector('[data-testid="complete-task-modal"]', { timeout: 5000 });
      await page.click('[data-testid="confirm-complete-button"]');
      await page.waitForSelector('text=Task completed', { timeout: 5000 });
    });

    await test.step('Attempt to drag from Done to To Do - should be blocked', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Target column - To Do
      const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
      await expect(todoColumn).toBeVisible();

      // Attempt drag
      await taskCard.dragTo(todoColumn);

      // Verify error toast appears
      await expect(page.locator('text=Las tareas completadas no se pueden mover')).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify task is still in Done column', async () => {
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      const taskInDone = doneColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(taskInDone).toBeVisible();

      // Task should NOT be in To Do
      const todoColumn = page.locator('[data-testid="kanban-column-todo"]');
      const taskInTodo = todoColumn.locator(`[data-task-id="${taskId}"]`);
      await expect(taskInTodo).not.toBeVisible();
    });
  });

  test('toast error message includes suggestion to create derived task', async ({ page }) => {
    const taskTitle = `Derived Suggestion Test ${Date.now()}`;
    let taskId: string | null = null;

    await test.step('Create and complete a task quickly', async () => {
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

    await test.step('Verify error message includes derived task suggestion', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');

      // Attempt drag
      await taskCard.dragTo(inProgressColumn);

      // Verify the full error message with the suggestion
      const errorToast = page.locator('text=Crea una tarea derivada si necesitas continuar el trabajo');
      await expect(errorToast).toBeVisible({ timeout: 5000 });
    });
  });
});
