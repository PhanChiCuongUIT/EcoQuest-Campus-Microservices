import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, Search, AlertTriangle, Trophy, RefreshCw, Crown, Medal, Zap, X } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  getWeeklyLeaderboard, getMonthlyLeaderboard,
  getStudentRank, closeSeason,
} from '../api/ecoquestApi.js';

/* ── Rank medal helpers ──────────────────────────────────────── */
const RANK_META = {
  1: { emoji: '👑', color: '#D97706', bg: 'linear-gradient(135deg,#FDE68A 0%,#FBBF24 100%)', border: '#D97706', label: '1st Place', height: 140, shadow: 'rgba(217,119,6,0.3)', avatarBg: '#FEF3C7' },
  2: { emoji: '🥈', color: '#4B5563', bg: 'linear-gradient(135deg,#E5E7EB 0%,#9CA3AF 100%)', border: '#9CA3AF', label: '2nd Place', height: 110, shadow: 'rgba(107,114,128,0.2)', avatarBg: '#F3F4F6' },
  3: { emoji: '🥉', color: '#92400E', bg: 'linear-gradient(135deg,#FDBA74 0%,#D97706 100%)', border: '#B45309', label: '3rd Place', height: 90, shadow: 'rgba(180,83,9,0.2)', avatarBg: '#FFEDD5' },
};

/* Order: 2nd, 1st, 3rd for visual podium */
const PODIUM_ORDER = [1, 0, 2]; // indices into top3 array

function PodiumStage({ row, rank }) {
  if (!row) return <div style={{ width: 100 }} />;
  const meta = RANK_META[rank];
  const avatarText = row.studentId?.slice(0, 3).toUpperCase() || 'SV';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, maxWidth: 120 }}>
      {/* Avatar circle */}
      <div style={{
        width: rank === 1 ? 76 : 64,
        height: rank === 1 ? 76 : 64,
        borderRadius: '50%',
        background: meta.avatarBg,
        border: `3px solid ${meta.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 8px 24px ${meta.shadow}`,
        position: 'relative',
        transition: 'transform 200ms ease',
        cursor: 'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = ''}
      >
        <span style={{ fontSize: rank === 1 ? 26 : 22, marginTop: -4 }}>{rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'}</span>
        <span style={{ fontSize: rank === 1 ? 12 : 10, fontWeight: 800, color: meta.color, marginTop: -2 }}>{avatarText}</span>
        <div style={{
          position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
          background: meta.color, color: 'white',
          borderRadius: 'var(--radius-full)', padding: '2px 8px',
          fontSize: 9, fontWeight: 800, whiteSpace: 'nowrap',
          border: '1px solid white',
        }}>#{rank} Place</div>
      </div>

      {/* Name and score */}
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <div style={{ fontWeight: 700, fontSize: rank === 1 ? 14 : 12, color: 'var(--color-text)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.studentId}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
          <strong>{row.points?.toLocaleString()}</strong> pts
        </div>
      </div>

      {/* 3D Podium Block */}
      <div style={{
        width: '100%',
        height: meta.height,
        background: meta.bg,
        border: `2px solid ${meta.border}`,
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 -6px 20px ${meta.shadow}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle inner reflection strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.4)' }} />
        <span style={{ fontSize: 24, fontWeight: 900, color: 'rgba(255,255,255,0.7)', userSelect: 'none' }}>
          {rank}
        </span>
      </div>
    </div>
  );
}

export default function Leaderboard({ studentId, role }) {
  const toast = useToast();
  const [tab, setTab]           = useState('weekly');
  const [board, setBoard]       = useState([]);
  const [lookupId, setLookupId] = useState(studentId || 'SV001');
  const [lookupResult, setLookupResult] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [asyncBanner, setAsyncBanner] = useState(false);
  const [myRank, setMyRank]     = useState(null);

  // Admin close season state
  const today = new Date().toISOString().slice(0, 10);
  const [seasonId, setSeasonId] = useState(`WEEK-${today}`);
  const [seasonType, setSeasonType] = useState('weekly');
  const [winners, setWinners]   = useState(10);
  const [closing, setClosing]   = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = tab === 'weekly'
        ? await getWeeklyLeaderboard(20)
        : await getMonthlyLeaderboard(20);
      setBoard(data);
      // Also load current user rank
      if (studentId) {
        const r = await getStudentRank(studentId, tab).catch(() => null);
        setMyRank(r);
      }
    } catch {
      setError('Could not load leaderboard. Make sure Leaderboard service is running.');
    } finally { setLoading(false); }
  }, [tab, studentId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const handleLookup = async () => {
    try {
      const r = await getStudentRank(lookupId, tab);
      setLookupResult(r);
    } catch {
      setLookupResult({ rank: null, score: null });
    }
  };

  const handleCloseSeason = async () => {
    setClosing(true);
    try {
      await closeSeason(seasonId, seasonType, winners);
      toast({ type: 'success', message: 'Season closed successfully! 🎉', sub: 'Certificates are being generated via RabbitMQ.' });
      setAsyncBanner(true);
      setShowCloseForm(false);
      setTimeout(() => { loadBoard(); setAsyncBanner(false); }, 5000);
    } catch (e) {
      toast({ type: 'error', message: 'Failed to close season', sub: e.message });
    } finally { setClosing(false); }
  };

  const top3 = board.slice(0, 3);
  const rest  = board.slice(3);

  const isCurrentUser = (sid) => sid === studentId;

  return (
    <div>
      {asyncBanner && (
        <AsyncBanner
          type="info"
          message="Certificates are being generated in the background — check back in a moment."
          onDismiss={() => setAsyncBanner(false)}
        />
      )}

      {/* ── My Rank Banner ── */}
      {myRank?.rank && (
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #155e3e 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-4) var(--space-6)',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          color: 'white',
          boxShadow: '0 8px 24px rgba(28,124,84,0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative faint pattern */}
          <div style={{ position: 'absolute', right: -20, bottom: -20, fontSize: 100, opacity: 0.1, pointerEvents: 'none' }}>🏆</div>
          
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            📊
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Your {tab} Standing</div>
            <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>#{myRank.rank}</div>
          </div>
          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.2)', margin: '0 var(--space-2)' }} />
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Score</div>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{myRank.score?.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.9 }}>pts</span></div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 10, fontWeight: 700 }}>
              Active Student
            </span>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="tabs">
        {['weekly', 'monthly'].map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
            aria-selected={tab === t}
          >
            {t === 'weekly' ? '📅 Weekly Rankings' : '📆 Monthly Rankings'}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          onClick={loadBoard}
          style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}
          aria-label="Refresh Leaderboard"
        >
          <RefreshCw size={13} /> <span style={{ fontSize: 12 }}>Refresh</span>
        </button>
      </div>

      {error && <AsyncBanner type="warning" message={error} />}

      {loading ? (
        <div>
          <div className="skeleton skeleton-card" style={{ height: 260, marginBottom: 'var(--space-4)' }} />
          <div className="skeleton skeleton-card" style={{ height: 300 }} />
        </div>
      ) : (
        <>
          {/* ── Trophy Podium ── */}
          {top3.length > 0 && (
            <div className="card mb-6" style={{ overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{
                background: 'linear-gradient(180deg, rgba(28,124,84,0.06) 0%, transparent 100%)',
                padding: 'var(--space-8) var(--space-4) 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '5%', maxWidth: 500, margin: '0 auto' }}>
                  {/* 2nd - 1st - 3rd order */}
                  {PODIUM_ORDER.map((idx, pos) => {
                    const row = top3[idx];
                    const rank = idx + 1;
                    return <PodiumStage key={pos} row={row} rank={rank} />;
                  })}
                </div>
                {/* Visual solid ground line */}
                <div style={{
                  height: 8,
                  background: 'linear-gradient(90deg, #1C7C54 0%, #D97706 50%, #1C7C54 100%)',
                  borderRadius: '4px 4px 0 0',
                  maxWidth: 580,
                  margin: '0 auto',
                }} />
              </div>
            </div>
          )}

          {/* ── Rankings 4+ ── */}
          {board.length > 0 && (
            <div className="card mb-6" style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={16} color="var(--color-primary)" />
                  <h2 className="card-title">Board Standings</h2>
                </div>
                <span className="badge badge-neutral" style={{ background: 'var(--color-background-alt)', color: 'var(--color-text)' }}>{board.length} active students</span>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60, textAlign: 'center' }}>Rank</th>
                      <th>Student Account</th>
                      <th style={{ textAlign: 'right', width: 120 }}>Points Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.map((row, idx) => {
                      const isTop3 = idx < 3;
                      const cur = isCurrentUser(row.studentId);
                      return (
                        <tr
                          key={row.studentId}
                          style={{
                            background: cur ? 'var(--color-primary-dim)' : undefined,
                            fontWeight: cur ? 700 : undefined,
                            borderLeft: cur ? '4px solid var(--color-primary)' : '4px solid transparent',
                            transition: 'background-color 150ms ease',
                          }}
                          className={cur ? 'leaderboard-rank-row-highlight' : ''}
                        >
                          <td style={{ textAlign: 'center' }}>
                            {isTop3 ? (
                              <span style={{ fontSize: 18 }} title={`Rank ${idx + 1}`}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 24, height: 24,
                                borderRadius: '50%',
                                background: cur ? 'var(--color-primary-light)' : 'var(--color-background-alt)',
                                fontWeight: 700, fontSize: 11,
                                color: cur ? 'var(--color-primary)' : 'var(--color-text-muted)',
                              }}>
                                {row.rank}
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <span style={{ color: 'var(--color-text)', fontWeight: cur ? 700 : 500 }}>
                                {row.studentId}
                              </span>
                              {cur && (
                                <span style={{
                                  fontSize: 8, background: 'var(--color-primary)', color: 'white',
                                  borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontWeight: 800,
                                  letterSpacing: 0.5,
                                }}>YOU</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: cur ? 'var(--color-primary)' : 'var(--color-text)' }}>
                            {row.points?.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-text-muted)' }}>pts</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {board.length === 0 && (
            <EmptyState
              icon={BarChart3}
              title="Empty leaderboard"
              description="No green actions have been recorded for this period yet. Complete a sustainability mission to claim the top spot!"
            />
          )}
        </>
      )}

      {/* ── Rank Lookup ── */}
      <div className="card mb-6">
        <div className="card-header">
          <div className="card-header-left">
            <Search size={16} color="var(--color-primary)" />
            <h2 className="card-title">Student Rank Lookup</h2>
          </div>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Search standings directly by entering a student identifier.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <input
              className="form-input"
              value={lookupId}
              onChange={e => setLookupId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="Enter student ID (e.g. SV001)"
              aria-label="Student ID to look up"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleLookup} style={{ gap: 6 }}>
              <Search size={14} /> Search Standing
            </button>
          </div>
          {lookupResult && (
            <div style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              background: lookupResult.rank ? 'var(--color-primary-dim)' : 'var(--color-background-alt)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${lookupResult.rank ? 'var(--color-primary)50' : 'var(--color-border)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              animation: 'fadeIn 200ms ease',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: lookupResult.rank ? 'var(--color-primary-light)' : '#E5E7EB',
                display: 'flex', alignItems: 'center', justifyCentert: 'center',
                fontSize: 22,
                justifyContent: 'center',
              }}>
                {lookupResult.rank ? (lookupResult.rank <= 3 ? ['🥇', '🥈', '🥉'][lookupResult.rank - 1] : '🏅') : '❌'}
              </div>
              <div>
                {lookupResult.rank ? (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Standing Found</div>
                    <div style={{ fontSize: 15, color: 'var(--color-text)' }}>
                      Student <strong>{lookupId}</strong> ranks <strong>#{lookupResult.rank}</strong> with <strong>{lookupResult.score?.toLocaleString()} pts</strong> in this period.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>No Rank Found</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      Student ID <strong>{lookupId}</strong> has no registered points in the {tab} period.
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Admin: Close Season ── */}
      {role === 'Admin' && (
        <div className="card" style={{ border: '1px dashed var(--color-warning)' }}>
          <div className="card-header">
            <div className="card-header-left">
              <AlertTriangle size={18} color="var(--color-warning)" />
              <h2 className="card-title">Season Administration</h2>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <span className="local-only-badge">Local Admin Action</span>
              <button
                className={`btn btn-sm ${showCloseForm ? 'btn-ghost' : 'btn-warning'}`}
                onClick={() => setShowCloseForm(v => !v)}
                style={{
                  background: showCloseForm ? undefined : 'rgba(217,119,6,0.1)',
                  color: showCloseForm ? undefined : '#D97706',
                  borderColor: showCloseForm ? undefined : 'rgba(217,119,6,0.3)',
                }}
              >
                {showCloseForm ? <><X size={13} /> Cancel</> : 'Configure Closure'}
              </button>
            </div>
          </div>
          {showCloseForm && (
            <div className="card-body" style={{ borderTop: '1px solid var(--color-border-light)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Season ID</label>
                  <input className="form-input" value={seasonId} onChange={e => setSeasonId(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Period Type</label>
                  <select className="form-select" value={seasonType} onChange={e => setSeasonType(e.target.value)}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Top N Winners</label>
                  <input className="form-input" type="number" value={winners} onChange={e => setWinners(+e.target.value)} min={1} />
                </div>
              </div>
              <div style={{ background: 'var(--color-warning-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', fontSize: 12, color: 'var(--color-warning-text)', border: '1px solid var(--color-warning)30' }}>
                ⚠️ <strong>Note:</strong> Closing a season publishes message queue events to trigger recognition certificate creations. This operation is idempotent when repeated with identical Season IDs.
              </div>
              <button
                className="btn btn-danger"
                onClick={handleCloseSeason}
                disabled={closing}
                style={{ width: '100%', gap: 6 }}
              >
                <Trophy size={14} />
                {closing ? 'Closing Season…' : `Close "${seasonId}" — Top ${winners} Winners`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
