/**
 * EcoQuest Campus API Client
 * Calls backend through Spring Cloud Gateway.
 * Uses VITE_API_BASE_URL if set (dev outside container), otherwise relative paths (nginx proxy).
 */
import axios from 'axios';

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const client = axios.create({ baseURL: BASE });

// ── Auth header injection ──────────────────────────────────────

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('eq-access-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth API (/auth) ───────────────────────────────────────────

export const authRegister = (data) =>
  client.post('/auth/register', data).then(r => r.data);

export const authLogin = (email, password) =>
  client.post('/auth/login', { email, password }).then(r => r.data);

export const authForgotPassword = (email) =>
  client.post('/auth/forgot-password', { email }).then(r => r.data);

export const authResetPassword = (resetToken, newPassword) =>
  client.post('/auth/reset-password', { resetToken, newPassword }).then(r => r.data);

export const authMe = () =>
  client.get('/auth/me').then(r => r.data);

// ── Catalog ───────────────────────────────────────────────────

export const getMissions = () => client.get('/catalog/missions').then(r => r.data);
export const getManagedMissions = () => client.get('/catalog/missions?management=true').then(r => r.data);
export const createMission = (data) => client.post('/catalog/missions', data).then(r => r.data);
export const updateMission = (id, data) => client.put(`/catalog/missions/${id}`, data).then(r => r.data);
export const updateMissionStatus = (id, status) =>
  client.put(`/catalog/missions/${id}/status?status=${status}`).then(r => r.data);
export const deleteMission = (id) => client.delete(`/catalog/missions/${id}`).then(r => r.data);

export const getStations = () => client.get('/catalog/stations').then(r => r.data);
export const createStation = (data) => client.post('/catalog/stations', data).then(r => r.data);
export const updateStation = (id, data) => client.put(`/catalog/stations/${id}`, data).then(r => r.data);
export const uploadStationImage = (id, data) => client.post(`/catalog/stations/${id}/image`, data).then(r => r.data);
export const deleteStation = (id) => client.delete(`/catalog/stations/${id}`).then(r => r.data);

export const getBadgeDefs = () => client.get('/catalog/badges').then(r => r.data);
export const createBadgeDef = (data) => client.post('/catalog/badges', data).then(r => r.data);
export const updateBadgeDef = (code, data) => client.put(`/catalog/badges/${code}`, data).then(r => r.data);
export const deleteBadgeDef = (code) => client.delete(`/catalog/badges/${code}`).then(r => r.data);

// ── Actions ───────────────────────────────────────────────────

export const saveDraft = (data) => client.post('/actions/drafts', data).then(r => r.data);

export const uploadEvidence = (data) =>
  client.post('/actions/evidence', data).then(r => r.data);

export const submitAction = (data) =>
  client.post('/actions/submit', {
    ...data,
    idempotencyKey: crypto.randomUUID(),
  }).then(r => r.data);

export const getUserActions = (studentId) =>
  client.get(`/actions/user/${studentId}`).then(r => r.data);

export const getPendingReview = () =>
  client.get('/actions/review').then(r => r.data);

export const approveAction = (id) =>
  client.put(`/actions/${id}/approve`).then(r => r.data);

export const rejectAction = (id, reason) =>
  client.put(`/actions/${id}/reject`, { reason }).then(r => r.data);

// ── Rewards ───────────────────────────────────────────────────

export const getWallet = (studentId) =>
  client.get(`/rewards/wallets/${studentId}`).then(r => r.data);

export const getTransactions = (studentId) =>
  client.get(`/rewards/wallets/${studentId}/transactions`).then(r => r.data);

export const getUnlockedBadges = (studentId) =>
  client.get(`/rewards/wallets/${studentId}/badges`).then(r => r.data);

export const adjustPoints = (studentId, points, reason) =>
  client.post('/rewards/adjust', { studentId, points, reason }).then(r => r.data);

// ── Leaderboard ───────────────────────────────────────────────

export const getWeeklyLeaderboard = (limit = 10) =>
  client.get(`/leaderboards/weekly?limit=${limit}`).then(r => r.data);

export const getMonthlyLeaderboard = (limit = 10) =>
  client.get(`/leaderboards/monthly?limit=${limit}`).then(r => r.data);

export const getStudentRank = (studentId, type = 'weekly') =>
  client.get(`/leaderboards/users/${studentId}/rank?type=${type}`).then(r => r.data);

export const closeSeason = (seasonId, type = 'weekly', winners = 10) =>
  client.post(`/leaderboards/seasons/${seasonId}/close?type=${type}&winners=${winners}`)
    .then(r => r.data);

export const getSeasonSnapshots = (seasonId) =>
  client.get(`/leaderboards/seasons/${seasonId}/snapshots`).then(r => r.data);

// ── Recognition ───────────────────────────────────────────────

export const getCertificates = (studentId) =>
  client.get(`/recognitions/certificates/user/${studentId}`).then(r => r.data);

export const downloadCertificate = async (certId) => {
  const response = await client.get(`/recognitions/certificates/${certId}/download`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ecoquest-certificate-${certId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

export const claimReward = (rewardId, studentId, rewardName) =>
  client.post(`/recognitions/rewards/${rewardId}/claim`, { studentId, rewardName })
    .then(r => r.data);
export const getRewardClaims = (studentId) =>
  client.get(`/recognitions/rewards/claims/user/${studentId}`).then(r => r.data);

// ── Policy (local-only, direct to service) ────────────────────

export const POLICY_BASE = import.meta.env.VITE_POLICY_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:8090`;

export const getPolicyRules = () =>
  axios.get(`${POLICY_BASE}/policies/rules`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('eq-access-token') || ''}` },
  }).then(r => r.data);

export const updatePolicyRule = (actionType, data) =>
  axios.put(`${POLICY_BASE}/policies/rules/${actionType}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('eq-access-token') || ''}` },
  }).then(r => r.data);
export const createPolicyRule = (data) =>
  axios.post(`${POLICY_BASE}/policies/rules`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('eq-access-token') || ''}` },
  }).then(r => r.data);
export const deletePolicyRule = (actionType) =>
  axios.delete(`${POLICY_BASE}/policies/rules/${actionType}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('eq-access-token') || ''}` },
  }).then(r => r.data);

// Reports
export const createReport = (data) => client.post('/reports', data).then(r => r.data);
export const getMyReports = () => client.get('/reports/mine').then(r => r.data);
export const getReports = (status) =>
  client.get(`/reports${status ? `?status=${status}` : ''}`).then(r => r.data);
export const reviewReport = (id, status, note) =>
  client.put(`/reports/${id}/review`, { status, note }).then(r => r.data);
export const uploadReportEvidence = (data) =>
  client.post('/reports/evidence', data).then(r => r.data);
export const getReportAnalyticsSummary = (period = 'weekly') =>
  client.get(`/reports/analytics/summary?period=${period}`).then(r => r.data);
export const getReportAnalyticsSeries = (period = 'weekly', options = {}) => {
  const params = new URLSearchParams({ period });
  if (options.year) params.set('year', options.year);
  if (options.fromWeek) params.set('fromWeek', options.fromWeek);
  if (options.toWeek) params.set('toWeek', options.toWeek);
  if (options.fromMonth) params.set('fromMonth', options.fromMonth);
  if (options.toMonth) params.set('toMonth', options.toMonth);
  if (options.fromYear) params.set('fromYear', options.fromYear);
  if (options.toYear) params.set('toYear', options.toYear);
  return client.get(`/reports/analytics/series?${params.toString()}`).then(r => r.data);
};
const appendAnalyticsRangeParams = (params, options = {}) => {
  if (options.period) params.set('period', options.period);
  if (options.year) params.set('year', options.year);
  if (options.week) params.set('week', options.week);
  if (options.month) params.set('month', options.month);
  if (options.fromWeek) params.set('fromWeek', options.fromWeek);
  if (options.toWeek) params.set('toWeek', options.toWeek);
  if (options.fromMonth) params.set('fromMonth', options.fromMonth);
  if (options.toMonth) params.set('toMonth', options.toMonth);
  if (options.fromYear) params.set('fromYear', options.fromYear);
  if (options.toYear) params.set('toYear', options.toYear);
};
export const getStudentAnalytics = (studentId, options = {}) => {
  const params = new URLSearchParams();
  appendAnalyticsRangeParams(params, options);
  const query = params.toString();
  return client.get(`/reports/analytics/students/${studentId}${query ? `?${query}` : ''}`).then(r => r.data);
};
export const getStudentAnalyticsOutcomes = (options = {}) => {
  const params = new URLSearchParams();
  appendAnalyticsRangeParams(params, options);
  return client.get(`/reports/analytics/students?${params.toString()}`).then(r => r.data);
};
export const downloadReportAnalytics = async (period = 'weekly', options = {}) => {
  const params = new URLSearchParams({ period });
  if (options.scope) params.set('scope', options.scope);
  if (options.year) params.set('year', options.year);
  if (options.week) params.set('week', options.week);
  if (options.month) params.set('month', options.month);
  if (options.fromWeek) params.set('fromWeek', options.fromWeek);
  if (options.toWeek) params.set('toWeek', options.toWeek);
  if (options.fromMonth) params.set('fromMonth', options.fromMonth);
  if (options.toMonth) params.set('toMonth', options.toMonth);
  if (options.fromYear) params.set('fromYear', options.fromYear);
  if (options.toYear) params.set('toYear', options.toYear);
  const response = await client.get(`/reports/analytics/export?${params.toString()}`, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const suffix = options.scope === 'series'
    ? 'series'
    : options.week
      ? `w${String(options.week).padStart(2, '0')}-${options.year}`
      : options.month
        ? `${String(options.month).padStart(2, '0')}-${options.year}`
        : options.year || period;
  link.download = `ecoquest-analytics-${period}-${suffix}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

// Notifications
export const getNotifications = () => client.get('/notifications').then(r => r.data);
export const markNotificationRead = (id) => client.put(`/notifications/${id}/read`).then(r => r.data);
export const markAllNotificationsRead = () => client.put('/notifications/read-all').then(r => r.data);
export const createNotification = (data) => client.post('/notifications', data).then(r => r.data);
export const openNotificationStream = (onNotification) => {
  const token = localStorage.getItem('eq-access-token');
  if (!token || typeof EventSource === 'undefined') return null;
  const source = new EventSource(`${BASE}/notifications/stream?accessToken=${encodeURIComponent(token)}`);
  source.addEventListener('notification', (event) => {
    try {
      onNotification(JSON.parse(event.data));
    } catch {
      // Ignore malformed stream messages and let polling remain the fallback.
    }
  });
  return source;
};

// Identity user/profile management
export const verifyEmail = (verificationToken) =>
  client.post('/auth/verify-email', { verificationToken }).then(r => r.data);
export const resendVerification = (email) =>
  client.post('/auth/resend-verification', { email }).then(r => r.data);
export const updateMyProfile = (data) => client.put('/auth/me/profile', data).then(r => r.data);
export const uploadAvatar = (data) => client.post('/auth/me/avatar', data).then(r => r.data);
export const getUsers = () => client.get('/auth/users').then(r => r.data);
export const getReportTargetUsers = () => client.get('/auth/report-targets/users').then(r => r.data);
export const updateUserRole = (id, role) =>
  client.put(`/auth/users/${id}/role`, { role }).then(r => r.data);
export const updateUserStatus = (id, status, reason) =>
  client.put(`/auth/users/${id}/status`, { status, reason }).then(r => r.data);
export const deleteBannedUser = (id) => client.delete(`/auth/users/${id}`).then(r => r.data);
