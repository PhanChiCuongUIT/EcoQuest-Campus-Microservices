export function reportTargetOptions(role) {
  if (role === 'MODERATOR') return [['USER', 'User'], ['ACTION', 'Student action']];
  if (role === 'STUDENT') return [['USER', 'User'], ['MISSION', 'Mission']];
  return [];
}

export function projectedWalletBalance(currentBalance, adjustment) {
  return Number(currentBalance || 0) + Number(adjustment || 0);
}

export function canApplyPointAdjustment(currentBalance, adjustment, reason) {
  return Number(adjustment) !== 0
    && projectedWalletBalance(currentBalance, adjustment) >= 0
    && Boolean(reason?.trim());
}

export function validateUpload(file, { maxBytes, allowedTypes }) {
  if (!file) return 'A file is required.';
  if (!allowedTypes.includes(file.type)) return 'Unsupported file type.';
  if (file.size <= 0) return 'The file is empty.';
  if (file.size > maxBytes) return 'The file is too large.';
  return '';
}
