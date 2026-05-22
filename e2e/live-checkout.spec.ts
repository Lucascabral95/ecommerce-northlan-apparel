import { expect, test } from '@playwright/test';

test.describe('Northlane live checkout', () => {
  test('registers, checks out and exposes the confirmed order history', async ({ page }) => {
    test.slow();

    const email = `live-e2e-${Date.now()}@northlane.test`;

    await page.goto('/register');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('First name').fill('E2E');
    await page.getByLabel('Last name').fill('Runner');
    await page.getByLabel('Password').fill('Northlane123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page).toHaveURL(/\/account$/);

    await page.goto('/products');
    await page.getByRole('link', { name: /Remera Oversized Essential/i }).click();
    await expect(page).toHaveURL(/\/products\/remera-oversized-essential$/);

    await page.getByRole('button', { name: 'Add to bag' }).click();

    await page.goto('/cart');
    await expect(page.getByText('Remera Oversized Essential')).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Checkout' }).click();

    await page.getByRole('button', { name: 'Place order' }).click();
    await expect(page).toHaveURL(/\/account\/orders\/.+$/);
    await expect(page.getByText('Remera Oversized Essential')).toBeVisible();

    await expect
      .poll(async () => (await page.getByRole('heading', { level: 1 }).textContent())?.trim(), {
        message: 'order never reached CONFIRMED',
        timeout: 30_000,
      })
      .toBe('CONFIRMED');

    const orderNumber = (await page.locator('p.eyebrow').first().textContent())?.trim();
    expect(orderNumber).toBeTruthy();

    await page.goto('/cart');
    await expect(page.getByText('Nothing in the bag yet.')).toBeVisible();

    await page.goto('/account/orders');
    await expect(page.getByRole('heading', { level: 1, name: 'Purchase history' })).toBeVisible();
    await expect(page.getByText(orderNumber ?? '', { exact: false })).toBeVisible();
    await expect(page.getByText('CONFIRMED')).toBeVisible();
  });
});
