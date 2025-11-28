import { test, expect } from '@playwright/test';
import { loginViaKeycloak } from './helpers/auth';

test.describe('Authentication and basic navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page);
  });

  test('login and view Expenses table with expected columns', async ({ page }) => {
    // Verify we're on the main page (which shows expenses)
    // The app serves ExpensesPage at "/"
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/?(\?.*)?$/);

    // Verify Expenses heading is visible (exact match to avoid "No expenses found")
    await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible();

    // Verify table is visible
    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Check for expected columns (Date and Amount are common)
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /amount/i })).toBeVisible();
  });

  test('navigate to Reports and back to Expenses', async ({ page }) => {
    // Click on Reports in navigation
    await page.getByRole('link', { name: /reports/i }).click();

    // Verify we're on the reports page
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible();

    // Navigate back to Expenses (home/index)
    await page.getByRole('link', { name: /expenses/i }).click();

    // Verify we're back on main page with expenses (exact match)
    await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible();
  });
});
