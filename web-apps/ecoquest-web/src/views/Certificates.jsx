import React, { useEffect, useState, useCallback } from 'react';
import { Award, Download, Gift, Eye, Star, Trophy, X, Printer } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getCertificates, downloadCertificate, claimReward, getRewardClaims } from '../api/ecoquestApi.js';
import { printCertificate } from '../utils/printCertificate.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';

const DEMO_REWARDS = [
  { id: 'reward-cafe',  name: 'Campus Cafe Voucher', icon: '☕', desc: '10% off your next cafe purchase', color: '#16A34A' },
  { id: 'reward-book',  name: 'Library Book Credit', icon: '📚', desc: 'Free 1-week book extension',      color: '#0284C7' },
  { id: 'reward-park',  name: 'Eco Park Pass',        icon: '🌿', desc: 'Free entry to campus eco park',  color: '#0D4736' },
  { id: 'reward-merch', name: 'EcoQuest Merch',       icon: '🎽', desc: 'Exclusive campus sustainability tee', color: '#D97706' },
];

const RANK_META = {
  1: { emoji: '🥇', color: '#D97706', shadow: 'rgba(217,119,6,0.3)', bgFrom: '#FFFBEB', bgTo: '#FEF3C7', label: '1st Place' },
  2: { emoji: '🥈', color: '#6B7280', shadow: 'rgba(107,114,128,0.3)', bgFrom: '#F9FAFB', bgTo: '#F3F4F6', label: '2nd Place' },
  3: { emoji: '🥉', color: '#B45309', shadow: 'rgba(180,83,9,0.3)', bgFrom: '#FFF7ED', bgTo: '#FFEDD5', label: '3rd Place' },
};

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return '—'; }
}

/* ── Certificate preview modal ───────────────────────────────── */
function CertPreviewModal({ cert, user, onClose, onPrint }) {
  if (!cert) return null;
  const rank = cert.rankNumber || 1;
  const meta = RANK_META[rank] || RANK_META[3];
  const recipientName = user?.displayName || cert.studentId;
  const rankSuffix = { 1: 'st', 2: 'nd', 3: 'rd' }[rank] || 'th';
  const dateStr = formatDate(cert.issuedOn);
  const seasonLabel = cert.seasonId.replace(/-/g, ' ');
  const typeLabel = cert.certificateType === 'WEEKLY' ? 'Weekly' : cert.certificateType === 'MONTHLY' ? 'Monthly' : cert.certificateType;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(13,33,26,0.85)', backdropFilter: 'blur(6px)',
      zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
      animation: 'fadeIn 200ms ease',
    }} onClick={onClose}>
      <div style={{ maxWidth: 840, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}
        onClick={e => e.stopPropagation()}>

        {/* Actions bar */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={onPrint} style={{ boxShadow: '0 4px 12px rgba(28,124,84,0.3)' }}>
            <Printer size={14} /> Print / Save PDF
          </button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'white', background: 'rgba(255,255,255,0.1)' }} onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>

        {/* Certificate preview */}
        <div className="cert-preview-frame" style={{
          background: '#FAF7F0',
          borderRadius: 12,
          border: '1px solid rgba(197,155,39,0.3)',
          overflow: 'hidden',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          position: 'relative',
          width: '100%',
          aspectRatio: '297 / 210', // Keep aspect ratio consistent
          padding: '5%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#1a2e22',
        }}>
          {/* Borders */}
          <div style={{ position: 'absolute', inset: '12px', border: '1px solid #C59B27', pointerEvents: 'none', zIndex: 2 }} />
          <div style={{ position: 'absolute', inset: '16px', border: '3px double #1C7C54', pointerEvents: 'none', zIndex: 2 }} />
          
          {/* Corner ornaments */}
          {['tl','tr','bl','br'].map(c => (
            <div key={c} style={{
              position: 'absolute', width: 24, height: 24, zIndex: 3,
              top: c.includes('t') ? 14 : undefined,
              bottom: c.includes('b') ? 14 : undefined,
              left: c.includes('l') ? 14 : undefined,
              right: c.includes('r') ? 14 : undefined,
              borderTop: c.includes('t') ? '2.5px solid #C59B27' : undefined,
              borderBottom: c.includes('b') ? '2.5px solid #C59B27' : undefined,
              borderLeft: c.includes('l') ? '2.5px solid #C59B27' : undefined,
              borderRight: c.includes('r') ? '2.5px solid #C59B27' : undefined,
            }} />
          ))}

          {/* Watermark background */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '18vw', opacity: 0.035, userSelect: 'none', pointerEvents: 'none', fontFamily: 'Cinzel, serif', color: '#1c7c54' }}>🌿</div>

          {/* Content Wrapper */}
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center', zIndex: 5 }}>
            {/* Header */}
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: '#1C7C54', letterSpacing: 4, textTransform: 'uppercase' }}>EcoQuest Campus Initiative</div>
              <div style={{ fontSize: 8, color: '#7A8F82', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>Sustainability & Stewardship Board</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px auto', width: 200 }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #C59B27, transparent)' }} />
                <div style={{ fontSize: 8, color: '#C59B27' }}>★</div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #C59B27, transparent)' }} />
              </div>
            </div>

            {/* Core titles */}
            <div style={{ margin: '4px 0' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#7A8F82', fontWeight: 600 }}>Certificate of Excellence</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 24, fontWeight: 800, color: '#1A2E22', letterSpacing: 1, marginTop: 1 }}>Sustainability Award</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 11, fontStyle: 'italic', color: '#5A6E62', marginTop: 4 }}>This certificate is proudly presented to</div>
              <div style={{ fontFamily: 'Alex Brush, cursive', fontSize: 42, color: '#1C7C54', margin: '4px 0', lineHeight: 1 }}>{recipientName}</div>
              <div style={{ fontSize: 9, color: '#7A8F82', fontFamily: 'monospace' }}>Student ID: {cert.studentId}</div>
            </div>

            {/* Description */}
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 12, color: '#4A5E51', maxWidth: 620, margin: '4px auto 0', lineHeight: 1.5 }}>
              For outstanding commitment and environmental contributions during the <strong>{typeLabel} {seasonLabel}</strong> season, finishing in <strong>{rank}{rankSuffix} Place</strong> on the leaderboard and accumulating <strong>{Number(cert.points).toLocaleString()} green points</strong> for campus sustainability actions.
            </p>

            {/* Stats block */}
            <div style={{ display: 'flex', border: '1px solid rgba(28,124,84,0.15)', background: 'rgba(28,124,84,0.02)', borderRadius: 4, overflow: 'hidden', width: 400, margin: '6px 0' }}>
              {[
                { l: 'Season', v: seasonLabel },
                { l: 'Type', v: typeLabel },
                { l: 'Rank', v: `#${rank}` },
                { l: 'Points', v: Number(cert.points).toLocaleString() }
              ].map((s, i, a) => (
                <div key={i} style={{ flex: 1, padding: '4px 6px', borderRight: i < a.length - 1 ? '1px solid rgba(28,124,84,0.15)' : 'none' }}>
                  <div style={{ fontSize: 7, color: '#7A8F82', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1C7C54' }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Bottom Signature & Seal Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: 4 }}>
              {/* SVG Gold Seal */}
              <svg width="56" height="66" viewBox="0 0 100 120" style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.12))' }}>
                <defs>
                  <linearGradient id="modalGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FFE57F" />
                    <stop offset="40%" stop-color="#FFC107" />
                    <stop offset="70%" stop-color="#FFA000" />
                    <stop offset="100%" stop-color="#FF6F00" />
                  </linearGradient>
                </defs>
                <path d="M35 60 L15 118 L42 106 L68 118 L50 60" fill="#1C7C54" stroke="#0e4c32" strokeWidth="0.8"/>
                <path d="M48 60 L62 120 L76 108 L90 120 L72 60" fill="#C59B27" stroke="#94701e" strokeWidth="0.8"/>
                <circle cx="50" cy="50" r="36" fill="url(#modalGold)" stroke="#C59B27" strokeWidth="1.5"/>
                <circle cx="50" cy="50" r="30" fill="none" stroke="#FFF" strokeWidth="1" strokeDasharray="2 1.5" opacity="0.85"/>
                <text x="50" y="44" fontFamily="'Cinzel', serif" fontSize="5" fontWeight="bold" fill="#4E342E" textAnchor="middle">EXCELLENCE</text>
                <text x="50" y="52" fontFamily="'Cinzel', serif" fontSize="7" fontWeight="bold" fill="#4E342E" textAnchor="middle">AWARD</text>
                <text x="50" y="59" fontFamily="'Cinzel', serif" fontSize="4.5" fontWeight="bold" fill="#1C7C54" textAnchor="middle">ECOQUEST</text>
              </svg>

              {/* Central Metadata */}
              <div style={{ fontSize: 7, color: '#9AAFA2', lineHeight: 1.4 }}>
                Registry: ECOQUEST BLOCKCHAIN LEDGER<br/>
                ID: {cert.id?.slice(0, 18)}...<br/>
                Issued: {dateStr}
              </div>

              {/* Cursive Signatures */}
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ width: 100, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Alex Brush, cursive', fontSize: 16, color: '#1A2E22', height: 18, lineHeight: 1.2 }}>Dr. Elena Vance</div>
                  <div style={{ height: 1, background: '#C59B27', margin: '2px 0' }} />
                  <div style={{ fontSize: 7, fontWeight: 700, color: '#1A2E22' }}>Dr. Elena Vance</div>
                  <div style={{ fontSize: 6, color: '#7A8F82', textTransform: 'uppercase' }}>Dir. Sustainability</div>
                </div>
                <div style={{ width: 100, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Alex Brush, cursive', fontSize: 15, color: '#1A2E22', height: 18, lineHeight: 1.2 }}>Prof. M. Thorne</div>
                  <div style={{ height: 1, background: '#C59B27', margin: '2px 0' }} />
                  <div style={{ fontSize: 7, fontWeight: 700, color: '#1A2E22' }}>Prof. Marcus Thorne</div>
                  <div style={{ fontSize: 6, color: '#7A8F82', textTransform: 'uppercase' }}>Academic Affairs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Certificate card ─────────────────────────────────────────── */
function CertCard({ cert, user, onPreview }) {
  const rank = cert.rankNumber || 1;
  const meta = RANK_META[rank] || RANK_META[3];
  const rankSuffix = { 1: 'st', 2: 'nd', 3: 'rd' }[rank] || 'th';

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: `0 4px 20px rgba(0,0,0,0.04), 0 2px 6px ${meta.shadow}`,
      border: `1px solid ${meta.color}40`,
      transition: 'all 200ms ease',
      cursor: 'pointer',
      position: 'relative',
    }}
      className="cert-card-v2"
      onClick={() => onPreview(cert)}
    >
      {/* Decorative colored badge corner ribbon */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: `linear-gradient(135deg, ${meta.bgFrom}, ${meta.bgTo})`,
        border: `1px solid ${meta.color}`,
        borderRadius: 'var(--radius-full)',
        padding: '3px 12px',
        fontSize: 10,
        fontWeight: 700,
        color: meta.color,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        boxShadow: `0 2px 6px ${meta.shadow}`,
        zIndex: 5,
      }}>
        <span>{meta.emoji}</span>
        <span>{rank}{rankSuffix} Place</span>
      </div>

      {/* Decorative top stripe */}
      <div style={{ height: 6, background: `linear-gradient(90deg, var(--color-primary), ${meta.color})` }} />

      {/* Card body */}
      <div style={{ padding: 'var(--space-5)' }}>
        {/* Certificate Badge Frame */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{
            width: 44, height: 44,
            background: 'var(--color-primary-light)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            color: 'var(--color-primary)',
          }}>
            🏆
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
              {cert.certificateType === 'WEEKLY' ? 'Weekly Achievement' : 'Monthly Achievement'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              {cert.seasonId}
            </div>
          </div>
        </div>

        {/* Achievement line */}
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.4 }}>
          Awarded for earning <strong>{Number(cert.points || 0).toLocaleString()} green points</strong> and finishing in the top tier of campus sustainers.
        </div>

        {/* Info strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--color-background)', padding: '6px 10px', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          <span>Issued: <strong>{formatDate(cert.issuedOn)}</strong></span>
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Score: {cert.points} pts</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="btn btn-outline btn-sm"
            style={{ flex: 1, gap: 4 }}
            onClick={e => { e.stopPropagation(); onPreview(cert); }}
          >
            <Eye size={13} /> Preview
          </button>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1, gap: 4, background: 'var(--color-primary)' }}
            onClick={e => {
              e.stopPropagation();
              printCertificate({ ...cert, displayName: user?.displayName });
            }}
          >
            <Printer size={13} /> Print PDF
          </button>
        </div>
        <button
          className="btn btn-ghost btn-sm w-full"
          style={{ marginTop: 'var(--space-2)', fontSize: 11, color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}
          onClick={e => { e.stopPropagation(); downloadCertificate(cert.id); }}
        >
          <Download size={12} /> Download PDF from ledger
        </button>
      </div>
    </div>
  );
}

/* ── Rewards Section ─────────────────────────────────────────── */
function RewardItem({ reward, onClaim, claiming }) {
  return (
    <div style={{
      borderRadius: 'var(--radius-xl)',
      border: `1px solid var(--color-border)`,
      background: 'var(--color-surface)',
      overflow: 'hidden',
      transition: 'all 200ms ease',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
    >
      <div style={{ padding: 'var(--space-4)' }}>
        <div style={{
          width: 50, height: 50,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-background-alt)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
          marginBottom: 'var(--space-3)',
        }}>
          {reward.icon}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 2 }}>{reward.name}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{reward.desc}</div>
      </div>
      <div style={{ padding: 'var(--space-4)', paddingTop: 0 }}>
        <button
          className="btn btn-sm w-full"
          style={{
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            fontWeight: 700,
            border: 'none',
          }}
          onClick={() => onClaim(reward.id, reward.name)}
          disabled={claiming[reward.id]}
        >
          {claiming[reward.id] ? 'Claiming…' : '✓ Redeem Coupon'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function Certificates({ studentId }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [certs, setCerts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [claiming, setClaiming] = useState({});
  const [customReward, setCustomReward] = useState('');
  const [claims, setClaims] = useState([]);
  const [preview, setPreview]   = useState(null); // cert to preview

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true); setError(null);
    try {
      const [data, claimData] = await Promise.all([
        getCertificates(studentId),
        getRewardClaims(studentId).catch(() => []),
      ]);
      setCerts([...data].sort((a, b) => new Date(b.issuedOn) - new Date(a.issuedOn)));
      setClaims(claimData);
    } catch {
      setError('Could not load certificates. Make sure Recognition service is running.');
    } finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (rewardId, rewardName) => {
    const accepted = await confirm({
      title: 'Redeem this sustainability reward?',
      message: `${rewardName} will generate a persistent voucher for ${studentId}.`,
      confirmLabel: 'Redeem reward',
    });
    if (!accepted) return;
    setClaiming(prev => ({ ...prev, [rewardId]: true }));
    try {
      const claim = await claimReward(rewardId, studentId, rewardName);
      setClaims(items => [claim, ...items]);
      toast({ type: 'success', message: 'Reward voucher issued', sub: `Voucher code: ${claim.voucherCode}` });
    } catch {
      toast({ type: 'error', message: 'Redemption failed', sub: 'Please try again later.' });
    } finally { setClaiming(prev => { const n = { ...prev }; delete n[rewardId]; return n; }); }
  };

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton skeleton-card" style={{ height: 260 }} />)}
    </div>
  );
  if (error) return <AsyncBanner type="warning" message={error} />;

  return (
    <div>
      {/* Certificate Preview Modal */}
      {preview && (
        <CertPreviewModal
          cert={preview}
          user={user}
          onClose={() => setPreview(null)}
          onPrint={() => printCertificate({ ...preview, displayName: user?.displayName })}
        />
      )}

      {/* ── Certificates Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-5)' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
          border: '2px solid #D97706',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          boxShadow: '0 4px 10px rgba(217,119,6,0.15)',
        }}>🏅</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>My Certificates</h2>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {certs.length === 0 ? 'No certificates earned yet' : `You have earned ${certs.length} sustainability certificate${certs.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {certs.length > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
            border: '1px solid #D97706',
            color: '#92400E',
            borderRadius: 'var(--radius-full)',
            padding: '4px 14px',
            fontSize: 13, fontWeight: 700,
          }}>
            {certs.length} Earned
          </span>
        )}
      </div>

      {/* ── Certificate Grid ── */}
      {certs.length === 0 ? (
        <div className="card mb-6">
          <EmptyState
            icon={Award}
            title="No certificates unlocked yet"
            description="To earn a certificate, complete eco-actions, stay active, and place in the top rankings when a season is closed by the administrator."
          />
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))',
          gap: 'var(--space-5)',
          marginBottom: 'var(--space-6)',
        }}>
          {certs.map(cert => (
            <CertCard key={cert.id} cert={cert} user={user} onPreview={setPreview} />
          ))}
        </div>
      )}

      {/* ── Rewards Section ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <Gift size={18} color="var(--color-primary)" />
            <h2 className="card-title">Redeem Sustainability Rewards</h2>
          </div>
          <span className="badge badge-neutral">{DEMO_REWARDS.length} Rewards Catalog</span>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Exchange your sustainability achievements for campus perks. Claiming a reward generates an instant voucher coupon.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            {DEMO_REWARDS.map(r => (
              <RewardItem key={r.id} reward={r} onClaim={handleClaim} claiming={claiming} />
            ))}
          </div>

          <div className="divider" />
          {claims.length > 0 && (
            <div className="reward-claim-history">
              <h3>Issued vouchers</h3>
              {claims.slice(0, 6).map(claim => (
                <div key={claim.id}>
                  <span>
                    <strong>{claim.rewardName}</strong>
                    <small>{new Date(claim.claimedOn).toLocaleString()}</small>
                  </span>
                  <code>{claim.voucherCode}</code>
                </div>
              ))}
            </div>
          )}
          {claims.length > 0 && <div className="divider" />}
          <div style={{ background: 'var(--color-background-alt)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--color-text)' }}>Custom Voucher Request</h3>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Have another reward in mind? Enter a custom request (e.g. "Free Campus Bus Pass") to submit a voucher.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                className="form-input"
                value={customReward}
                onChange={e => setCustomReward(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && customReward.trim() && (() => { handleClaim('custom-' + Date.now(), customReward.trim()); setCustomReward(''); })()}
                placeholder="e.g. Free parking pass, Canteen snack credit..."
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-primary"
                onClick={() => { if (!customReward.trim()) return; handleClaim('custom-' + Date.now(), customReward.trim()); setCustomReward(''); }}
                disabled={!customReward.trim()}
              >
                <Gift size={14} /> Request Reward
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
