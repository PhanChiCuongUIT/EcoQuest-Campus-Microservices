import { test, expect } from '@playwright/test';

test('SSE emits once for overlapping recipients and inbox survives disconnect', async ({ page, request }, info) => {
  const login = async email => {
    const response = await request.post('/auth/login', { data: { email, password: 'EcoQuest@123' } });
    expect(response.ok()).toBeTruthy();
    return (await response.json()).accessToken;
  };
  const token = await login('student@ecoquest.local');
  const admin = await login('admin@ecoquest.local');
  const headers = { Authorization: `Bearer ${token}` };
  const user = await (await request.get('/auth/me', { headers })).json();
  expect(user.id).toBeTruthy();
  expect(user.studentId).toBeTruthy();
  await page.addInitScript(value => localStorage.setItem('eq-access-token', value), token);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
  await page.evaluate(value => {
    window.testNotifications = [];
    window.testStream = new EventSource(`/notifications/stream?accessToken=${encodeURIComponent(value)}`);
    window.testStream.addEventListener('notification', event => window.testNotifications.push(JSON.parse(event.data).id));
  }, token);
  await expect.poll(() => page.evaluate(() => window.testStream.readyState), { timeout: 15000 }).toBe(1);
  const title = `E2E SSE ${Date.now()} ${info.project.name}`;
  const create = async suffix => {
    const response = await request.post('/notifications', {
      headers: { Authorization: `Bearer ${admin}` },
      data: { userId: user.id, studentId: user.studentId, type: 'TEST', title: `${title} ${suffix}`, message: 'E2E stream regression', link: '/profile' },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    return (await response.json()).id;
  };
  const first = await create('first');
  await expect.poll(() => page.evaluate(id => window.testNotifications.includes(id), first)).toBeTruthy();
  const second = await create('second');
  await expect.poll(() => page.evaluate(id => window.testNotifications.includes(id), second)).toBeTruthy();
  const received = await page.evaluate(() => window.testNotifications);
  expect(new Set(received).size).toBe(received.length);
  await page.evaluate(() => window.testStream.close());
  const third = await create('after disconnect');
  const inbox = await request.get('/notifications', { headers });
  expect(inbox.ok()).toBeTruthy();
  expect((await inbox.json()).some(item => item.id === third)).toBeTruthy();
});
