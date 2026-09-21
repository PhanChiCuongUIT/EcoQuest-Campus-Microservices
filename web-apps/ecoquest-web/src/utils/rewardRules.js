export function badgeProgress(def, transactions, totalPoints) {
  const countBased = def.criteriaType === 'ACTION_COUNT';
  const current = countBased ? transactions.filter(t => t.actionType === def.actionType && t.points > 0).length : totalPoints;
  const target = countBased ? def.requiredCount : def.requiredPoints;
  return { current, target, unit: countBased ? 'approved actions' : 'points', percent: target > 0 ? Math.min(100, Math.max(0, Math.round(current / target * 100))) : 0 };
}
export function transactionLabel(tx, missions = []) {
  if (tx.reason) return tx.reason;
  const mission = missions.find(m => m.id === tx.missionId);
  if (mission) return `Approved mission: ${mission.title}`;
  if (tx.actionType === 'ADMIN_ADJUSTMENT') return 'Administrator point adjustment';
  if (tx.actionType === 'COUPON_REDEMPTION') return 'Coupon redemption';
  return tx.actionType ? `Approved activity: ${tx.actionType.replaceAll('_', ' ').toLowerCase()}` : 'Approved sustainability activity';
}
