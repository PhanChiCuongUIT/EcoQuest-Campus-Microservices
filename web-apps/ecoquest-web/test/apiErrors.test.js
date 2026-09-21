import test from 'node:test';
import assert from 'node:assert/strict';
import { requestErrorMessage, normalizeApiError } from '../src/utils/apiErrors.js';
import { validatePolicyRule } from '../src/utils/policyRules.js';

const failure = (status, data) => ({ message: `Request failed with status code ${status}`, response: { status, data } });
test('domain errors retain wrong-station and conflict explanations', () => {
  assert.equal(requestErrorMessage(failure(400, { detail: 'This station is not assigned to the mission.' })), 'This station is not assigned to the mission.');
  assert.equal(requestErrorMessage(failure(409, { message: 'Policy rule already exists.' })), 'Policy rule already exists.');
});
test('legacy nested service errors and validation details are readable', () => {
  assert.equal(requestErrorMessage(failure(400, { detail: JSON.stringify({ message: 'Scan the station QR before submitting.' }) })), 'Scan the station QR before submitting.');
  assert.equal(requestErrorMessage(failure(400, { detail: 'title: must not be blank' })), 'title: must not be blank');
});
test('generic JSON, HTML, network and HTTP errors get actionable messages', () => {
  assert.match(requestErrorMessage(failure(400, { error: 'Bad Request' })), /submitted information/);
  assert.match(requestErrorMessage(failure(413, '<html>413 Request Entity Too Large</html>')), /smaller files/);
  assert.match(requestErrorMessage(failure(403, {})), /permission/);
  assert.match(requestErrorMessage(failure(500, {})), /temporarily/);
  assert.match(requestErrorMessage({}), /connection/);
});
test('normalization preserves status and supplies all existing view error fallbacks', async () => {
  const error = failure(409, new Blob([JSON.stringify({ detail: 'Station scan expired. Please scan again.' })]));
  await assert.rejects(normalizeApiError(error), err => {
    assert.equal(err.response.status, 409);
    assert.equal(err.message, 'Station scan expired. Please scan again.');
    assert.equal(err.response.data.detail, err.message);
    assert.equal(err.response.data.message, err.message);
    return true;
  });
});
test('policy CRUD validates action types, integers and non-negative limits', () => {
  const rule = { actionType: 'RECYCLE_BOTTLE', basePoints: 10, dailyLimit: 0 };
  assert.equal(validatePolicyRule(rule), '');
  for (const patch of [{ actionType: '' }, { actionType: 'A/B' }, { basePoints: -1 }, { dailyLimit: 1.5 }, { dailyLimit: 2147483648 }]) {
    assert.notEqual(validatePolicyRule({ ...rule, ...patch }), '');
  }
});
