import React, { useEffect, useState, useCallback } from 'react';
import { Wallet, Lock, Shield, Zap, TrendingUp, Calendar, Trophy, ChevronRight, Award, Share2 } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import Modal from '../components/Modal.jsx';
import { getWallet, getTransactions, getUnlockedBadges, getBadgeDefs } from '../api/ecoquestApi.js';

function timeAgo(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch { return '—'; }
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

/* ── Badge emoji & theme color map ──────────────────────────── */
const BADGE_META = {
  GREEN_STARTER:        { emoji: '🌱', color: '#16A34A', ring: '#86EFAC', bg: '#F0FDF4', rarity: 'Common', lore: 'Starting the green path. The seed of sustainability has been planted in your campus life.' },
  RECYCLING_HERO:       { emoji: '♻️', color: '#0284C7', ring: '#7DD3FC', bg: '#F0F9FF', rarity: 'Common', lore: 'Master of sorting. You have successfully diverted significant plastics and cans from local landfills.' },
  CLEANUP_CHAMPION:     { emoji: '🧹', color: '#7C3AED', ring: '#C4B5FD', bg: '#F5F3FF', rarity: 'Rare', lore: 'Active environment keeper. You have taken part in keeping our campus communal areas pristine.' },
  ZERO_WASTE_ADVOCATE:  { emoji: '🌿', color: '#0D4736', ring: '#6EE7B7', bg: '#ECFDF5', rarity: 'Rare', lore: 'Promoter of circular utility. Advocating reusable items and eliminating single-use plastics.' },
  GREEN_AMBASSADOR:     { emoji: '🌍', color: '#D97706', ring: '#FDE68A', bg: '#FEFCE8', rarity: 'Epic', lore: 'An inspiring leader. Educating peers and driving green community awareness.' },
  CAMPUS_GUARDIAN:      { emoji: '🏆', color: '#DC2626', ring: '#FCA5A5', bg: '#FEF2F2', rarity: 'Legendary', lore: 'The ultimate environmental protector of our campus ecosystem. A true sustainability role model.' },
};

export default function WalletBadges({ studentId }) {
  const [wallet, setWallet]           = useState(null);
  const [txs, setTxs]                 = useState([]);
  const [unlockedBadges, setUnlocked] = useState([]);
  const [badgeDefs, setBadgeDefs]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  
  // Selected badge for details modal
  const [selectedBadge, setSelectedBadge] = useState(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true); setError(null);
    try {
      const [w, t, u, b] = await Promise.all([
        getWallet(studentId),
        getTransactions(studentId),
        getUnlockedBadges(studentId),
        getBadgeDefs(),
      ]);
      setWallet(w);
      setTxs([...t].sort((a, b) => new Date(b.occurredOn) - new Date(a.occurredOn)));
      setUnlocked(u);
      setBadgeDefs(b);
    } catch {
      setError('Could not load wallet and badge data. Check service connections.');
    } finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div>
      <div className="skeleton skeleton-card" style={{ height: 160 }} />
      <div className="skeleton skeleton-card" style={{ height: 260 }} />
      <div className="skeleton skeleton-card" style={{ height: 320 }} />
    </div>
  );

  if (error) return <AsyncBanner type="warning" message={error} />;

  const totalPoints = wallet?.totalPoints ?? 0;
  const unlockedCodes = new Set(unlockedBadges.map(b => b.badgeCode));

  // Determine next badge to unlock
  const sortedDefs = [...badgeDefs].sort((a, b) => a.requiredPoints - b.requiredPoints);
  const nextBadge = sortedDefs.find(d => !unlockedCodes.has(d.code));
  const prevBadge = [...sortedDefs].reverse().find(d => unlockedCodes.has(d.code));
  const progressPct = nextBadge
    ? Math.min(100, Math.round(((totalPoints - (prevBadge?.requiredPoints ?? 0)) /
        (nextBadge.requiredPoints - (prevBadge?.requiredPoints ?? 0))) * 100))
    : 100;

  const handleOpenBadgeDetails = (def, isUnlocked, unlockedRecord) => {
    const meta = BADGE_META[def.code] || { emoji: '🏅', color: '#1C7C54', ring: '#E5E7EB', bg: '#F9FAFB', rarity: 'Special', lore: 'Exclusive campus sustainability milestone achievement badge.' };
    setSelectedBadge({
      ...def,
      isUnlocked,
      unlockedOn: unlockedRecord?.unlockedOn,
      meta,
    });
  };

  const badgeModalFooter = (
    <button className="btn btn-primary" onClick={() => setSelectedBadge(null)}>
      Awesome
    </button>
  );

  return (
    <div>
      {/* ── Badge Detail Modal ── */}
      <Modal
        isOpen={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        title="Eco Milestone Badge"
        titleIcon={<Award size={18} color="var(--color-primary)" />}
        footer={badgeModalFooter}
        size="sm"
      >
        {selectedBadge && (
          <div style={{ textAlign: 'center', padding: 'var(--space-3) 0' }}>
            {/* Medal illustration */}
            <div style={{
              width: 90, height: 90,
              borderRadius: '50%',
              background: selectedBadge.isUnlocked ? selectedBadge.meta.bg : '#F3F4F6',
              border: `4px solid ${selectedBadge.isUnlocked ? selectedBadge.meta.color : '#9CA3AF'}`,
              boxShadow: selectedBadge.isUnlocked ? `0 10px 25px ${selectedBadge.meta.color}30` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 44,
              margin: '0 auto var(--space-4)',
              position: 'relative',
              filter: selectedBadge.isUnlocked ? 'none' : 'grayscale(100%)',
            }}>
              {selectedBadge.isUnlocked ? selectedBadge.meta.emoji : '🔒'}
            </div>

            {/* Title & Rarity */}
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: 'var(--color-text)' }}>
              {selectedBadge.name}
            </h3>
            <span style={{
              background: selectedBadge.isUnlocked ? `${selectedBadge.meta.color}15` : '#E5E7EB',
              color: selectedBadge.isUnlocked ? selectedBadge.meta.color : '#6B7280',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {selectedBadge.isUnlocked ? selectedBadge.meta.rarity : 'Locked Milestone'}
            </span>

            {/* Description */}
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 'var(--space-4) 0 var(--space-3)', lineHeight: 1.5 }}>
              {selectedBadge.description}
            </p>

            {/* Lore box */}
            <div style={{
              background: 'var(--color-background-alt)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 12,
              fontStyle: 'italic',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-4)',
              lineHeight: 1.4,
              borderLeft: `3px solid ${selectedBadge.isUnlocked ? selectedBadge.meta.color : '#9CA3AF'}`,
            }}>
              "{selectedBadge.meta.lore}"
            </div>

            {/* Status info */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderTop: '1px solid var(--color-border-light)',
              paddingTop: 'var(--space-4)',
              fontSize: 12,
              alignItems: 'center',
            }}>
              <div>
                Requirements: <strong>{selectedBadge.requiredPoints} cumulative points</strong>
              </div>
              {selectedBadge.isUnlocked ? (
                <div style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={13} /> Unlocked on {formatDate(selectedBadge.unlockedOn)}
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)' }}>
                  Points progress: <strong>{totalPoints} / {selectedBadge.requiredPoints} pts</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Wallet Summary Card ── */}
      <div className="card mb-6" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
          <div className="card-header-left">
            <Wallet size={18} color="var(--color-primary)" />
            <h2 className="card-title">Green Points Balance</h2>
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', background: 'var(--color-background-alt)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
            Student: {studentId}
          </span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
            {/* Big points number */}
            <div style={{
              textAlign: 'center',
              flex: '0 0 auto',
              background: 'var(--color-primary-dim)',
              padding: 'var(--space-4) var(--space-6)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-primary)20',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <Zap size={24} color="var(--color-primary)" fill="var(--color-primary)" />
                <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>
                  {totalPoints.toLocaleString()}
                </div>
              </div>
              <div style={{ color: 'var(--color-text-muted)', marginTop: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Available Points
              </div>
            </div>

            {/* Next badge progress */}
            {nextBadge && (
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Roadmap to Next Milestone
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: (BADGE_META[nextBadge.code]?.bg || 'var(--color-background-alt)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    border: `1px solid ${BADGE_META[nextBadge.code]?.color || '#9CA3AF'}`,
                  }}>
                    {BADGE_META[nextBadge.code]?.emoji || '🏅'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{nextBadge.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 8 }}>({nextBadge.requiredPoints} pts required)</span>
                  </div>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  <span>Current: {totalPoints} pts</span>
                  <span>{nextBadge.requiredPoints - totalPoints} points remaining ({progressPct}%)</span>
                </div>
              </div>
            )}
            {!nextBadge && badgeDefs.length > 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-primary-dim)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary)20' }}>
                <Trophy size={36} color="var(--color-gold)" style={{ filter: 'drop-shadow(0px 3px 6px rgba(217,119,6,0.2))' }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>Grand Champion unlocked! 🎉</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>You have unlocked all sustainability badges available in the system catalog.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div className="card mb-6" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={16} color="var(--color-primary)" />
            <h2 className="card-title">Transaction Audit Ledger</h2>
          </div>
          <span className="badge badge-neutral" style={{ background: 'var(--color-background-alt)', color: 'var(--color-text)' }}>{txs.length} entries</span>
        </div>
        <div className="data-table-wrapper">
          {txs.length === 0 ? (
            <div style={{ padding: 'var(--space-6) 0' }}>
              <EmptyState title="No wallet ledger history" description="Submit action logs or earn points to record ledger transactions." />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Amount</th>
                  <th>Source Action Ledger ID</th>
                  <th style={{ textAlign: 'right', width: 140 }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(t => (
                  <tr key={t.id} style={{ transition: 'background-color 150ms ease' }}>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        color: 'var(--color-success)',
                        fontSize: 14,
                        background: 'var(--color-success-bg)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}>
                        +{t.points}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--color-text-muted)' }} title={t.sourceActionId}>
                          {t.sourceActionId}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {timeAgo(t.occurredOn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Badges ── */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
          <div className="card-header-left">
            <Shield size={18} color="var(--color-info)" />
            <h2 className="card-title">Milestone Achievements Showcase</h2>
          </div>
          <span className="badge badge-info" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>{unlockedBadges.length} / {badgeDefs.length} Unlocked</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
            Milestones earned through carbon offset points. Click any badge medal to reveal achievement lore and status tracking.
          </p>

          {badgeDefs.length === 0 ? (
            <EmptyState title="No catalog badge definitions" description="milestone categories are currently empty." />
          ) : (
            <div className="badges-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: 'var(--space-4)',
            }}>
              {sortedDefs.map(def => {
                const isUnlocked = unlockedCodes.has(def.code);
                const unlockedRecord = unlockedBadges.find(u => u.badgeCode === def.code);
                const meta = BADGE_META[def.code] || { emoji: '🏅', color: '#1C7C54', ring: '#E5E7EB', bg: '#F9FAFB' };

                return (
                  <div
                    key={def.code}
                    onClick={() => handleOpenBadgeDetails(def, isUnlocked, unlockedRecord)}
                    style={{
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-xl)',
                      border: isUnlocked ? `2px solid ${meta.color}` : '1px solid var(--color-border)',
                      padding: 'var(--space-5) var(--space-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      boxShadow: isUnlocked ? `0 4px 14px ${meta.color}15` : 'none',
                      position: 'relative',
                    }}
                    className={`badge-card-refined ${isUnlocked ? 'unlocked' : 'locked'}`}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = isUnlocked ? `0 8px 24px ${meta.color}25` : 'var(--shadow-md)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.boxShadow = isUnlocked ? `0 4px 14px ${meta.color}15` : 'none';
                    }}
                  >
                    {/* Medal shape */}
                    <div style={{
                      width: 56, height: 56,
                      borderRadius: '50%',
                      background: isUnlocked ? meta.bg : '#F3F4F6',
                      border: `3px solid ${isUnlocked ? meta.color : '#9CA3AF'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26,
                      marginBottom: 'var(--space-3)',
                      filter: isUnlocked ? 'none' : 'grayscale(100%)',
                      position: 'relative',
                    }}>
                      {isUnlocked ? meta.emoji : <Lock size={16} color="#9CA3AF" />}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', textAlign: 'center', lineHeight: 1.2, marginBottom: 4 }}>
                      {def.name}
                    </div>

                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: isUnlocked ? 'var(--color-success)' : 'var(--color-text-muted)',
                      textAlign: 'center',
                      marginTop: 'auto',
                    }}>
                      {isUnlocked ? (
                        <span style={{ color: meta.color }}>✓ Unlocked</span>
                      ) : (
                        <span>{def.requiredPoints} pts</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
