import { test, expect } from '@playwright/test';

/**
 * E2E Test: Task Time Tracking
 *
 * Tests the time tracking functionality:
 * 1. Create task -> Drag to In Progress -> Verify startedAt captured
 * 2. Complete task -> Verify duration displayed
 * 3. Verify live timer in In Progress tasks
 * 4. Verify completed task shows static duration
 *
 * Prerequisites:
 * - Valid Clerk test credentials in .env.local
 * - Development server running on http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Task Time Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Add bypass header for testing
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true'
    });
    // Navigate to the app
    await page.goto(BASE_URL);
  });

  test('captures startedAt when task moves to In Progress', async ({ page }) => {
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

      taskTitle = `Time Track Test ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.fill('[data-testid="task-description-input"]', 'Testing time tracking functionality');

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

      // Verify task starts without duration indicator (no clock icon visible)
      const clockIcon = taskCard.locator('text=< 1m');
      await expect(clockIcon).not.toBeVisible();
    });

    await test.step('Move task to In Progress', async () => {
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');

      await expect(taskCard).toBeVisible();
      await expect(inProgressColumn).toBeVisible();

      // Drag to In Progress
      await taskCard.dragTo(inProgressColumn);

      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Verify task is now in In Progress column
      await expect(inProgressColumn.locator(`[data-task-id="${taskId}"]`)).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify live timer appears with amber color', async () => {
      // Wait for page to update
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Verify task status is now in_progress
      await expect(taskCard).toHaveAttribute('data-task-status', 'in_progress');

      // Verify there's an amber duration indicator (animate-pulse class)
      const durationIndicator = taskCard.locator('.text-amber-400');
      await expect(durationIndicator).toBeVisible();
    });
  });

  test('displays final duration when task is completed', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create task and move to In Progress', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Duration Test ${Date.now()}`;
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

      // Move to In Progress first (to capture startedAt)
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await taskCard.dragTo(inProgressColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Complete the task', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');

      await expect(taskCard).toBeVisible();
      await expect(doneColumn).toBeVisible();

      // Drag to Done
      await taskCard.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });

      // Verify task is now in Done column
      await expect(doneColumn.locator(`[data-task-id="${taskId}"]`)).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify green duration appears on completed task', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Verify task status is now done
      await expect(taskCard).toHaveAttribute('data-task-status', 'done');

      // Verify there's a green duration indicator (emerald color)
      const durationIndicator = taskCard.locator('.text-emerald-400');
      await expect(durationIndicator).toBeVisible();

      // Duration should show "< 1m" since we just completed
      const durationText = taskCard.locator('text=< 1m');
      await expect(durationText).toBeVisible();
    });
  });

  test('shows duration in task detail dialog', async ({ page }) => {
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

      taskTitle = `Detail Duration Test ${Date.now()}`;
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

      // Move through workflow: Backlog -> In Progress -> Done
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

    await test.step('Open task detail and verify duration info', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on task to open detail dialog
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog to open
      await page.waitForSelector('text=Information', { timeout: 5000 });

      // Verify "Iniciado" (Started) label is visible
      await expect(page.locator('text=Iniciado')).toBeVisible();

      // Verify "Completado" (Completed) label is visible
      await expect(page.locator('text=Completado')).toBeVisible();

      // Verify "Duración" label with value is visible
      await expect(page.locator('text=Duración')).toBeVisible();

      // Verify the duration display area (emerald background)
      const durationSection = page.locator('.bg-emerald-500\\/10');
      await expect(durationSection).toBeVisible();
    });
  });

  test('in progress task shows live timer in dialog', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create and move task to In Progress', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `Live Timer Test ${Date.now()}`;
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
    });

    await test.step('Open task detail and verify live timer', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click on task to open detail dialog
      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await taskCard.click();

      // Wait for dialog to open
      await page.waitForSelector('text=Information', { timeout: 5000 });

      // Verify "Iniciado" (Started) label is visible
      await expect(page.locator('text=Iniciado')).toBeVisible();

      // Verify "En progreso" label is visible (the live timer section)
      await expect(page.locator('text=En progreso')).toBeVisible();

      // Verify the amber timer display area
      const timerSection = page.locator('.bg-amber-500\\/10');
      await expect(timerSection).toBeVisible();

      // Verify animate-pulse class is present (for live timer effect)
      const pulsingElement = timerSection.locator('.animate-pulse');
      await expect(pulsingElement).toBeVisible();
    });
  });

  test('task without going through In Progress shows dash for duration', async ({ page }) => {
    await test.step('Bypass Login and navigate to Kanban', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForURL('**/dashboard/kanban**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
    });

    let taskTitle = '';
    let taskId = '';

    await test.step('Create task and complete directly (skip In Progress)', async () => {
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');

      taskTitle = `No StartedAt Test ${Date.now()}`;
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

      // Move directly to Done (bypassing In Progress)
      const doneColumn = page.locator('[data-testid="kanban-column-done"]');
      await taskCard.dragTo(doneColumn);
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
    });

    await test.step('Verify task shows status dot instead of duration', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');

      const taskCard = page.locator(`[data-task-id="${taskId}"]`);
      await expect(taskCard).toBeVisible();

      // Verify task status is done
      await expect(taskCard).toHaveAttribute('data-task-status', 'done');

      // Since task never went through In Progress, startedAt is null
      // The card should show a status dot instead of duration
      // Check that emerald duration is NOT visible (no time tracked)
      const durationIndicator = taskCard.locator('.text-emerald-400');
      await expect(durationIndicator).not.toBeVisible();
    });
  });
});
