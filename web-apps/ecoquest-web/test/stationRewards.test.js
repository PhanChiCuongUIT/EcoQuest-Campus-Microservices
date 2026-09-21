import test from 'node:test';
import assert from 'node:assert/strict';
import { stationLink, stationToken } from '../src/utils/stationQr.js';
import { badgeProgress, transactionLabel } from '../src/utils/rewardRules.js';

test('station QR roundtrips an opaque token, never accepts arbitrary IDs or URLs', () => {
  const token = '9f45a872-17c9-4043-8d1e-40380b0d8e02';
  assert.equal(stationToken(stationLink(token, 'https://campus.example')), token);
  for (const value of ['STATION-A1', 'javascript:alert(1)', 'https://campus.example/#station=STATION-A1'])
    assert.throws(() => stationToken(value));
});
test('action-count badges count matching grants, not point totals or coupon debits', () => {
  const def = { criteriaType: 'ACTION_COUNT', actionType: 'RECYCLE_BOTTLE', requiredCount: 3 };
  const progress = badgeProgress(def, [{ actionType: 'RECYCLE_BOTTLE', points: 10 }, { actionType: 'COUPON_REDEMPTION', points: -10 }], 500);
  assert.deepEqual(progress, { current: 1, target: 3, unit: 'approved actions', percent: 33 });
});
test('point badge progress is finite and based on cumulative points', () => {
  assert.equal(badgeProgress({ requiredPoints: 10 }, [], 20).percent, 100);
  assert.equal(badgeProgress({ requiredPoints: 0 }, [], 0).percent, 0);
});
test('wallet activity uses reasons and mission names instead of action IDs', () => {
  assert.equal(transactionLabel({ reason: 'Coupon: Cafe', sourceActionId: 'CLAIM-X' }), 'Coupon: Cafe');
  assert.equal(transactionLabel({ missionId: 'M', sourceActionId: 'ACT-X' }, [{ id: 'M', title: 'Recycle' }]), 'Approved mission: Recycle');
  assert.equal(transactionLabel({ sourceActionId: 'ACT-X' }).includes('ACT-X'), false);
});
