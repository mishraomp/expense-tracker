import { Page, expect } from '@playwright/test';

/**
 * Test data definitions for E2E tests.
 */
export interface ExpenseFixture {
  amount: string;
  description?: string;
  category?: string;
  date?: string;
}

/**
 * Generate a unique test expense to avoid duplicate constraint errors.
 * Uses timestamp in both amount and description to ensure uniqueness.
 * The unique constraint is (user_id, date, amount, description).
 */
let expenseCounter = 0;
export function generateTestExpense(): ExpenseFixture {
  const timestamp = Date.now();
  expenseCounter++;
  // Combine timestamp and counter for guaranteed uniqueness even in fast loops
  const uniqueValue = timestamp * 1000 + expenseCounter;
  // Use modulo to create reasonable dollar amounts (1.00 to 999.99)
  const dollars = (uniqueValue % 999) + 1;
  const cents = (uniqueValue % 100).toString().padStart(2, '0');
  return {
    amount: `${dollars}.${cents}`,
    description: `E2E Test ${timestamp}_${expenseCounter}`,
  };
}

export const testExpense: ExpenseFixture = generateTestExpense();

export const editedExpense: ExpenseFixture = {
  amount: '99.99',
  description: `E2E Edited ${Date.now()}`,
};

/**
 * Creates an expense via the UI.
 * Returns an object with the amount and description for locating the expense.
 */
export async function createExpense(
  page: Page,
  expense?: ExpenseFixture,
): Promise<{ amount: string; description: string }> {
  // Generate unique expense if not provided
  const expenseData = expense || generateTestExpense();

  // Navigate to home (expenses page) if not already there
  if (!page.url().match(/^http:\/\/localhost:\d+\/?$/)) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  }

  // Use today's date for the expense
  const today = new Date().toISOString().split('T')[0];
  const expenseDate = expenseData.date || today;

  // First, update the date filter to include today's date
  // Find the end date input and set it to today or later
  const endDateInput = page.locator('input[type="date"]').nth(1); // Second date input is end date
  if ((await endDateInput.count()) > 0) {
    const currentEndDate = await endDateInput.inputValue();
    if (currentEndDate && currentEndDate < expenseDate) {
      await endDateInput.fill(expenseDate);
      await page.waitForLoadState('networkidle');
    }
  }

  // Click Add Expense button
  await page
    .getByRole('button', { name: /add expense/i })
    .first()
    .click();

  // Wait for modal to open
  await page.waitForSelector('#amount', { state: 'visible' });

  // Fill form fields using IDs
  await page.locator('#amount').fill(expenseData.amount);

  // Fill date
  await page.locator('#date').fill(expenseDate);

  // Select category (required) - select the first available option
  if (expenseData.category) {
    await page.locator('#categoryId').selectOption({ label: expenseData.category });
  } else {
    // Select first non-empty option
    const categorySelect = page.locator('#categoryId');
    await categorySelect.selectOption({ index: 1 });
  }

  // Generate a unique description with timestamp
  const description = expenseData.description || `E2E Test ${Date.now()}`;
  await page.locator('#description').fill(description);

  // Save - click the submit button inside the modal
  const submitBtn = page.locator('.modal.show').getByRole('button', { name: /add expense|save/i });
  await submitBtn.click();

  // Wait for modal to close (indicates success) - don't swallow errors
  await page.waitForSelector('.modal-backdrop', { state: 'hidden', timeout: 10000 });

  // Wait for network to settle and table to refresh
  await page.waitForLoadState('networkidle');

  // Give the table a moment to re-render with new data
  await page.waitForTimeout(500);

  // Verify the expense appears in the table - if this fails, the create likely had a server error
  await expect(page.locator('tbody tr', { hasText: description })).toBeVisible({ timeout: 5000 });
  // Return both amount and description for locating the expense
  return { amount: expenseData.amount, description };
}

/**
 * Edits an existing expense by its description (unique identifier).
 * Editing is done by clicking on the row (not an edit button).
 * Returns the new description.
 */
export async function editExpense(
  page: Page,
  currentDescription: string,
  newData: Partial<ExpenseFixture>,
): Promise<{ amount: string; description: string }> {
  // Find the row containing the expense by description (more reliable than amount)
  const row = page.locator('tbody tr', { hasText: currentDescription });
  await expect(row).toBeVisible({ timeout: 5000 });

  // Click on the row to open edit modal (the row has onClick handler)
  // Click on the amount cell to avoid hitting buttons
  await row.locator('td').first().click();

  // Wait for modal to open
  await page.waitForSelector('#amount', { state: 'visible' });

  // Generate unique description to avoid duplicate constraint
  const uniqueDescription = newData.description || `E2E Edit ${Date.now()}`;

  // Update fields using IDs
  if (newData.amount) {
    await page.locator('#amount').clear();
    await page.locator('#amount').fill(newData.amount);
  }

  // Always update description to ensure uniqueness
  await page.locator('#description').clear();
  await page.locator('#description').fill(uniqueDescription);

  // Save - the button in modal (could be "Save", "Save Changes", "Update")
  const saveBtn = page
    .locator('.modal.show')
    .getByRole('button')
    .filter({ hasText: /save|update/i });
  await expect(saveBtn).toBeVisible({ timeout: 5000 });
  await saveBtn.click();

  // Wait for modal to close (indicates success)
  await page.waitForSelector('.modal-backdrop', { state: 'hidden', timeout: 10000 });
  await page.waitForLoadState('networkidle');

  // Give table time to refresh with updated data
  await page.waitForTimeout(500);

  // Return new amount and description
  const newAmount = newData.amount || ''; // Amount might not change
  return { amount: newAmount, description: uniqueDescription };
}

/**
 * Deletes an expense by its description (unique identifier).
 */
export async function deleteExpense(page: Page, description: string): Promise<void> {
  const row = page.locator('tbody tr', { hasText: description });
  await expect(row).toBeVisible({ timeout: 5000 });

  // Click delete button (trash icon)
  await row.getByRole('button', { name: /delete/i }).click();

  // Confirm deletion in modal
  await page.waitForSelector('.modal.show', { state: 'visible' });
  await page
    .locator('.modal.show')
    .getByRole('button', { name: /confirm|yes|delete/i })
    .click();

  // Wait for modal to close
  await page
    .waitForSelector('.modal-backdrop', { state: 'hidden', timeout: 10000 })
    .catch(() => {});
  await page.waitForLoadState('networkidle');
}

/**
 * Cleans up test expenses by description pattern.
 */
export async function cleanupTestExpenses(page: Page, pattern: RegExp = /E2E/i): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Find all matching rows and delete them
  let rows = page.locator('tr').filter({ hasText: pattern });
  let count = await rows.count();

  while (count > 0) {
    await rows
      .first()
      .getByRole('button', { name: /delete/i })
      .click();
    await page.waitForSelector('.modal.show', { state: 'visible' });
    await page
      .locator('.modal.show')
      .getByRole('button', { name: /confirm|yes|delete/i })
      .click();
    await page
      .waitForSelector('.modal-backdrop', { state: 'hidden', timeout: 10000 })
      .catch(() => {});
    await page.waitForLoadState('networkidle');

    rows = page.locator('tr').filter({ hasText: pattern });
    count = await rows.count();
  }
}
