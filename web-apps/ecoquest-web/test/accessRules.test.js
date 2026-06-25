import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeMissions,
  allowedUiRoles,
  canSubmitMission,
  panelViewsForRole,
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

test('panel navigation does not leak student pages into moderator or admin panels', () => {
  assert.deepEqual(panelViewsForRole('Student'), [
    'dashboard', 'missions', 'wallet', 'leaderboard', 'certificates', 'reports', 'profile',
  ]);
  assert.deepEqual(panelViewsForRole('Moderator'), [
    'dashboard', 'review', 'catalog', 'reports', 'leaderboard', 'profile',
  ]);
  assert.deepEqual(panelViewsForRole('Admin'), [
    'dashboard', 'analytics', 'reports', 'catalog', 'users', 'policy', 'adjust', 'profile',
  ]);
  assert.equal(panelViewsForRole('Moderator').includes('wallet'), false);
  assert.equal(panelViewsForRole('Admin').includes('certificates'), false);
});
