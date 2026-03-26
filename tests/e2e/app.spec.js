import { test, expect } from '@playwright/test';

test('application shell loads with the main surveillance chrome', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Godseye/i);
  await expect(page.getByText('Data Layers')).toBeVisible();
  await expect(page.getByText('VISUAL_MODE_OVERRIDE')).toBeVisible();
});
