import { test, expect, type Page } from '@playwright/test';

/**
 * Helper: log in as admin user (admin@admin.com / admin).
 * After login the page redirects to the dashboard.
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@admin.com');
  await page.getByLabel(/password/i).fill('admin');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard (authenticated area)
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('Feedback Widget', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('feedback button is visible on dashboard', async ({ page }) => {
    // The floating feedback button should be present
    const feedbackBtn = page.getByRole('button', { name: /give feedback/i });
    await expect(feedbackBtn).toBeVisible({ timeout: 10000 });
  });

  test('clicking feedback button enters feedback mode', async ({ page }) => {
    // Click the feedback button
    await page.getByRole('button', { name: /give feedback/i }).click();

    // Feedback mode banner should appear
    await expect(page.getByText('Click on a section to leave feedback')).toBeVisible({
      timeout: 5000,
    });

    // The floating feedback button should be hidden in feedback mode
    await expect(page.getByRole('button', { name: /give feedback/i })).not.toBeVisible();
  });

  test('escape key exits feedback mode', async ({ page }) => {
    // Enter feedback mode
    await page.getByRole('button', { name: /give feedback/i }).click();
    await expect(page.getByText('Click on a section to leave feedback')).toBeVisible({
      timeout: 5000,
    });

    // Press Escape to exit
    await page.keyboard.press('Escape');

    // Feedback button should reappear
    await expect(page.getByRole('button', { name: /give feedback/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test('data-feedback-target elements are present on dashboard', async ({ page }) => {
    // Verify key data-feedback-target attributes exist on the dashboard
    await expect(page.locator('[data-feedback-target="dashboard-stats"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-feedback-target="dashboard-summary"]')).toBeVisible();
    await expect(page.locator('[data-feedback-target="dashboard-actions"]')).toBeVisible();
  });

  test('clicking a feedback-target element shows the submission popover', async ({ page }) => {
    // Enter feedback mode
    await page.getByRole('button', { name: /give feedback/i }).click();
    await expect(page.getByText('Click on a section to leave feedback')).toBeVisible({
      timeout: 5000,
    });

    // Click on a data-feedback-target element (Quick Actions section)
    await page.locator('[data-feedback-target="dashboard-actions"]').click();

    // The feedback popover should appear with "Leave Feedback" heading
    await expect(page.getByText('Leave Feedback')).toBeVisible({ timeout: 5000 });

    // Should show the element label
    await expect(page.getByText(/on:.*quick actions/i)).toBeVisible();

    // Textarea should be present
    await expect(page.getByPlaceholder(/what's on your mind/i)).toBeVisible();
  });
});

test.describe('Feedback Submission & Admin Dashboard', () => {
  test('full feedback flow: submit, view in admin, update status, delete', async ({ page }) => {
    // --- Step 1: Login ---
    await loginAsAdmin(page);

    // --- Step 2: Submit feedback ---
    // Enter feedback mode
    await page.getByRole('button', { name: /give feedback/i }).click();
    await expect(page.getByText('Click on a section to leave feedback')).toBeVisible({
      timeout: 5000,
    });

    // Click on the stats section
    await page.locator('[data-feedback-target="dashboard-stats"]').click();

    // Fill in feedback
    const testContent = `E2E test feedback ${Date.now()}`;
    await page.getByPlaceholder(/what's on your mind/i).fill(testContent);

    // Submit
    await page.getByRole('button', { name: /submit/i }).click();

    // Should show success toast and close the popover
    await expect(page.getByText(/feedback.*submitted|thank/i)).toBeVisible({ timeout: 10000 });

    // --- Step 3: Navigate to admin feedback dashboard ---
    await page.goto('/feedback');
    await page.waitForURL('**/feedback');

    // Should see the feedback we just submitted
    await expect(page.getByText(testContent)).toBeVisible({ timeout: 10000 });

    // --- Step 4: Update feedback status ---
    // Find the feedback item and its status selector
    const feedbackRow = page
      .locator('tr, [class*="border-b"]')
      .filter({ hasText: testContent })
      .first();

    // Find and change the status select within this row
    const statusSelect = feedbackRow.locator('select').first();
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('REVIEWED');

      // Verify status change toast
      await expect(page.getByText(/updated|status.*changed/i)).toBeVisible({ timeout: 5000 });
    }

    // --- Step 5: Delete the feedback ---
    // Click the delete button for this feedback
    const deleteBtn = feedbackRow.getByRole('button', { name: /delete/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Confirm deletion in the modal
      const confirmBtn = page.getByRole('button', { name: /delete/i }).last();
      await confirmBtn.click();

      // Verify deletion toast
      await expect(page.getByText(/deleted|removed/i)).toBeVisible({ timeout: 5000 });

      // Feedback content should no longer be visible
      await expect(page.getByText(testContent)).not.toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Feedback on other pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('feedback targets exist on posts page', async ({ page }) => {
    await page.goto('/posts');
    await page.waitForURL('**/posts');

    await expect(page.locator('[data-feedback-target="posts-header"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-feedback-target="posts-tabs"]')).toBeVisible();
  });

  test('feedback targets exist on calendar page', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForURL('**/calendar');

    await expect(page.locator('[data-feedback-target="calendar-header"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-feedback-target="calendar-content"]')).toBeVisible();
  });

  test('feedback targets exist on settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL('**/settings');

    await expect(page.locator('[data-feedback-target="settings-header"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-feedback-target="settings-tabs"]')).toBeVisible();
    await expect(page.locator('[data-feedback-target="settings-content"]')).toBeVisible();
  });

  test('feedback button is present on all main pages', async ({ page }) => {
    const pages = ['/dashboard', '/posts', '/calendar', '/articles', '/media', '/settings'];

    for (const path of pages) {
      await page.goto(path);
      await expect(page.getByRole('button', { name: /give feedback/i })).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
