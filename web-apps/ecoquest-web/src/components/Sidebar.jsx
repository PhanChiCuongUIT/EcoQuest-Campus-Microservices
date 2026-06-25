import React from 'react';
import {
  LayoutDashboard, Leaf, Wallet, BarChart3, Award,
  ShieldCheck, Settings, Lock, FileText, LogOut,
  Flag, User, Users, ChartNoAxesCombined,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from './ConfirmDialog.jsx';

const ROLE_COLORS = {
  Student:   'var(--color-success)',
  Moderator: 'var(--color-warning)',
  Admin:     'var(--color-danger)',
};

const NAV_BY_ROLE = {
  Student: [
    { id: 'dashboard',    label: 'Dashboard',      Icon: LayoutDashboard },
    { id: 'missions',     label: 'Missions',       Icon: Leaf },
    { id: 'wallet',       label: 'Wallet & Badges', Icon: Wallet },
    { id: 'leaderboard',  label: 'Leaderboard',    Icon: BarChart3 },
    { id: 'certificates', label: 'Certificates',   Icon: Award },
    { id: 'reports',      label: 'Reports',        Icon: Flag },
    { id: 'profile',      label: 'Profile',        Icon: User },
  ],
  Moderator: [
    { id: 'dashboard',    label: 'Dashboard',      Icon: LayoutDashboard },
    { id: 'review',       label: 'Review Queue',   Icon: ShieldCheck },
    { id: 'catalog',      label: 'My Mission Catalog', Icon: Leaf },
    { id: 'reports',      label: 'Reports',        Icon: Flag },
    { id: 'leaderboard',  label: 'Leaderboard',    Icon: BarChart3 },
    { id: 'profile',      label: 'Profile',        Icon: User },
  ],
  Admin: [
    { id: 'dashboard',    label: 'Dashboard',      Icon: LayoutDashboard },
    { id: 'analytics',    label: 'Analytics',        Icon: ChartNoAxesCombined },
    { id: 'reports',      label: 'Reports',          Icon: Flag },
    { id: 'catalog',      label: 'Catalog',         Icon: Settings },
    { id: 'users',        label: 'Users',           Icon: Users },
    { id: 'policy',       label: 'Policy Rules',    Icon: Lock },
    { id: 'adjust',       label: 'Adjust Points',   Icon: FileText },
    { id: 'profile',      label: 'Profile',         Icon: User },
  ],
};

export default function Sidebar({ role, setRole, activeView, setActiveView, onClose, className }) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.Student;
  const allowedRoles = user?.role === 'ADMIN'
    ? ['Moderator', 'Admin']
    : user?.role === 'MODERATOR'
      ? ['Student', 'Moderator']
      : ['Student'];

  const handleLogout = async () => {
    const accepted = await confirm({
      title: 'Sign out of EcoQuest?',
      message: 'Your current session on this device will end.',
      confirmLabel: 'Sign out',
      tone: 'danger',
    });
    if (accepted) {
      logout();
      onClose?.();
    }
  };

  return (
    <aside className={`sidebar${className ? ` ${className}` : ''}`} aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo" style={{ cursor: 'default' }}>
        <div className="sidebar-logo-icon" aria-hidden="true">
          <img
            src="/logo.png"
            alt="EcoQuest Logo"
            style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 6 }}
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.insertAdjacentHTML('afterend', '<span>🌿</span>'); }}
          />
        </div>
        <div>
          <span className="sidebar-logo-text">EcoQuest</span>
          <span className="sidebar-logo-sub">Campus</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="App navigation">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`sidebar-nav-item${activeView === id ? ' active' : ''}`}
            onClick={() => { setActiveView(id); onClose?.(); }}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon className="sidebar-nav-icon" size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {/* Role Switcher */}
      <div className="sidebar-footer">
        {/* User info */}
        {user && (
          <div style={{
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName || user.email}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
            {user.studentId && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: 'monospace' }}>
                {user.studentId}
              </div>
            )}
          </div>
        )}

        <div className="role-switcher-label">Role</div>
        <div className="role-switcher">
          {allowedRoles.map(r => (
            <button
              key={r}
              className={`role-btn${role === r ? ' active' : ''}`}
              style={{ '--role-color': ROLE_COLORS[r] }}
              onClick={() => {
                setRole(r);
                const firstNav = NAV_BY_ROLE[r][0].id;
                setActiveView(firstNav);
                onClose?.();
              }}
              aria-pressed={role === r}
            >
              <span className="role-dot" aria-hidden="true" />
              {r}
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          style={{
            width: '100%',
            marginTop: 'var(--space-3)',
            color: 'rgba(255,255,255,0.5)',
            justifyContent: 'flex-start',
            gap: 'var(--space-2)',
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
