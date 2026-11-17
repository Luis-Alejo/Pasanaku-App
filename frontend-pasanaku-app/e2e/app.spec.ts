import { expect, test } from '@playwright/test';

test('visits the app root url', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Pasanaku');
  await expect(page.locator('ion-tab-bar')).toBeVisible();
});
