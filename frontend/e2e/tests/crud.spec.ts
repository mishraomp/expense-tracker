import { test, expect } from '@playwright/test';
import { loginViaKeycloak } from './helpers/auth';
import {
  createExpense,
  editExpense,
  deleteExpense,
  generateTestExpense,
  cleanupTestExpenses,
} from './helpers/fixtures';

test.describe('Expenses CRUD', () => {
  // Clean up any leftover E2E test expenses before running tests
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginViaKeycloak(page);
    await cleanupTestExpenses(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginViaKeycloak(page);
  });

  test('create a new expense', async ({ page }) => {
    // Generate unique expense to avoid duplicate constraint
    const expense = generateTestExpense();
    const { description } = await createExpense(page, expense);

    // Verify the expense appears in the table by description (unique)
    await expect(page.locator('tr', { hasText: description })).toBeVisible();

    // Cleanup
    await deleteExpense(page, description);
  });

  test('edit an existing expense', async ({ page }) => {
    // Create unique expense
    const expense = generateTestExpense();
    const { description: originalDescription } = await createExpense(page, expense);

    // Edit it with new unique values
    const newExpense = generateTestExpense();
    const { description: newDescription } = await editExpense(
      page,
      originalDescription,
      newExpense,
    );

    // Verify changes - check new description is visible
    await expect(page.locator('tr', { hasText: newDescription })).toBeVisible();

    // Cleanup
    await deleteExpense(page, newDescription);
  });

  test('delete an expense', async ({ page }) => {
    // Create unique expense
    const expense = generateTestExpense();
    const { description } = await createExpense(page, expense);

    // Verify it exists
    await expect(page.locator('tr', { hasText: description })).toBeVisible();

    // Delete it
    await deleteExpense(page, description);

    // Verify it's gone
    await expect(page.locator('tr', { hasText: description })).not.toBeVisible();
  });

  test('full CRUD cycle: create, edit, delete', async ({ page }) => {
    // CREATE unique expense
    const expense = generateTestExpense();
    const { description: originalDescription } = await createExpense(page, expense);
    await expect(page.locator('tr', { hasText: originalDescription })).toBeVisible();

    // EDIT with unique values
    const editedExpense = generateTestExpense();
    const { description: newDescription } = await editExpense(
      page,
      originalDescription,
      editedExpense,
    );
    await expect(page.locator('tr', { hasText: newDescription })).toBeVisible();

    // DELETE
    await deleteExpense(page, newDescription);
    await expect(page.locator('tr', { hasText: newDescription })).not.toBeVisible();
  });
});
