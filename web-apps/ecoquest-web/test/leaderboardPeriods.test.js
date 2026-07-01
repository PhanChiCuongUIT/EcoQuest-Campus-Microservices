import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLeaderboardPeriodOptions,
  isoWeekInfo,
  periodParamsFromKey,
} from '../src/utils/leaderboardPeriods.js';

test('leaderboard period options expose only current and past months in the same year', () => {
  const options = buildLeaderboardPeriodOptions('monthly', new Date('2026-07-01T00:00:00Z'));
  assert.equal(options.length, 7);
  assert.deepEqual(options[0].params, { year: 2026, month: 7 });
  assert.deepEqual(options.at(-1).params, { year: 2026, month: 1 });
});

test('leaderboard period options expose current and previous ISO weeks', () => {
  const now = new Date('2026-07-01T00:00:00Z');
  const { year, week } = isoWeekInfo(now);
  const options = buildLeaderboardPeriodOptions('weekly', now);
  assert.equal(options[0].params.year, year);
  assert.equal(options[0].params.week, week);
  assert.equal(options.at(-1).params.week, 1);
});

test('leaderboard period keys become backend query params', () => {
  assert.deepEqual(periodParamsFromKey('monthly', '2026-05'), { year: 2026, month: 5 });
  assert.deepEqual(periodParamsFromKey('weekly', '2026-W27'), { year: 2026, week: 27 });
  assert.deepEqual(periodParamsFromKey('weekly', ''), {});
});
