export function claimFeedback(claim) {
  if (claim.status === 'ISSUED') return { type: 'success', message: 'Voucher ready', sub: 'Your voucher has been issued.' };
  if (claim.status === 'REDEEMED') return { type: 'info', message: 'Voucher already redeemed', sub: 'This voucher has already been used.' };
  if (claim.status === 'FAILED') return { type: 'error', message: 'Redemption failed', sub: claim.failureReason || 'The wallet debit could not be confirmed. Refresh your balance before trying again.' };
  if (claim.status === 'PENDING') return { type: 'info', message: 'Redemption pending', sub: 'Your wallet debit is being confirmed.' };
  return { type: 'warning', message: 'Voucher unavailable', sub: 'Refresh your redemption history to check this voucher.' };
}

export function mergeNotification(items, notification) {
  if (!notification?.id) return items;
  const existing = items.find(item => item.id === notification.id);
  if (existing) return items.map(item => item.id === notification.id
    ? { ...item, ...notification, read: Boolean(item.read || notification.read) } : item);
  return [notification, ...items];
}
