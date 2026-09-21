export function validatePolicyRule(rule) {
  if (!/^[A-Z0-9][A-Z0-9_-]{0,79}$/.test(rule.actionType?.trim().toUpperCase() || '')) {
    return 'Action type must be 1-80 letters, numbers, underscores or hyphens.';
  }
  for (const [field, label] of [['basePoints', 'Base points'], ['dailyLimit', 'Daily limit']]) {
    if (!Number.isInteger(rule[field]) || rule[field] < 0 || rule[field] > 2147483647) {
      return `${label} must be a non-negative whole number up to 2147483647.`;
    }
  }
  return '';
}
