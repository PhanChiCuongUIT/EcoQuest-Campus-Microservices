import test from 'node:test';
import assert from 'node:assert/strict';
import { claimFeedback, mergeNotification } from '../src/utils/feedback.js';

test('claim feedback reflects actual asynchronous state, never failure as pending', () => {
  assert.equal(claimFeedback({ status: 'PENDING' }).message, 'Redemption pending');
  assert.equal(claimFeedback({ status: 'ISSUED' }).type, 'success');
  assert.equal(claimFeedback({ status: 'FAILED', failureReason: 'Insufficient available points.' }).sub, 'Insufficient available points.');
  assert.equal(claimFeedback({ status: 'FAILED' }).type, 'error');
  assert.match(claimFeedback({ status: 'REDEEMED' }).message, /already redeemed/);
  assert.notEqual(claimFeedback({ status: 'EXPIRED' }).message, 'Redemption pending');
});
test('duplicate SSE delivery cannot increase unread count or undo local read state', () => {
  let items = mergeNotification([], { id: '1', read: false });
  items = mergeNotification(items, { id: '1', read: false });
  assert.equal(items.length, 1);
  items = mergeNotification([{ id: '1', read: true }], { id: '1', read: false });
  assert.equal(items.filter(item => !item.read).length, 0);
  assert.equal(mergeNotification(items, {}).length, 1);
});
