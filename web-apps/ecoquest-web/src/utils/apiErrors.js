const generic = /^(bad request|unauthorized|forbidden|not found|conflict|internal server error|request failed with status code \d+)\.?$/i;

function detailFrom(body, depth = 0) {
  if (depth > 3 || body == null) return '';
  if (typeof body === 'string') {
    const text = body.trim();
    if (/^[{[]/.test(text)) {
      try { return detailFrom(JSON.parse(text), depth + 1); } catch { return ''; }
    }
    if (!text || text.length > 1500 || /<[^>]+>/.test(text) || generic.test(text)) return '';
    return text;
  }
  if (typeof body === 'object') {
    return detailFrom(body.detail, depth + 1) || detailFrom(body.message, depth + 1);
  }
  return '';
}

export function requestErrorMessage(error) {
  const status = error?.response?.status;
  const detail = detailFrom(error?.response?.data);
  if (detail) return detail;
  if (!status) return 'Cannot connect to EcoQuest. Check your connection and try again.';
  return ({
    400: 'Please check the submitted information and try again.',
    401: 'Your session has expired. Please sign in again.',
    403: 'You do not have permission to perform this operation.',
    404: 'This item no longer exists. Refresh the page and try again.',
    409: 'This item has changed or conflicts with existing data. Refresh and try again.',
    413: 'The upload is too large. Choose smaller files and try again.',
    422: 'Please check the submitted information and try again.',
    429: 'Too many requests. Wait a moment and try again.',
  })[status] || 'EcoQuest is temporarily unavailable. Please try again shortly.';
}

export async function normalizeApiError(error) {
  // Download endpoints return Blob even when the response is a JSON error.
  if (typeof Blob !== 'undefined' && error?.response?.data instanceof Blob) {
    error.response.data = await error.response.data.text();
  }
  const message = requestErrorMessage(error);
  error.message = message;
  if (error.response) {
    const body = error.response.data;
    error.response.data = { ...(body && typeof body === 'object' ? body : {}), detail: message, message };
  }
  throw error;
}
