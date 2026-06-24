import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeMissions,
  allowedUiRoles,
  canSubmitMission,
  visibleMissions,
} from '../src/utils/accessRules.js';

const missions = [
  { id: 'A', status: 'ACTIVE' },
  { id: 'P', status: 'PENDING' },
  { id: 'R', status: 'REJECTED' },
  { id: 'C', status: 'CANCELLED' },
  { id: 'D', status: 'COMPLETED' },
];

test('student mission view excludes pending and rejected missions', () => {
  assert.deepEqual(visibleMissions(missions).map(m => m.id), ['A', 'C', 'D']);
});

test('only active missions can be submitted', () => {
  assert.deepEqual(activeMissions(missions).map(m => m.id), ['A']);
  assert.equal(canSubmitMission(missions[0]), true);
  assert.equal(canSubmitMission(missions[3]), false);
});

test('role switching follows backend role inheritance', () => {
  assert.deepEqual(allowedUiRoles('STUDENT'), ['Student']);
  assert.deepEqual(allowedUiRoles('MODERATOR'), ['Student', 'Moderator']);
  assert.deepEqual(allowedUiRoles('ADMIN'), ['Moderator', 'Admin']);
});
