import { Page } from '@playwright/test';

export async function loginViaKeycloak(page: Page) {
  await page.goto('/');
  await page.click('text=Login');

  const username = process.env.E2E_USERNAME || 'e2e_user';
  const password = process.env.E2E_PASSWORD || 'secret';
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for app to redirect back
  await page.waitForURL('**/expenses');
}
