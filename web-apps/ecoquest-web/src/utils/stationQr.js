export function stationToken(value) {
  try {
    const url = new URL(value);
    const token = new URLSearchParams(url.hash.slice(1)).get('station');
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token || '')) return token;
  } catch { /* Only versioned station links are accepted. */ }
  throw new Error('This QR code is not an EcoQuest station link.');
}

export function stationLink(token, origin = window.location.origin) {
  return `${origin}/#station=${encodeURIComponent(token)}`;
}
