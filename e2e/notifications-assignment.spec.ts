import { test, expect } from '@playwright/test';

/**
 * E2E Test: Notification on Task Assignment
 *
 * Limitation: The E2E auth bypass uses user_e2e_test_123 which does not exist
 * in the users table (FK constraint). Task creation fails with ri_ReportViolation.
 * This test verifies the notification bell UI and assignment flow as far as possible.
 *
 * What we CAN test:
 * - Notification bell exists in header
 * - Bell popover opens and shows empty state or notifications
 * - Unread count API responds correctly
 *
 * What we CANNOT test (single-user limitation):
 * - Badge shows count > 0 for the assigned user (would need a second user session)
 * - Task creation + assignment (user_e2e_test_123 not in users table)
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Notification Assignment', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true',
    });
  });

  test('notification bell exists and unread-count API works', async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Verify notification bell is visible in header
    const bell = page.locator('button[aria-label="Notificaciones"]');
    await expect(bell).toBeVisible({ timeout: 10000 });

    // Verify unread-count API responds
    const response = await page.request.get(`${BASE_URL}/api/notifications/unread-count`, {
      headers: { 'x-e2e-test': 'true' },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('count');
    expect(typeof data.count).toBe('number');
  });

  test('clicking bell opens popover with notifications list or empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const bell = page.locator('button[aria-label="Notificaciones"]');
    await expect(bell).toBeVisible({ timeout: 10000 });

    // Click bell to open popover
    await bell.click();

    // Verify popover content appears with header "Notificaciones"
    const popoverHeader = page.locator('text=Notificaciones').first();
    await expect(popoverHeader).toBeVisible({ timeout: 5000 });

    // Wait for loading to finish
    await page.waitForSelector('text=Cargando...', { state: 'hidden', timeout: 10000 }).catch(() => {});

    // Should show either notifications or empty state
    const emptyState = page.locator('text=No tienes notificaciones');
    const notificationCards = page.locator('[role="dialog"] button, [data-radix-popper-content-wrapper] button');

    // One of these should be visible
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasItems = (await notificationCards.count()) > 1; // >1 because header may be a button

    expect(hasEmpty || hasItems).toBeTruthy();
  });

  test('notifications API returns valid response', async ({ page }) => {
    // Test the notifications list API directly
    const response = await page.request.get(`${BASE_URL}/api/notifications`, {
      headers: { 'x-e2e-test': 'true' },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();
  });
});
