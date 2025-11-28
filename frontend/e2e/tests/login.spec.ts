import { test, expect } from '@playwright/test';
import { loginViaKeycloak } from './helpers/auth';

test.describe('Authentication and basic navigation', () => {
  test('login and navigate to expenses', async ({ page, baseURL }) => {
    await loginViaKeycloak(page);

    // Wait for navigation to expenses page
    await page.waitForURL('**/expenses');
    await expect(page.locator('text=Expenses')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
