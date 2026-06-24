import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canApplyPointAdjustment,
  projectedWalletBalance,
  reportTargetOptions,
  validateUpload,
} from '../src/utils/workflowRules.js';

test('report targets follow student and moderator use cases', () => {
  assert.deepEqual(reportTargetOptions('STUDENT').map(([value]) => value), ['USER', 'MISSION']);
  assert.deepEqual(reportTargetOptions('MODERATOR').map(([value]) => value), ['USER', 'ACTION']);
  assert.deepEqual(reportTargetOptions('ADMIN'), []);
});

test('manual point adjustment supports deductions but never a negative balance', () => {
  assert.equal(projectedWalletBalance(20, -5), 15);
  assert.equal(canApplyPointAdjustment(20, -5, 'Correction'), true);
  assert.equal(canApplyPointAdjustment(3, -5, 'Correction'), false);
  assert.equal(canApplyPointAdjustment(20, 5, '  '), false);
});

test('upload validation enforces type, size, and non-empty files', () => {
  const options = { maxBytes: 10, allowedTypes: ['image/png'] };
  assert.equal(validateUpload({ type: 'image/png', size: 5 }, options), '');
  assert.equal(validateUpload({ type: 'text/plain', size: 5 }, options), 'Unsupported file type.');
  assert.equal(validateUpload({ type: 'image/png', size: 11 }, options), 'The file is too large.');
  assert.equal(validateUpload({ type: 'image/png', size: 0 }, options), 'The file is empty.');
});
