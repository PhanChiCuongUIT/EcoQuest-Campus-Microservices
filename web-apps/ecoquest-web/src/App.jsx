import React, { useEffect, useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar  from './components/TopBar.jsx';
import BottomNav from './components/BottomNav.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';

import AuthGate          from './views/AuthGate.jsx';
import StudentDashboard  from './views/StudentDashboard.jsx';
import SubmitActionModal from './views/SubmitActionModal.jsx';
import WalletBadges      from './views/WalletBadges.jsx';
import Leaderboard       from './views/Leaderboard.jsx';
import ModeratorReview   from './views/ModeratorReview.jsx';
import Certificates      from './views/Certificates.jsx';
import AdminCatalog      from './views/AdminCatalog.jsx';
import AdminPolicy       from './views/AdminPolicy.jsx';
import AdminAdjust       from './views/AdminAdjust.jsx';
import Reports           from './views/Reports.jsx';
import Profile           from './views/Profile.jsx';
import AdminUsers        from './views/AdminUsers.jsx';
import Missions          from './views/Missions.jsx';
import { AdminDashboard, ModeratorDashboard } from './views/RoleDashboard.jsx';
import { allowedUiRoles } from './utils/accessRules.js';

/* ── View Titles ─────────────────────────────────────────────── */
const VIEW_TITLES = {
  dashboard:    'Dashboard',
  missions:     'Missions',
  wallet:       'Wallet & Badges',
  leaderboard:  'Leaderboard',
  certificates: 'Certificates',
  review:       'Moderator Review',
  catalog:      'Catalog Management',
  policy:       'Policy Rules',
  adjust:       'Adjust Points',
  reports:      'Reports',
  profile:      'Profile',
  users:        'User Management',
  more:         'More',
};

/* ── Theme Helpers ───────────────────────────────────────────── */
function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('eq-theme', theme);
}

/* ── Inner App (inside AuthProvider) ────────────────────────── */
function AppInner() {
  const { user, uiRole, studentId: authStudentId, loading } = useAuth();

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('eq-theme') || getSystemTheme());
  useEffect(() => { applyTheme(theme); }, [theme]);
  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  // Role & Navigation — initially derived from auth user, but can be overridden for demo
  const [role, setRole]           = useState('Student');
  const [activeView, setActiveView] = useState('dashboard');

  // When auth user loads, sync role from backend role
  useEffect(() => {
    if (user) {
      const map = { STUDENT: 'Student', MODERATOR: 'Moderator', ADMIN: 'Admin' };
      setRole(map[user.role] || 'Student');
    }
  }, [user]);

  // Student ID — starts from auth user, but can be changed for viewing other students (admin demo)
  const [studentId, setStudentId] = useState(authStudentId);
  useEffect(() => { setStudentId(authStudentId); }, [authStudentId]);

  // Submit modal
  const [submitOpen, setSubmitOpen]         = useState(false);
  const [prefillMission, setPrefillMission] = useState(null);

  // Mobile sidebar overlay
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSubmitMission = (mission) => {
    setPrefillMission(mission);
    setSubmitOpen(true);
  };

  const handleCloseSubmit = () => {
    setSubmitOpen(false);
  };
  const allowedRoles = allowedUiRoles(user?.role);

  /* ── Show auth gate while session loading or not logged in ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="EcoQuest" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 16, opacity: 0.7 }} />
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading EcoQuest…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthGate />;
  }

  /* ── Student ID selector only on student-scoped views ── */
  const showStudentId = role !== 'Admin'
    && ['dashboard', 'wallet', 'certificates'].includes(activeView);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        if (role === 'Admin') return <AdminDashboard />;
        if (role === 'Moderator') return <ModeratorDashboard studentId={studentId} onSubmitMission={handleSubmitMission} />;
        return <StudentDashboard studentId={studentId} onSubmitMission={handleSubmitMission} />;
      case 'missions':     return <Missions onSubmitMission={handleSubmitMission} />;
      case 'wallet':       return <WalletBadges studentId={studentId} />;
      case 'leaderboard':  return <Leaderboard studentId={studentId} role={role} />;
      case 'certificates': return <Certificates studentId={studentId} />;
      case 'review':       return <ModeratorReview />;
      case 'catalog':      return <AdminCatalog />;
      case 'policy':       return <AdminPolicy />;
      case 'adjust':       return <AdminAdjust />;
      case 'reports':      return <Reports />;
      case 'profile':      return <Profile />;
      case 'users':        return <AdminUsers />;
      case 'more':         return (
        <div>
          <div className="section-title">More Options</div>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {['review', 'catalog', 'users', 'reports', 'policy', 'adjust', 'certificates', 'leaderboard', 'profile'].map(v => (
              <button
                key={v}
                className="btn btn-outline w-full"
                style={{ justifyContent: 'flex-start' }}
                onClick={() => setActiveView(v)}
              >
                {VIEW_TITLES[v]}
              </button>
            ))}
            <div className="divider" />
            <div>
              <label className="form-label">Switch Role</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {allowedRoles.map(r => (
                  <button
                    key={r}
                    className={`btn btn-sm ${role === r ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setRole(r); setActiveView('dashboard'); }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
      default: return <StudentDashboard studentId={studentId} onSubmitMission={handleSubmitMission} />;
    }
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="app-shell">
        {/* Sidebar (desktop persistent, mobile overlay) */}
        <Sidebar
          role={role}
          setRole={setRole}
          activeView={activeView}
          setActiveView={(v) => { setActiveView(v); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
          className={sidebarOpen ? 'open' : ''}
        />

        {/* Main area */}
        <div className="app-main">
          <TopBar
            title={VIEW_TITLES[activeView] || 'EcoQuest'}
            studentId={studentId}
            setStudentId={showStudentId ? setStudentId : null}
            theme={theme}
            toggleTheme={toggleTheme}
            onMenuClick={() => setSidebarOpen(true)}
            onNavigate={setActiveView}
          />

          <main className="app-content" id="main-content">
            {renderView()}
          </main>
        </div>

        {/* Mobile bottom nav */}
        {role !== 'Admin' && (
          <BottomNav
            activeView={activeView}
            setActiveView={setActiveView}
            role={role}
            setRole={setRole}
          />
        )}
      </div>

      {/* Submit Action Modal (always mounted so state persists) */}
      <SubmitActionModal
        isOpen={submitOpen}
        onClose={handleCloseSubmit}
        studentId={studentId}
        prefillMission={prefillMission}
      />
      </ConfirmProvider>
    </ToastProvider>
  );
}

/* ── App root — wraps with providers ─────────────────────────── */
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
