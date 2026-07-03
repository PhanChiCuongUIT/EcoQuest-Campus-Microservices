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

export function validateEvidenceBatch(existingItems = [], files = [], { maxImages = 5 } = {}) {
  const nextFiles = Array.from(files || []);
  if (nextFiles.length === 0) return 'A file is required.';
  const combined = [...existingItems, ...nextFiles];
  const videoCount = combined.filter(item => (item.contentType || item.type || '').startsWith('video/')).length;
  const documentCount = combined.filter(item => (item.contentType || item.type || '') === 'application/pdf').length;
  const imageCount = combined.filter(item => (item.contentType || item.type || '').startsWith('image/')).length;

  if (videoCount > 0 && combined.length > 1) {
    return 'Upload either multiple images or one video.';
  }
  if (documentCount > 0 && combined.length > 1) {
    return 'Upload a document by itself, or use multiple images instead.';
  }
  if (imageCount > maxImages) {
    return `Upload up to ${maxImages} images.`;
  }
  return '';
}

export function isValidReportingRange({ period, year, from, to, currentYear, currentMonth, currentWeek }) {
  if (from > to) return false;
  if (period === 'yearly') return to <= currentYear;
  if (year > currentYear) return false;
  if (period === 'monthly') return year < currentYear || to <= currentMonth;
  return year < currentYear || to <= currentWeek;
}

export function normalizeStudentId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function hasStudentIdentity(value) {
  return normalizeStudentId(value).length > 0;
}
