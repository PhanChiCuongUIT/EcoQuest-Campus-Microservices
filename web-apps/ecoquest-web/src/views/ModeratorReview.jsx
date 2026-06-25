import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, ExternalLink, Image as ImageIcon, Eye } from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { getPendingReview, approveAction, rejectAction } from '../api/ecoquestApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';

function timeAgo(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  } catch { return '—'; }
}

export default function ModeratorReview() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [queue, setQueue]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  
  // Selected image evidence for the lightbox modal
  const [selectedImage, setSelectedImage] = useState(null);
  const [brokenEvidence, setBrokenEvidence] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getPendingReview();
      setQueue(data);
    } catch {
      setError('Could not load review queue. Make sure backend is running.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    const accepted = await confirm({
      title: 'Approve this eco action?',
      message: 'The accepted event will grant points and update badges and leaderboards asynchronously.',
      confirmLabel: 'Approve action',
    });
    if (!accepted) return;
    setActionLoading(prev => ({ ...prev, [id]: 'approving' }));
    try {
      await approveAction(id);
      await load();
      toast({ type: 'success', message: 'Action approved successfully!', sub: 'Points will be granted shortly via event processing.' });
    } catch (error) {
      toast({
        type: 'error',
        message: error.response?.status === 403 ? 'You cannot review your own action.' : 'Approval failed',
      });
    } finally { setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; }); }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) { return; }
    setActionLoading(prev => ({ ...prev, [id]: 'rejecting' }));
    try {
      await rejectAction(id, rejectReason.trim());
      await load();
      setRejectingId(null); setRejectReason('');
      toast({ type: 'info', message: 'Action rejected.' });
    } catch (error) {
      toast({
        type: 'error',
        message: error.response?.status === 403 ? 'You cannot review your own action.' : 'Rejection failed',
      });
    } finally { setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; }); }
  };

  if (loading) return <div className="skeleton skeleton-card" />;
  if (error) return <AsyncBanner type="warning" message={error} />;

  // Check if string is base64 image or image URL
  const isImageEvidence = (url) => {
    if (!url) return false;
    return url.startsWith('data:image/')
      || url.startsWith('/actions/evidence/')
      || url.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i);
  };
  const evidenceSrc = (url) => {
    if (!url) return '';
    return url.startsWith('http') || url.startsWith('data:') || url.startsWith('/') ? url : `/${url}`;
  };
  const filteredQueue = queue.filter(item => {
    const haystack = `${item.studentId} ${item.missionId} ${item.actionType}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (!statusFilter || item.status === statusFilter);
  });

  return (
    <div>
      {/* Lightbox modal for evidence */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        title="Evidence Attachment Viewer"
        titleIcon={<ImageIcon size={18} color="var(--color-primary)" />}
        size="lg"
      >
        {selectedImage && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={selectedImage}
              alt="Evidence Full View"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--color-border)',
                display: 'block',
                margin: '0 auto',
              }}
            />
          </div>
        )}
      </Modal>

      <AsyncBanner
        type="info"
        message="Reward and leaderboard updates may take a few seconds after approval."
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} color="var(--color-warning)" />
          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>
            Review Queue
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search student or mission" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" style={{ maxWidth: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['PENDING_REVIEW', 'ACCEPTED', 'REJECTED'].map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          <span className="badge badge-pending">{queue.filter(item => item.status === 'PENDING_REVIEW').length} pending</span>
          <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
        </div>
      </div>

      {filteredQueue.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up!"
          description="No pending actions to review."
        />
      ) : (
        filteredQueue.map(item => (
          <div key={item.id} className="review-card">
            <div className="review-card-header">
              <div>
                <div className="review-card-student">{item.studentId}</div>
                <div className="review-card-time"><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{timeAgo(item.submittedAt)}</div>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <div className="review-card-body">
              <div>
                <div className="review-field-label">Mission ID</div>
                <div className="review-field-value">{item.missionId}</div>
              </div>
              <div>
                <div className="review-field-label">Action Type</div>
                <div className="review-field-value mono">{item.actionType}</div>
              </div>
              <div>
                <div className="review-field-label">Policy Reason</div>
                <div className="review-field-value" style={{ color: 'var(--color-warning)', fontWeight: 600 }}>
                  {item.policyReason || '—'}
                </div>
              </div>
              <div>
                <div className="review-field-label">Evidence Material</div>
                <div className="review-field-value">
                  {item.evidenceUrl ? (
                    isImageEvidence(item.evidenceUrl) && !brokenEvidence[item.id] ? (
                      /* Render inline thumbnail for images */
                      <div
                        style={{
                          position: 'relative',
                          width: '120px',
                          height: '90px',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '2px solid var(--color-border)',
                          boxShadow: 'var(--shadow-sm)',
                          marginTop: 4,
                          transition: 'all 150ms ease',
                        }}
                        onClick={() => setSelectedImage(evidenceSrc(item.evidenceUrl))}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                        title="Click to zoom evidence photo"
                      >
                        <img
                          src={evidenceSrc(item.evidenceUrl)}
                          alt="Evidence Thumbnail"
                          onError={() => setBrokenEvidence(prev => ({ ...prev, [item.id]: true }))}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0,
                          transition: 'opacity 150ms ease',
                        }}
                          onMouseEnter={e => e.currentTarget.style.opacity = 1}
                          onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                          <Eye size={16} color="white" />
                        </div>
                      </div>
                    ) : (
                      /* Fallback links for non-image files */
                      <div className="evidence-fallback">
                        <ImageIcon size={18} />
                        <span>Preview unavailable</span>
                        <a href={evidenceSrc(item.evidenceUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                          Open evidence <ExternalLink size={12} />
                        </a>
                      </div>
                    )
                  ) : (
                    <span style={{ color: 'var(--color-danger-text)' }}>No evidence provided</span>
                  )}
                </div>
              </div>
            </div>

            {item.status !== 'PENDING_REVIEW' ? (
              <div className="review-card-actions">
                <span className="badge badge-neutral">
                  Reviewed {item.reviewedAt ? timeAgo(item.reviewedAt) : ''}
                </span>
              </div>
            ) : rejectingId === item.id ? (
              <div className="reject-reason">
                <label className="form-label" htmlFor={`reject-reason-${item.id}`}>Rejection reason (required)</label>
                <textarea
                  id={`reject-reason-${item.id}`}
                  className="form-textarea"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Evidence is not readable, unrelated or does not show required station."
                  rows={2}
                  autoFocus
                />
                <div className="review-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReject(item.id)}
                    disabled={!rejectReason.trim() || actionLoading[item.id] === 'rejecting'}
                  >
                    {actionLoading[item.id] === 'rejecting' ? 'Rejecting…' : <><XCircle size={14} /> Confirm Reject</>}
                  </button>
                </div>
              </div>
            ) : (
              <div className="review-card-actions">
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => { setRejectingId(item.id); setRejectReason(''); }}
                  disabled={!!actionLoading[item.id] || user?.studentId === item.studentId}
                >
                  <XCircle size={14} /> Reject Action
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleApprove(item.id)}
                  disabled={!!actionLoading[item.id] || user?.studentId === item.studentId}
                >
                  {actionLoading[item.id] === 'approving' ? 'Approving…' : <><CheckCircle2 size={14} /> Approve & Grant Points</>}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
