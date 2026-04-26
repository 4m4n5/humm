import { test, expect } from '@playwright/test';

test.describe('GitHub Pages store bundle (docs/store)', () => {
  test('index loads and links to support + privacy', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByRole('heading', { name: /Hum - rituals/i })).toBeVisible();
    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: 'Support' })).toHaveAttribute('href', 'support.html');
    await expect(nav.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', 'privacy.html');
  });

  test('support page has FAQ and mailto', async ({ page }) => {
    await page.goto('/support.html');
    await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible();
    await expect(page.getByText('FAQ')).toBeVisible();
    await expect(page.locator('a#contact-email')).toHaveAttribute('href', /mailto:/);
  });

  test('privacy page has policy sections', async ({ page }) => {
    await page.goto('/privacy.html');
    await expect(page.getByRole('heading', { name: /Privacy policy/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Who the app is for' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Information we collect' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Where data is processed' })).toBeVisible();
    await expect(page.getByText('Google Firebase')).toBeVisible();
  });

  test('stylesheets load (200)', async ({ page, request }) => {
    const res = await request.get('/style.css');
    expect(res.ok()).toBeTruthy();
    expect((await res.body()).byteLength).toBeGreaterThan(100);
    await page.goto('/support.html');
    const color = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(color).not.toBe('rgba(0, 0, 0, 0)');
  });
});
