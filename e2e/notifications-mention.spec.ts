import { test, expect } from '@playwright/test';

/**
 * E2E Test: MentionInput in Task Description
 *
 * Tests that the MentionInput component works in the task detail dialog:
 * - Opening a task shows the description field (MentionInput textarea)
 * - Typing @ in description triggers the autocomplete dropdown
 * - Dropdown shows team members
 * - Typing non-matching text after @ shows empty state
 *
 * Limitations:
 * - e2e test user FK constraint prevents task creation; tests rely on existing tasks
 * - If board has no tasks, tests are skipped with explanation
 */

const BASE_URL = 'http://localhost:3000';

test.describe('MentionInput in Task Description', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true',
    });
  });

  test('task detail dialog has a description textarea (MentionInput)', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/kanban`);
    await page.waitForLoadState('networkidle');

    // Click on the first task card to open detail dialog
    const taskCard = page.locator('[data-testid^="task-card-"]').first();
    const hasTask = await taskCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasTask) {
      test.skip(true, 'No task cards found on the kanban board');
      return;
    }

    await taskCard.click();

    // Wait for dialog to appear - look for the description textarea inside MentionInput
    const descriptionTextarea = page.locator('textarea[placeholder="Add more context to this task..."]');
    await expect(descriptionTextarea).toBeVisible({ timeout: 10000 });
  });

  test('typing @ in description shows autocomplete dropdown', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/kanban`);
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator('[data-testid^="task-card-"]').first();
    const hasTask = await taskCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasTask) {
      test.skip(true, 'No task cards found on the kanban board');
      return;
    }

    await taskCard.click();

    const descriptionTextarea = page.locator('textarea[placeholder="Add more context to this task..."]');
    await expect(descriptionTextarea).toBeVisible({ timeout: 10000 });

    // Type @ to trigger mention dropdown
    await descriptionTextarea.click();
    await descriptionTextarea.type('@', { delay: 100 });

    // Dropdown should appear — the MentionInput renders an absolute-positioned div with rounded-xl border
    const dropdown = page.locator('.absolute.rounded-xl.border');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
  });

  test('mention dropdown shows user names', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/kanban`);
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator('[data-testid^="task-card-"]').first();
    const hasTask = await taskCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasTask) {
      test.skip(true, 'No task cards found on the kanban board');
      return;
    }

    await taskCard.click();

    const descriptionTextarea = page.locator('textarea[placeholder="Add more context to this task..."]');
    await expect(descriptionTextarea).toBeVisible({ timeout: 10000 });

    await descriptionTextarea.click();
    await descriptionTextarea.type('@', { delay: 100 });

    const dropdown = page.locator('.absolute.rounded-xl.border');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Should have at least one user button in the dropdown
    const userButtons = dropdown.locator('button');
    const count = await userButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('mention dropdown shows "No se encontraron usuarios" for no matches', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/kanban`);
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator('[data-testid^="task-card-"]').first();
    const hasTask = await taskCard.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasTask) {
      test.skip(true, 'No task cards found on the kanban board');
      return;
    }

    await taskCard.click();

    const descriptionTextarea = page.locator('textarea[placeholder="Add more context to this task..."]');
    await expect(descriptionTextarea).toBeVisible({ timeout: 10000 });

    // Type @ followed by gibberish to trigger no-match state
    await descriptionTextarea.click();
    await descriptionTextarea.type('@zzzzxxxxxnotauser', { delay: 50 });

    // Should show "No se encontraron usuarios" empty state
    const noMatch = page.locator('text=No se encontraron usuarios');
    await expect(noMatch).toBeVisible({ timeout: 5000 });
  });
});
