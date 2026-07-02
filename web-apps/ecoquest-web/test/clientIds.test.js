import assert from 'node:assert/strict';
import test from 'node:test';

import { createClientId } from '../src/utils/clientIds.js';

test('client id uses crypto randomUUID when available', () => {
  const id = createClientId('submit', { randomUUID: () => 'uuid-123' });
  assert.equal(id, 'submit-uuid-123');
});

test('client id falls back when crypto randomUUID is unavailable', () => {
  const id = createClientId('submit', {});
  assert.match(id, /^submit-[a-z0-9]+-[a-z0-9]+$/);
});
