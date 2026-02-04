import { test, expect } from '@playwright/test';

/**
 * E2E Test: Notification Bell and Popover
 *
 * Tests the notification bell component in the dashboard header:
 * - Bell button exists with correct aria-label
 * - Clicking bell opens popover
 * - Popover shows "Notificaciones" header
 * - Empty state shows "No tienes notificaciones" when no notifications exist
 * - Popover can be closed
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Notification Bell & Popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'x-e2e-test': 'true',
    });
  });

  test('bell button is visible in the dashboard header', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const bell = page.locator('button[aria-label="Notificaciones"]');
    await expect(bell).toBeVisible({ timeout: 10000 });
  });

  test('clicking bell opens popover with header', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const bell = page.locator('button[aria-label="Notificaciones"]');
    await expect(bell).toBeVisible({ timeout: 10000 });

    // Click to open popover
    await bell.click();

    // Popover should show "Notificaciones" header
    const header = page.locator('h3:has-text("Notificaciones")');
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test('popover shows empty state when no notifications', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const bell = page.locator('button[aria-label="Notificaciones"]');
    await bell.click();

    // Wait for loading to finish
    await page.waitForSelector('text=Cargando...', { state: 'hidden', timeout: 10000 }).catch(() => {});

    // Should show empty state text
    const emptyState = page.locator('text=No tienes notificaciones');
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });

  test('popover can be closed by clicking bell again', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const bell = page.locator('button[aria-label="Notificaciones"]');
    await bell.click();

    // Verify popover is open
    const header = page.locator('h3:has-text("Notificaciones")');
    await expect(header).toBeVisible({ timeout: 5000 });

    // Click bell again to close
    await bell.click();

    // Popover should close
    await expect(header).not.toBeVisible({ timeout: 5000 });
  });
});
