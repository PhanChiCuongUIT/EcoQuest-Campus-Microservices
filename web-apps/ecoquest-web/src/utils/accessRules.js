const STUDENT_VISIBLE_MISSION_STATUSES = new Set(['ACTIVE', 'CANCELLED', 'COMPLETED']);

export function visibleMissions(missions = []) {
  return missions.filter(mission => STUDENT_VISIBLE_MISSION_STATUSES.has(mission.status || 'ACTIVE'));
}

export function activeMissions(missions = []) {
  return visibleMissions(missions).filter(mission => (mission.status || 'ACTIVE') === 'ACTIVE');
}

export function canSubmitMission(mission) {
  return Boolean(mission) && (mission.status || 'ACTIVE') === 'ACTIVE';
}

export function allowedUiRoles(backendRole) {
  if (backendRole === 'ADMIN') return ['Moderator', 'Admin'];
  if (backendRole === 'MODERATOR') return ['Student', 'Moderator'];
  return ['Student'];
}

export const PANEL_VIEWS_BY_ROLE = {
  Student: ['dashboard', 'missions', 'wallet', 'leaderboard', 'certificates', 'reports', 'profile'],
  Moderator: ['dashboard', 'review', 'catalog', 'reports', 'leaderboard', 'profile'],
  Admin: ['dashboard', 'analytics', 'reports', 'catalog', 'users', 'policy', 'adjust', 'profile'],
};

export function panelViewsForRole(role) {
  return PANEL_VIEWS_BY_ROLE[role] || PANEL_VIEWS_BY_ROLE.Student;
}
