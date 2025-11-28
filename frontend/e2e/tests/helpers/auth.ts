import { Page, expect } from '@playwright/test';

export async function loginViaKeycloak(page: Page) {
  // Navigate to the app - it will auto-redirect to Keycloak if not authenticated
  await page.goto('/');

  const username = process.env.E2E_USERNAME || 'e2etestuser';
  const password = process.env.E2E_PASSWORD || 'Password';

  // Check if we need to log in (Keycloak form visible) or if already authenticated
  const usernameInput = page.locator('input[name="username"], input#username');
  const isKeycloakFormVisible = await usernameInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (isKeycloakFormVisible) {
    // Fill username
    await usernameInput.fill(username);

    // Fill password
    const passwordInput = page.locator('input[name="password"], input#password');
    await passwordInput.fill(password);

    // Click login button
    await page.getByRole('button', { name: /log in|sign in|submit|login/i }).click();
  }

  // Wait for app to be ready - the index route shows ExpensesPage
  // Wait for the expenses page content to load (table or heading)
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Wait for Expenses heading to be visible indicating we're authenticated
  await expect(page.getByRole('heading', { name: 'Expenses', exact: true })).toBeVisible({
    timeout: 30000,
  });
}
