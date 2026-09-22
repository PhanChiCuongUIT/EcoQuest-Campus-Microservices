import { test, expect } from '@playwright/test';
import QRCode from 'qrcode';

const password = 'EcoQuest@123';
async function loginApi(request, email = 'admin@ecoquest.local') {
  const res = await request.post('/auth/login', { data: { email, password } });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken;
}
async function session(page, token, theme = 'light') {
  await page.addInitScript(({ token, theme }) => { localStorage.setItem('eq-access-token', token); localStorage.setItem('eq-theme', theme); }, { token, theme });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
}
async function nav(page, name) {
  if (await page.getByRole('button', { name: 'Open navigation menu' }).isVisible()) await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('navigation', { name: 'App navigation' }).getByRole('button', { name, exact: true }).click();
}
async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
}

test('admin station label and badge/mission forms fit light and dark viewports', async ({ page, request }, info) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await session(page, await loginApi(request));
  await nav(page, 'Catalog');
  await page.getByRole('button', { name: 'Stations', exact: true }).click();
  await page.getByRole('button', { name: 'QR Library Recycling Point', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('img')).toBeVisible();
  expect(await dialog.getByRole('img').evaluate(el => el.naturalWidth)).toBeGreaterThan(0);
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('link', { name: 'Download PNG' }).click()]);
  expect(download.suggestedFilename()).toContain('STATION-A1');
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('station-qr.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Close modal' }).click();
  await page.getByRole('button', { name: 'Badges', exact: true }).click();
  await page.getByRole('button', { name: 'Create Badge', exact: true }).click();
  await expect(page.getByText('Badge image (optional)', { exact: true })).toBeVisible();
  const criteria = page.locator('.form-group').filter({ has: page.getByText('Criteria', { exact: true }) }).locator('select');
  await criteria.selectOption('ACTION_COUNT');
  await expect(page.getByText('Approved actions required', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Light mode', exact: true }).click();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('badge-form-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Missions', exact: true }).click();
  await page.getByRole('button', { name: 'Create Mission', exact: true }).click();
  await page.locator('label[for="st-req"]').click();
  await expect(page.locator('#st-req')).toBeChecked();
  await expect(page.getByRole('group', { name: 'Allowed stations *' })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('mission-stations-dark.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('student scans QR photo then submits for review, earns points only after approval', async ({ page, request }, info) => {
  const suffix = `${Date.now()}-${info.project.name}`;
  const studentId = `SV_E2E_UI_${suffix}`.toUpperCase();
  const email = `e2e-ui-${suffix}@ecoquest.local`;
  const register = await request.post('/auth/register', { data: { email, password, displayName: 'E2E QR Student', studentId } });
  expect(register.ok()).toBeTruthy();
  const { verificationToken } = await register.json();
  expect(verificationToken, 'Run start-project.ps1 -LocalMail for this test').toBeTruthy();
  expect((await request.post('/auth/verify-email', { data: { verificationToken } })).ok()).toBeTruthy();
  const studentToken = await loginApi(request, email);
  const adminToken = await loginApi(request);
  const headers = { Authorization: `Bearer ${adminToken}` };
  const qr = await (await request.get('/catalog/stations/STATION-A1/qr', { headers })).json();
  const png = await QRCode.toBuffer(`http://localhost:3000/#station=${qr.qrToken}`, { width: 600 });
  await session(page, studentToken);
  await nav(page, 'Missions');
  await page.getByRole('button', { name: 'Submit Recycle Bottle', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('#modal-station')).toHaveAttribute('readonly', '');
  const missions = await (await request.get('/catalog/missions', { headers })).json();
  const mission = missions.find(m => m.id === 'MISSION-RECYCLE-01');
  const stations = await (await request.get('/catalog/stations', { headers })).json();
  const wrongStation = stations.find(s => s.active && !mission.allowedStationIds.includes(s.id));
  expect(wrongStation, 'Fixture needs a station outside this mission').toBeTruthy();
  const wrongQr = await (await request.get(`/catalog/stations/${wrongStation.id}/qr`, { headers })).json();
  const wrongPng = await QRCode.toBuffer(`http://localhost:3000/#station=${wrongQr.qrToken}`, { width: 600 });
  const wrongScan = page.waitForResponse(response => response.url().endsWith('/catalog/stations/scan') && response.request().method() === 'POST', { timeout: 30000 });
  await dialog.locator('.station-scanner input[type=file]').setInputFiles({ name: 'wrong-station.png', mimeType: 'image/png', buffer: wrongPng });
  expect((await wrongScan).status()).toBe(400);
  await expect(dialog.getByText('This station is not assigned to the mission.', { exact: true })).toBeVisible();
  await expect(dialog.locator('#modal-station')).toHaveValue('');
  const correctScan = page.waitForResponse(response => response.url().endsWith('/catalog/stations/scan') && response.request().method() === 'POST', { timeout: 30000 });
  await dialog.locator('.station-scanner input[type=file]').setInputFiles({ name: 'station.png', mimeType: 'image/png', buffer: png });
  const scannedResponse = await correctScan;
  expect(scannedResponse.ok(), await scannedResponse.text()).toBeTruthy();
  await expect(dialog.locator('#modal-station')).toHaveValue('Library Recycling Point');
  await dialog.locator('.evidence-dropzone input[type=file]').setInputFiles({ name: 'evidence.png', mimeType: 'image/png', buffer: png });
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('scanned-submission.png'), fullPage: true });
  const submitted = page.waitForResponse(response => response.url().endsWith('/actions/submit') && response.request().method() === 'POST', { timeout: 60000 });
  await dialog.getByRole('button', { name: 'Submit Action', exact: true }).click();
  const submittedResponse = await submitted;
  expect(submittedResponse.ok(), await submittedResponse.text()).toBeTruthy();
  await expect(dialog.getByText('Pending Review', { exact: true })).toBeVisible({ timeout: 30000 });
  const studentHeaders = { Authorization: `Bearer ${studentToken}` };
  const walletResponse = await request.get(`/rewards/wallets/${studentId}`, { headers: studentHeaders });
  expect(walletResponse.ok(), await walletResponse.text()).toBeTruthy();
  const walletBefore = await walletResponse.json();
  expect(walletBefore.totalPoints).toBe(0);
  const actions = await (await request.get(`/actions/user/${studentId}`, { headers: studentHeaders })).json();
  expect(actions).toHaveLength(1);
  expect((await request.put(`/actions/${actions[0].id}/approve`, { headers })).ok()).toBeTruthy();
  await expect.poll(async () => (await (await request.get(`/rewards/wallets/${studentId}`, { headers: studentHeaders })).json()).totalPoints, { timeout: 30000 }).toBe(10);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await nav(page, 'Wallet & Badges');
  await expect(page.getByRole('columnheader', { name: 'Reason / Mission' })).toBeVisible();
  await expect(page.getByText('Approved mission: Recycle Bottle', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('wallet.png'), fullPage: true });
});

test('admin Policy CRUD uses same-origin API and readable validation', async ({ page, request }, info) => {
  const token = await loginApi(request);
  const headers = { Authorization: `Bearer ${token}` };
  const lanPolicy = await request.get('/policies/rules', { headers: {
    ...headers, Host: 'campus-demo.local:3000', Origin: 'http://campus-demo.local:3000',
  } });
  expect(lanPolicy.ok(), await lanPolicy.text()).toBeTruthy();
  const actionType = `E2E_UI_POLICY_${Date.now()}_${info.project.name}`.toUpperCase();
  await session(page, token);
  await nav(page, 'Policy Rules');
  await expect(page.getByText('LOCAL ONLY', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add rule', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#new-policy-action-type').fill(actionType);
  await dialog.locator('#new-policy-points').fill('-1');
  await dialog.getByRole('button', { name: 'Create rule', exact: true }).click();
  await expect(page.getByText('Base points must be a non-negative whole number up to 2147483647.', { exact: true })).toBeVisible();
  await dialog.locator('#new-policy-points').fill('10');
  try {
    const created = page.waitForResponse(response => response.url().endsWith('/policies/rules') && response.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Create rule', exact: true }).click();
    const response = await created;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(dialog).toBeHidden();
    const row = page.getByRole('row').filter({ hasText: actionType });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await row.locator(`label[for="act-${actionType}"]`).click();
    await row.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(row.getByText('Inactive', { exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath('policy-crud.png'), fullPage: true });
    await row.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete rule', exact: true }).click();
    await expect(row).toHaveCount(0);
  } finally {
    await request.put(`/policies/rules/${actionType}`, { headers, data: { actionType, basePoints: 10, dailyLimit: 1, active: false } });
    await request.delete(`/policies/rules/${actionType}`, { headers });
  }
});

test('moderator can decode a station QR and inspect its missions', async ({ page, request }, info) => {
  const admin = await loginApi(request);
  const qr = await (await request.get('/catalog/stations/STATION-A1/qr', { headers: { Authorization: `Bearer ${admin}` } })).json();
  await session(page, await loginApi(request, 'moderator@ecoquest.local'), 'dark');
  await nav(page, 'Stations / Scan QR');
  await page.locator('.station-scanner input[type=file]').setInputFiles({ name: 'station.png', mimeType: 'image/png', buffer: await QRCode.toBuffer(`http://localhost:3000/#station=${qr.qrToken}`) });
  await expect(page.getByRole('heading', { name: 'Library Recycling Point' })).toBeVisible();
  await expect(page.getByText('Recycle Bottle', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('station-lookup-dark.png'), fullPage: true });
});
