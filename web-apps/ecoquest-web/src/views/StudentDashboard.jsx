import React, { useEffect, useState, useCallback } from 'react';
import { Zap, Trophy, Shield, Award, RefreshCw, Target } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import MissionCard from '../components/MissionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import {
  getWallet, getStudentRank, getUnlockedBadges,
  getCertificates, getMissions, getUserActions,
} from '../api/ecoquestApi.js';
import { visibleMissions } from '../utils/accessRules.js';

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return '—'; }
}

function MiniBarChart({ title, rows, empty = 'No activity yet.' }) {
  const max = Math.max(1, ...rows.map(row => Number(row.value) || 0));

  return (
    <div className="mini-chart-card">
      <div className="mini-chart-header">
        <strong>{title}</strong>
      </div>
      <div className="mini-chart-body">
        {rows.length === 0 ? (
          <p className="muted-copy">{empty}</p>
        ) : rows.map(row => (
          <div className="mini-chart-row" key={row.label}>
            <span>{row.label}</span>
            <div className="mini-chart-track">
              <i style={{ width: `${Math.max(8, (Number(row.value) || 0) / max * 100)}%` }} />
            </div>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentDashboard({ studentId, onSubmitMission, featuredOnly = true }) {
  const [wallet, setWallet]     = useState(null);
  const [rank, setRank]         = useState(null);
  const [badges, setBadges]     = useState([]);
  const [certs, setCerts]       = useState([]);
  const [missions, setMissions] = useState([]);
  const [actions, setActions]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [asyncBanner, setAsyncBanner] = useState(false);

  const load = useCallback(async (id) => {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const [w, r, b, c, m, a] = await Promise.all([
        getWallet(id),
        getStudentRank(id, 'weekly').catch(() => null),
        getUnlockedBadges(id),
        getCertificates(id),
        getMissions(),
        getUserActions(id),
      ]);
      setWallet(w); setRank(r); setBadges(b);
      setCerts(c); setMissions(visibleMissions(m));
      setActions([...a].sort((x, y) => new Date(y.submittedAt) - new Date(x.submittedAt)));
    } catch {
      setError('Could not load dashboard. Make sure the backend stack is running.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(studentId); }, [studentId, load]);

  // Expose a refresh for after submission (called by SubmitActionModal)
  useEffect(() => {
    window.__eqRefreshDashboard = (delayed = false) => {
      if (delayed) {
        setAsyncBanner(true);
        setTimeout(() => { load(studentId); setAsyncBanner(false); }, 3000);
      } else {
        load(studentId);
      }
    };
    return () => { delete window.__eqRefreshDashboard; };
  }, [studentId, load]);

  // Build mission lookup map for action history titles
  const missionMap = React.useMemo(() => {
    const map = {};
    missions.forEach(m => { map[m.id] = m.title; });
    return map;
  }, [missions]);

  if (loading) return (
    <div>
      <div className="stats-grid mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card"><div className="skeleton skeleton-stat" /></div>
        ))}
      </div>
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
    </div>
  );

  if (error) return <AsyncBanner type="warning" message={error} />;

  const rankDisplay = rank?.rank ? `#${rank.rank}` : '—';

  const joinedMissions = new Set(actions.map(action => action.missionId).filter(Boolean)).size;
  const statusRows = ['ACCEPTED', 'PENDING_REVIEW', 'REJECTED']
    .map(status => ({
      label: status.replace('_', ' '),
      value: actions.filter(action => action.status === status).length,
    }))
    .filter(row => actions.length > 0 || row.value > 0);
  const missionRows = Object.entries(actions.reduce((acc, action) => {
    const label = missionMap[action.missionId] || action.missionId || 'Unknown mission';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  return (
    <div>
      {asyncBanner && (
        <AsyncBanner
          type="info"
          message="Reward, badges, and leaderboard update may take a few seconds."
          onDismiss={() => setAsyncBanner(false)}
        />
      )}

      {/* ── Stats ── */}
      <div className="stats-grid">
        <StatCard
          icon={<Zap size={18} />}
          label="Total Points"
          value={wallet?.totalPoints ?? 0}
          iconBg="var(--color-primary-light)" iconColor="var(--color-primary)"
        />
        <StatCard
          icon={<Trophy size={18} />}
          label="Weekly Rank"
          value={rankDisplay}
          sub={rank?.score ? `${rank.score} pts` : undefined}
          iconBg="#FEF3C7" iconColor="var(--color-gold)"
        />
        <StatCard
          icon={<Shield size={18} />}
          label="Badges"
          value={badges.length}
          sub="unlocked"
          iconBg="var(--color-info-bg)" iconColor="var(--color-info)"
        />
        <StatCard
          icon={<Award size={18} />}
          label="Certificates"
          value={certs.length}
          iconBg="var(--color-success-bg)" iconColor="var(--color-success)"
        />
        <StatCard
          icon={<Target size={18} />}
          label="Missions Joined"
          value={joinedMissions}
          sub={`${actions.length} submissions`}
          iconBg="var(--color-warning-bg)" iconColor="var(--color-warning)"
        />
      </div>

      <div className="dashboard-chart-grid">
        <MiniBarChart title="Submission status" rows={statusRows} />
        <MiniBarChart title="Submissions by mission" rows={missionRows} />
      </div>

      {/* ── Missions ── */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-header-left">
            <h2 className="card-title">Available Missions</h2>
          </div>
          <span className="badge badge-neutral">{Math.min(missions.length, 3)} featured</span>
        </div>
        <div className="card-body" style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {missions.length === 0
            ? <EmptyState title="No missions available" description="The catalog is empty." />
            : (featuredOnly ? missions.slice(0, 3) : missions).map(m => (
                <MissionCard key={m.id} mission={m} onSubmit={onSubmitMission} />
              ))
          }
        </div>
      </div>

      {/* ── Recent Actions ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Recent Actions</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className="badge badge-neutral">{actions.length} total</span>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => load(studentId)}
              aria-label="Refresh actions"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {actions.length === 0 ? (
          <EmptyState
            title="No actions yet"
            description="Start your first mission to earn points!"
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-table">
              <table className="actions-table" aria-label="Recent actions">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Mission</th>
                    <th>Status</th>
                    <th>Points</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
                        {formatTime(a.submittedAt)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {missionMap[a.missionId] || a.missionId}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                          {a.actionType}
                        </div>
                      </td>
                      <td><StatusBadge status={a.status} /></td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: a.status === 'ACCEPTED' ? 'var(--color-success)'
                            : a.status === 'PENDING_REVIEW' ? 'var(--color-warning)'
                            : 'var(--color-text-muted)'
                        }}>
                          {a.status === 'ACCEPTED' ? `+${a.points}`
                            : a.status === 'PENDING_REVIEW' ? `${a.points} pending`
                            : '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', maxWidth: 180 }}>
                        {a.policyReason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-cards">
              {actions.map(a => (
                <div key={a.id} className="action-card-mobile">
                  <div className="action-card-mobile-info">
                    <div className="action-card-mobile-title">
                      {missionMap[a.missionId] || a.missionId}
                    </div>
                    <div className="action-card-mobile-sub">{formatDate(a.submittedAt)}</div>
                    {a.policyReason && a.policyReason !== 'Accepted' && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {a.policyReason}
                      </div>
                    )}
                  </div>
                  <div className="action-card-mobile-right">
                    <StatusBadge status={a.status} />
                    <div className="action-points" style={{ marginTop: 4, color: a.status === 'ACCEPTED' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                      {a.status === 'ACCEPTED' ? `+${a.points}`
                        : a.status === 'PENDING_REVIEW' ? `${a.points} pend.`
                        : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
