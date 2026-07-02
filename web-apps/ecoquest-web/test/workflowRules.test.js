import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canApplyPointAdjustment,
  isValidReportingRange,
  projectedWalletBalance,
  reportTargetOptions,
  validateEvidenceBatch,
  validateUpload,
} from '../src/utils/workflowRules.js';
import { loginErrorMessage } from '../src/utils/authErrors.js';

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

test('action evidence accepts multiple images or one video, not mixed media', () => {
  const image = { type: 'image/png', size: 5 };
  const video = { type: 'video/mp4', size: 5 };
  assert.equal(validateEvidenceBatch([], [image, image], { maxImages: 5 }), '');
  assert.equal(validateEvidenceBatch([], [video], { maxImages: 5 }), '');
  assert.equal(validateEvidenceBatch([image], [video], { maxImages: 5 }), 'Upload either multiple images or one video.');
  assert.equal(validateEvidenceBatch([], [image, image, image], { maxImages: 2 }), 'Upload up to 2 images.');
});

test('login errors distinguish credentials, verification, inactive, banned and network failures', () => {
  const response = (status, detail) => ({ response: { status, data: { detail } } });
  assert.equal(loginErrorMessage(response(401, 'Invalid email or password.')), 'Invalid email or password.');
  assert.match(loginErrorMessage(response(403, 'Email must be verified before login.')), /not verified/i);
  assert.match(loginErrorMessage(response(403, 'Account is inactive. Reason: Pending review')), /inactive/i);
  assert.match(loginErrorMessage(response(403, 'Account is banned. Reason: Abuse')), /banned/i);
  assert.match(loginErrorMessage({}), /connect/i);
});

test('reporting ranges are ordered and cannot include future periods', () => {
  const now = { currentYear: 2026, currentMonth: 6, currentWeek: 26 };
  assert.equal(isValidReportingRange({ period: 'weekly', year: 2026, from: 20, to: 26, ...now }), true);
  assert.equal(isValidReportingRange({ period: 'weekly', year: 2026, from: 26, to: 20, ...now }), false);
  assert.equal(isValidReportingRange({ period: 'weekly', year: 2026, from: 20, to: 27, ...now }), false);
  assert.equal(isValidReportingRange({ period: 'monthly', year: 2026, from: 2, to: 6, ...now }), true);
  assert.equal(isValidReportingRange({ period: 'monthly', year: 2026, from: 2, to: 7, ...now }), false);
  assert.equal(isValidReportingRange({ period: 'yearly', from: 2024, to: 2026, ...now }), true);
  assert.equal(isValidReportingRange({ period: 'yearly', from: 2027, to: 2026, ...now }), false);
  assert.equal(isValidReportingRange({ period: 'yearly', from: 2025, to: 2027, ...now }), false);
});
