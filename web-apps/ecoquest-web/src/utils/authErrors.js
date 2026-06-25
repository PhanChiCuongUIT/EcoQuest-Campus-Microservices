export function apiErrorMessage(error) {
  return error?.response?.data?.detail
    || error?.response?.data?.message
    || error?.response?.data?.error
    || '';
}

export function loginErrorMessage(error) {
  const status = error?.response?.status;
  const detail = apiErrorMessage(error);
  const normalized = detail.toLowerCase();

  if (!error?.response) {
    return 'Cannot connect to EcoQuest right now. Check your network and try again.';
  }
  if (status === 401) {
    return detail || 'Invalid email or password.';
  }
  if (status === 403 && normalized.includes('verified')) {
    return 'Your email is not verified yet. Open the verification email or request a new link.';
  }
  if (status === 403 && normalized.includes('banned')) {
    return detail || 'This account has been banned. Contact the campus administrator for support.';
  }
  if (status === 403 && normalized.includes('inactive')) {
    return detail || 'This account is inactive. Contact the campus administrator for support.';
  }
  if (status === 403) {
    return detail || 'This account is not allowed to sign in.';
  }
  if (status === 429) {
    return 'Too many sign-in attempts. Wait a moment and try again.';
  }
  if (status >= 500) {
    return 'EcoQuest sign-in is temporarily unavailable. Please try again shortly.';
  }
  return detail || 'Sign-in failed. Review your information and try again.';
}
