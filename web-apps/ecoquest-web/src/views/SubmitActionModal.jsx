import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Leaf, Camera, MapPin, CheckCircle2, Clock, XCircle, AlertTriangle, Upload, X, Image } from 'lucide-react';
import Modal from '../components/Modal.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import { useToast } from '../components/Toast.jsx';
import { getMissions, getStations, saveDraft, submitAction, uploadEvidence } from '../api/ecoquestApi.js';
import { activeMissions } from '../utils/accessRules.js';

const ALLOWED_EVIDENCE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

/* ── File upload → data URL helper ───────────────────────────── */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── Evidence Upload Widget ──────────────────────────────────── */
function EvidenceUpload({ evidenceUrl, onEvidenceChange, required }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // local preview URL
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;

    if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) {
      setUploadError('Unsupported file type. Please upload PNG, JPG, GIF, WebP, or PDF.');
      return;
    }

    // Limit size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds the 5MB limit. Please select a smaller file.');
      return;
    }
    setUploadError('');

    const localUrl = URL.createObjectURL(file);
    setPreview(file.type.startsWith('image/') ? localUrl : null);
    setFileName(file.name);
    try {
      // Keep a data URL for preview; submit uploads it to Action/MinIO first.
      const dataUrl = await fileToDataUrl(file);
      onEvidenceChange(dataUrl);
    } catch {
      // fallback: use local object URL
      onEvidenceChange(localUrl);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clearEvidence = () => {
    setPreview(null);
    setFileName('');
    setUploadError('');
    onEvidenceChange('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasEvidence = !!evidenceUrl;

  return (
    <div className="form-group">
      <label className="form-label">
        Evidence Attachment (Photo / Document)
        {required && <span style={{ color: 'var(--color-danger)', marginLeft: 4 }}>*</span>}
      </label>

      {/* Upload zone */}
      {!hasEvidence ? (
        <div
          style={{
            border: `2px dashed ${uploadError ? 'var(--color-danger)' : (dragOver ? 'var(--color-primary)' : 'var(--color-border)')}`,
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            textAlign: 'center',
            cursor: 'pointer',
            background: uploadError ? 'var(--color-danger-bg)' : (dragOver ? 'var(--color-primary-dim)' : 'var(--color-background)'),
            transition: 'all 150ms ease',
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload size={28} color={uploadError ? 'var(--color-danger)' : (dragOver ? 'var(--color-primary)' : 'var(--color-text-faint)')} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: uploadError ? 'var(--color-danger-text)' : 'inherit' }}>
            {uploadError ? uploadError : (dragOver ? 'Drop to upload' : 'Click to select file or drag & drop here')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            Supports PNG, JPG, GIF, WebP, or PDF under 5MB
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-primary)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {preview ? (
            <img
              src={preview}
              alt="Evidence preview"
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              padding: 'var(--space-4)',
              background: 'var(--color-primary-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}>
              <Image size={24} color="var(--color-primary)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{fileName || 'Evidence document'}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Attachment ready for verification</div>
              </div>
            </div>
          )}
          {/* Success overlay + remove */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
            padding: 'var(--space-2) var(--space-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>
              <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
              {fileName || 'Evidence file attached'}
            </span>
            <button
              type="button"
              onClick={clearEvidence}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4,
                color: 'white', cursor: 'pointer', padding: '2px 6px', fontSize: 11,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <X size={12} /> Change File
            </button>
          </div>
        </div>
      )}
      {uploadError && (
        <div style={{ color: 'var(--color-danger)', fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={12} /> {uploadError}
        </div>
      )}
    </div>
  );
}

/* ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── */
export default function SubmitActionModal({ isOpen, onClose, studentId, prefillMission }) {
  const toast = useToast();
  const [missions, setMissions]   = useState([]);
  const [stations, setStations]   = useState([]);
  const [form, setForm]           = useState({
    studentId,
    missionId: '',
    stationId: '',
    evidenceUrl: '',
  });
  const [result, setResult]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [fieldError, setFieldError]   = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setResult(null); setFieldError('');
    Promise.all([getMissions(), getStations()])
      .then(([m, s]) => { setMissions(activeMissions(m)); setStations(s); })
      .catch(() => {});
  }, [isOpen]);

  // Pre-fill when clicking mission Submit button
  useEffect(() => {
    if (prefillMission) {
      setForm(f => ({ ...f, missionId: prefillMission.id, stationId: '', evidenceUrl: '' }));
    }
  }, [prefillMission]);

  // Keep studentId in sync
  useEffect(() => {
    setForm(f => ({ ...f, studentId }));
  }, [studentId]);

  const selectedMission = missions.find(m => m.id === form.missionId);

  const set = (field) => (value) => {
    setForm(f => ({ ...f, [field]: typeof value === 'string' ? value : value.target?.value ?? value }));
    setFieldError('');
    setResult(null);
  };

  const validate = () => {
    if (!form.missionId) return 'Please select a mission.';
    if (selectedMission?.evidenceRequired && !form.evidenceUrl.trim())
      return 'Evidence is required for this mission — please upload a photo or document.';
    if (selectedMission?.stationRequired && !form.stationId)
      return 'Station is required for this mission.';
    return '';
  };

  const handleDraft = async () => {
    const err = validate();
    if (err) { setFieldError(err); return; }
    setSavingDraft(true);
    try {
      await saveDraft({ ...form, actionType: selectedMission?.actionType });
      toast({ type: 'success', message: 'Draft saved successfully', sub: 'You can submit it later.' });
    } catch {
      toast({ type: 'error', message: 'Failed to save draft' });
    } finally { setSavingDraft(false); }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setFieldError(err); return; }
    setSubmitting(true); setResult(null);
    try {
      let evidenceUrl = form.evidenceUrl || undefined;
      if (typeof evidenceUrl === 'string' && evidenceUrl.startsWith('data:')) {
        const uploaded = await uploadEvidence({
          fileName: evidenceUrl.startsWith('data:application/pdf') ? 'evidence.pdf' : 'evidence.png',
          dataUrl: evidenceUrl,
        });
        evidenceUrl = uploaded.evidenceUrl;
        setForm(f => ({ ...f, evidenceUrl }));
      }
      const data = await submitAction({
        studentId: form.studentId,
        missionId: form.missionId,
        stationId: form.stationId || undefined,
        actionType: selectedMission?.actionType,
        evidenceUrl,
      });
      setResult(data);

      if (data.status === 'ACCEPTED') {
        toast({ type: 'success', message: `Action accepted! +${data.points} points 🎉`, sub: 'Wallet and leaderboard will update shortly.' });
        setTimeout(() => { window.__eqRefreshDashboard?.(true); }, 500);
      } else if (data.status === 'PENDING_REVIEW') {
        toast({ type: 'warning', message: 'Sent for moderator review 📋', sub: 'You will earn points after approval.' });
        setTimeout(() => { window.__eqRefreshDashboard?.(); }, 500);
      } else {
        toast({ type: 'error', message: 'Action rejected', sub: data.policyReason || 'Policy check failed.' });
      }
    } catch (e) {
      if (e.response?.status === 409) {
        setFieldError('This action was already submitted (duplicate idempotency key).');
      } else if (e.response?.status === 400) {
        setFieldError(e.response?.data?.message || 'Validation error. Please check your inputs.');
      } else {
        toast({ type: 'error', message: 'Submission failed', sub: 'Check backend connection.' });
      }
    } finally { setSubmitting(false); }
  };

  const ResultDisplay = () => {
    if (!result) return null;
    const isAccepted = result.status === 'ACCEPTED';
    const isPending  = result.status === 'PENDING_REVIEW';
    const isRejected = result.status === 'REJECTED';
    return (
      <div className={`modal-result ${isAccepted ? 'accepted' : isPending ? 'pending' : 'rejected'}`}>
        {isAccepted && <CheckCircle2 size={20} />}
        {isPending  && <Clock size={20} />}
        {isRejected && <XCircle size={20} />}
        <div>
          {isAccepted && <><strong>Accepted! +{result.points} points</strong><br /><span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Wallet and leaderboard update in a moment.</span></>}
          {isPending  && <><strong>Pending Review</strong><br /><span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>A moderator will review your submission.</span></>}
          {isRejected && <><strong>Rejected</strong><br /><span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>{result.policyReason}</span></>}
        </div>
      </div>
    );
  };

  const footer = (
    <>
      {!result && (
        <button className="btn btn-secondary" onClick={handleDraft} disabled={savingDraft || submitting}>
          {savingDraft ? 'Saving…' : 'Save Draft'}
        </button>
      )}
      {result ? (
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      ) : (
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || savingDraft}>
          {submitting ? 'Submitting…' : <><Leaf size={16} /> Submit Action</>}
        </button>
      )}
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Green Action"
      titleIcon={<Leaf size={18} />}
      footer={footer}
    >
      {fieldError && (
        <div className="async-banner warning" style={{ marginBottom: 'var(--space-3)' }}>
          <AlertTriangle size={16} />
          {fieldError}
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="modal-studentId">Student ID</label>
        <input id="modal-studentId" className="form-input" value={form.studentId}
          onChange={e => set('studentId')(e.target.value)} placeholder="SV001" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="modal-mission">Mission</label>
        <select id="modal-mission" className={`form-select${!form.missionId ? ' error' : ''}`} value={form.missionId} onChange={e => set('missionId')(e.target.value)}>
          <option value="">— Select a mission —</option>
          {missions.map(m => (
            <option key={m.id} value={m.id}>{m.title} ({m.basePoints} pts)</option>
          ))}
        </select>
      </div>

      {selectedMission && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
          <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>{selectedMission.actionType}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>· {selectedMission.basePoints} pts</span>
          {selectedMission.evidenceRequired && (
            <span className="mission-req-pill" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>
              <Camera size={11} /> Evidence required
            </span>
          )}
          {selectedMission.stationRequired && (
            <span className="mission-req-pill" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info-text)' }}>
              <MapPin size={11} /> Station required
            </span>
          )}
          {selectedMission.description && (
            <div style={{ width: '100%', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {selectedMission.description}
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="modal-station">
          Green Station
          {selectedMission?.stationRequired && <span style={{ color: 'var(--color-danger)', marginLeft: 4 }}>*</span>}
        </label>
        <select
          id="modal-station"
          className={`form-select${selectedMission?.stationRequired && !form.stationId ? ' error' : ''}`}
          value={form.stationId}
          onChange={e => set('stationId')(e.target.value)}
        >
          <option value="">— No station —</option>
          {stations.filter(s => s.active !== false).map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.location}) — {s.stationType}</option>
          ))}
        </select>
      </div>

      {/* Evidence Upload (file picker with size validation) */}
      <EvidenceUpload
        evidenceUrl={form.evidenceUrl}
        onEvidenceChange={val => set('evidenceUrl')(val)}
        required={selectedMission?.evidenceRequired}
      />

      <ResultDisplay />
    </Modal>
  );
}
