import React from 'react';
import { LayoutDashboard, Leaf, Wallet, BarChart3, User } from 'lucide-react';

const ITEMS = [
  { id: 'dashboard',   label: 'Home',        Icon: LayoutDashboard },
  { id: 'missions',    label: 'Missions',    Icon: Leaf },
  { id: 'wallet',      label: 'Wallet',      Icon: Wallet },
  { id: 'leaderboard', label: 'Leaderboard', Icon: BarChart3 },
  { id: 'profile',     label: 'Profile',     Icon: User },
];

export default function BottomNav({ activeView, setActiveView, role, setRole }) {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <div className="bottom-nav-items">
        {ITEMS.map(({ id, label, Icon }) => (
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
