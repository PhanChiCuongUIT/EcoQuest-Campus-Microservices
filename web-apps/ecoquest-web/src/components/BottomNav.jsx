import React from 'react';
import { LayoutDashboard, Leaf, Wallet, BarChart3, User, Flag, ShieldCheck } from 'lucide-react';

const STUDENT_ITEMS = [
  { id: 'dashboard',   label: 'Home',        Icon: LayoutDashboard },
  { id: 'missions',    label: 'Missions',    Icon: Leaf },
  { id: 'wallet',      label: 'Wallet',      Icon: Wallet },
  { id: 'leaderboard', label: 'Leaderboard', Icon: BarChart3 },
  { id: 'profile',     label: 'Profile',     Icon: User },
];

const MODERATOR_ITEMS = [
  { id: 'dashboard',   label: 'Home',        Icon: LayoutDashboard },
  { id: 'review',      label: 'Review',      Icon: ShieldCheck },
  { id: 'reports',     label: 'Reports',     Icon: Flag },
  { id: 'leaderboard', label: 'Ranks',       Icon: BarChart3 },
  { id: 'profile',     label: 'Profile',     Icon: User },
];

export default function BottomNav({ activeView, setActiveView, role, setRole }) {
  const items = role === 'Moderator' ? MODERATOR_ITEMS : STUDENT_ITEMS;
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <div className="bottom-nav-items">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`bottom-nav-item${activeView === id ? ' active' : ''}`}
            onClick={() => setActiveView(id)}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
