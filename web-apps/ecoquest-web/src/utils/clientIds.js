export function createClientId(prefix = 'client', cryptoProvider = globalThis.crypto) {
  const randomUuid = cryptoProvider?.randomUUID?.();
  if (randomUuid) {
    return `${prefix}-${randomUuid}`;
  }
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${timePart}-${randomPart}`;
}
