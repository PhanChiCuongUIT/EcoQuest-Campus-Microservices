import React from 'react';

export default function StatCard({ icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <span
          className="stat-card-icon"
          style={{ background: iconBg || 'var(--color-primary-light)', color: iconColor || 'var(--color-primary)' }}
        >
          {icon}
        </span>
      </div>
      <div className="stat-card-value">{value ?? '—'}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
