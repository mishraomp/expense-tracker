import { test, expect } from '@playwright/test';
import { loginViaKeycloak } from './helpers/auth';

test.describe('Expenses CRUD', () => {
  test('create edit delete expense', async ({ page }) => {
    // Authenticate first
    await loginViaKeycloak(page);
    await page.goto('/expenses');

    // Click Add Expense - adjust selector as per UI
    await page.click('text=Add Expense');

    // Fill required fields - adjust selectors
    await page.fill('input[name="amount"]', '12.34');
    await page.fill('input[name="description"]', 'E2E test expense');
    await page.click('button:has-text("Save")');

    await expect(page.locator('text=E2E test expense')).toBeVisible();

    // Edit the expense
    await page.click('button[aria-label="Edit expense"]');
    await page.fill('input[name="description"]', 'E2E test expense (edited)');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=E2E test expense (edited)')).toBeVisible();

    // Delete the expense
    await page.click('button[aria-label="Delete expense"]');
    await page.click('button:has-text("Confirm")');
    await expect(page.locator('text=E2E test expense (edited)')).not.toBeVisible();
  });
});
