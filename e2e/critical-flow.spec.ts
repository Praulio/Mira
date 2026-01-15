import { test, expect } from '@playwright/test';

/**
 * E2E Test: Critical User Flow
 * 
 * Tests the core workflow:
 * 1. Login with Clerk authentication
 * 2. Create a new task
 * 3. Move task to "In Progress" via drag and drop
 * 4. Verify task appears in Team View
 * 
 * Prerequisites:
 * - Valid Clerk test credentials in .env.local
 * - Database seeded with at least one test user
 * - Development server running on http://localhost:3000
 * 
 * Note: For Clerk authentication in E2E tests, you need to:
 * - Use Clerk's test mode with valid test keys
 * - Have a test user account created in Clerk Dashboard
 * - Set environment variables for test user credentials
 */

// Test configuration
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123';
const BASE_URL = 'http://localhost:3000';

test.describe('Critical User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);
  });

  test('complete flow: login -> create task -> move to in progress -> verify in team view', async ({ page }) => {
    // Step 1: Login with Clerk
    // Note: This assumes you're redirected to /sign-in for unauthenticated users
    await test.step('Login with Clerk', async () => {
      // Wait for Clerk sign-in form to load
      await page.waitForURL('**/sign-in**', { timeout: 10000 });
      
      // Fill in Clerk login form
      // Note: Clerk's form structure may vary. Adjust selectors as needed.
      await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
      await page.click('button:has-text("Continue")');
      
      // Wait for password field and fill it
      await page.waitForSelector('input[name="password"]', { timeout: 5000 });
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button:has-text("Continue")');
      
      // Wait for successful login and redirect to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    });

    // Step 2: Navigate to Kanban and create a task
    let taskTitle = '';
    await test.step('Create a new task', async () => {
      // Navigate to Kanban board
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');
      
      // Click "New Task" button
      await page.click('[data-testid="create-task-button"]');
      
      // Wait for dialog to appear
      await page.waitForSelector('[data-testid="task-title-input"]');
      
      // Fill in task details
      taskTitle = `E2E Test Task ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.fill('[data-testid="task-description-input"]', 'This is an E2E test task');
      
      // Submit the form
      await page.click('[data-testid="submit-task-button"]');
      
      // Wait for success toast
      await page.waitForSelector('text=Task created successfully', { timeout: 5000 });
      
      // Wait for dialog to close
      await page.waitForSelector('[data-testid="create-task-button"]', { timeout: 5000 });
    });

    // Step 3: Move task to "In Progress" via drag and drop
    await test.step('Move task to In Progress column', async () => {
      // Reload to ensure task is visible
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Find the newly created task in the Backlog column
      const taskCard = page.locator(`[data-testid^="task-card-"]`, {
        hasText: taskTitle
      }).first();
      
      // Verify task exists
      await expect(taskCard).toBeVisible({ timeout: 5000 });
      
      // Get the task ID for verification later
      const taskId = await taskCard.getAttribute('data-task-id');
      expect(taskId).toBeTruthy();
      
      // Find the "In Progress" column
      const inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
      await expect(inProgressColumn).toBeVisible();
      
      // Perform drag and drop
      await taskCard.dragTo(inProgressColumn);
      
      // Wait for success toast
      await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
      
      // Verify task is now in "In Progress" column
      await expect(inProgressColumn.locator(`[data-task-id="${taskId}"]`)).toBeVisible({ timeout: 5000 });
    });

    // Step 4: Verify task appears in Team View
    await test.step('Verify task in Team View', async () => {
      // Navigate to Team View (dashboard home)
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      // Look for a team slot that has the task
      // Note: This assumes the current user is assigned to the task
      const teamSlotWithTask = page.locator('[data-testid^="team-slot-"]', {
        hasText: taskTitle
      }).first();
      
      // Verify the task is visible in Team View
      await expect(teamSlotWithTask).toBeVisible({ timeout: 5000 });
      
      // Verify "In Progress" badge is present
      await expect(teamSlotWithTask.locator('text=In Progress')).toBeVisible();
      
      // Verify task title is displayed
      await expect(teamSlotWithTask.locator(`text=${taskTitle}`)).toBeVisible();
    });
  });

  test('task creation validation', async ({ page }) => {
    await test.step('Login', async () => {
      await page.waitForURL('**/sign-in**', { timeout: 10000 });
      await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
      await page.click('button:has-text("Continue")');
      await page.waitForSelector('input[name="password"]', { timeout: 5000 });
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button:has-text("Continue")');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    });

    await test.step('Validate empty title is not allowed', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');
      
      // Click "New Task" button
      await page.click('[data-testid="create-task-button"]');
      
      // Wait for dialog
      await page.waitForSelector('[data-testid="task-title-input"]');
      
      // Try to submit without title
      await page.click('[data-testid="submit-task-button"]');
      
      // Dialog should still be open (HTML5 validation prevents submission)
      await expect(page.locator('[data-testid="task-title-input"]')).toBeVisible();
    });
  });

  test('kanban drag and drop works across all columns', async ({ page }) => {
    await test.step('Login', async () => {
      await page.waitForURL('**/sign-in**', { timeout: 10000 });
      await page.fill('input[name="identifier"]', TEST_USER_EMAIL);
      await page.click('button:has-text("Continue")');
      await page.waitForSelector('input[name="password"]', { timeout: 5000 });
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button:has-text("Continue")');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    });

    await test.step('Test drag and drop between columns', async () => {
      await page.goto(`${BASE_URL}/dashboard/kanban`);
      await page.waitForLoadState('networkidle');
      
      // Create a test task
      await page.click('[data-testid="create-task-button"]');
      await page.waitForSelector('[data-testid="task-title-input"]');
      const taskTitle = `Drag Test ${Date.now()}`;
      await page.fill('[data-testid="task-title-input"]', taskTitle);
      await page.click('[data-testid="submit-task-button"]');
      await page.waitForSelector('text=Task created successfully');
      
      // Reload and find task
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const taskCard = page.locator(`[data-testid^="task-card-"]`, {
        hasText: taskTitle
      }).first();
      
      await expect(taskCard).toBeVisible();
      const taskId = await taskCard.getAttribute('data-task-id');
      
      // Test sequence: Backlog -> To Do -> In Progress -> Done
      const columns = ['todo', 'in_progress', 'done'];
      
      for (const columnId of columns) {
        const targetColumn = page.locator(`[data-testid="kanban-column-${columnId}"]`);
        await expect(targetColumn).toBeVisible();
        
        // Find current task location
        const currentTask = page.locator(`[data-task-id="${taskId}"]`);
        await expect(currentTask).toBeVisible();
        
        // Drag to target column
        await currentTask.dragTo(targetColumn);
        
        // Wait for success toast
        await page.waitForSelector('text=Task moved successfully', { timeout: 5000 });
        
        // Verify task is in the target column
        await expect(targetColumn.locator(`[data-task-id="${taskId}"]`)).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
