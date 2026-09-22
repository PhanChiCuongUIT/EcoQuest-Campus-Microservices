import { test, expect } from '@playwright/test';

async function signIn(page, request, email = 'admin@ecoquest.local') {
  const response = await request.post('/auth/login', { data: { email, password: 'EcoQuest@123' } });
  expect(response.ok()).toBeTruthy();
  const { accessToken } = await response.json();
  await page.addInitScript(token => localStorage.setItem('eq-access-token', token), accessToken);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
}
async function nav(page, name) {
  const toggle = page.getByRole('button', { name: 'Open navigation menu' });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole('navigation', { name: 'App navigation' }).getByRole('button', { name, exact: true }).click();
}
const failure = (route, detail, status = 503) => route.fulfill({ status, json: { detail } });

test('user load failure is not an empty directory; retry and failed role edit are explicit', async ({ page, request }, testInfo) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  let failLoad = true;
  await page.route('**/auth/users', route => failLoad ? failure(route, 'User directory temporarily unavailable.') : route.fulfill({ json: [
    { id: 'feedback-user', displayName: 'Feedback Student', email: 'feedback@example.com', role: 'STUDENT', status: 'ACTIVE', studentId: 'TEST' },
  ] }));
  await page.route('**/auth/users/feedback-user/role', route => failure(route, 'This role change is not allowed.', 409));
  await signIn(page, request);
  await nav(page, 'Users');
  await expect(page.getByText('User directory temporarily unavailable.', { exact: true })).toBeVisible();
  await expect(page.getByText('No matching users', { exact: true })).toHaveCount(0);
  failLoad = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.locator('.user-management-row select').selectOption('MODERATOR');
  await page.getByRole('dialog').getByRole('button', { name: 'Set MODERATOR', exact: true }).click();
  await expect(page.getByText('This role change is not allowed.', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('user-error-feedback.png'), fullPage: true });
  await expect(page.locator('.user-management-row select')).toHaveValue('STUDENT');
  expect(errors).toEqual([]);
});

test('reports and analytics show API failure instead of empty results or zero metrics', async ({ page, request }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/reports', route => failure(route, 'Campus reports unavailable.'));
  await page.route('**/reports/analytics/summary?*', route => failure(route, 'Analytics temporarily unavailable.'));
  await signIn(page, request);
  await nav(page, 'Reports');
  await expect(page.getByText('Campus reports unavailable.', { exact: true })).toBeVisible();
  await expect(page.getByText('No reports found', { exact: true })).toHaveCount(0);
  await nav(page, 'Analytics');
  await expect(page.getByText(/Analytics temporarily unavailable\./)).toBeVisible();
  await expect(page.getByText('Submitted Actions', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('failed mark-all leaves notification unread and reports the failure', async ({ page, request }) => {
  await page.route('**/notifications', route => route.fulfill({ json: [{ id: 'feedback-note', title: 'Feedback notification', message: 'Pending review', read: false }] }));
  await page.route('**/notifications/read-all', route => failure(route, 'Notifications could not be marked as read.'));
  await signIn(page, request);
  await page.getByRole('button', { name: 'Notifications', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Notifications' });
  await expect(menu.getByText('1 unread', { exact: true })).toBeVisible();
  await menu.getByRole('button', { name: 'Mark all read', exact: true }).click();
  await expect(menu.getByText('Notifications could not be marked as read.', { exact: true })).toBeVisible();
  await expect(menu.getByText('1 unread', { exact: true })).toBeVisible();
});

test('coupon API failure cannot be presented as no active offers', async ({ page, request }) => {
  await page.route('**/recognitions/rewards?*', route => failure(route, 'Coupon offers temporarily unavailable.'));
  await signIn(page, request, 'student@ecoquest.local');
  await nav(page, 'Certificates');
  await expect(page.getByText('Coupon offers temporarily unavailable.', { exact: true })).toBeVisible();
  await expect(page.getByText('No active coupon offers are available right now.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});

test('adjustment cannot use a stale wallet after another student fails to load', async ({ page, request }, testInfo) => {
  await page.route('**/auth/users', route => route.fulfill({ json: [
    { id: 'one', studentId: 'FEEDBACK1', displayName: 'First Student', email: 'first@example.com', status: 'ACTIVE' },
    { id: 'two', studentId: 'FEEDBACK2', displayName: 'Second Student', email: 'second@example.com', status: 'ACTIVE' },
  ] }));
  await page.route('**/rewards/wallets/FEEDBACK1', route => route.fulfill({ json: { studentId: 'FEEDBACK1', totalPoints: 100, availablePoints: 100 } }));
  await page.route('**/rewards/wallets/*/transactions', route => route.fulfill({ json: [] }));
  await page.route('**/rewards/wallets/FEEDBACK2', route => failure(route, 'Wallet temporarily unavailable.'));
  await signIn(page, request);
  await nav(page, 'Adjust Points');
  await page.getByLabel('Adjustment', { exact: true }).fill('10');
  await page.getByLabel('Audit reason').fill('Approved correction');
  const apply = page.getByRole('button', { name: 'Review and apply adjustment' });
  await expect(apply).toBeEnabled();
  await page.getByRole('button', { name: /Second Student second@example.com/ }).click();
  await expect(page.getByText('Wallet temporarily unavailable.', { exact: true })).toBeVisible();
  await expect(apply).toBeDisabled();
  await expect(page.locator('.adjust-balance strong').first()).toHaveText('-');
  await page.screenshot({ path: testInfo.outputPath('wallet-error-feedback.png'), fullPage: true });
});

test('rank API failure is not presented as an unranked student', async ({ page, request }) => {
  await page.route('**/leaderboards/users/*/rank?*', route => failure(route, 'Rank temporarily unavailable.'));
  await signIn(page, request, 'student@ecoquest.local');
  await nav(page, 'Leaderboard');
  await expect(page.getByText('Rank temporarily unavailable.', { exact: true })).toBeVisible();
});
