import React, { useEffect, useState, useRef } from 'react';
import {
  Leaf, Camera, MapPin, CheckCircle2, Clock, XCircle, AlertTriangle,
  Upload, X, Image, FileVideo, FileText,
} from 'lucide-react';
import Modal from '../components/Modal.jsx';
import StationScanner from '../components/StationScanner.jsx';
import { createClientId } from '../utils/clientIds.js';
import { useToast } from '../components/Toast.jsx';
import { getMissions, getStations, saveDraft, submitAction, uploadEvidence } from '../api/ecoquestApi.js';
import { activeMissions } from '../utils/accessRules.js';
import { validateEvidenceBatch, validateUpload } from '../utils/workflowRules.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const DOCUMENT_TYPES = ['application/pdf'];
const ALLOWED_EVIDENCE_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOCUMENT_TYPES];
const MAX_IMAGE_OR_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_COUNT = 5;

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function evidenceId() {
  return globalThis.crypto?.randomUUID?.() || `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function evidenceKind(contentType) {
  if (contentType?.startsWith('image/')) return 'image';
  if (contentType?.startsWith('video/')) return 'video';
  if (contentType === 'application/pdf') return 'document';
  return 'file';
}

function maxBytesFor(file) {
  return file.type?.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_OR_DOCUMENT_BYTES;
}

function EvidenceUpload({ items, onItemsChange, required }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const hasVideoOrDocument = items.some(item => item.kind === 'video' || item.kind === 'document');
  const imageCount = items.filter(item => item.kind === 'image').length;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const batchError = validateEvidenceBatch(items, files, { maxImages: MAX_IMAGE_COUNT });
    if (batchError) {
      setUploadError(batchError);
      return;
    }

    for (const file of files) {
      const error = validateUpload(file, {
        allowedTypes: ALLOWED_EVIDENCE_TYPES,
        maxBytes: maxBytesFor(file),
      });
      if (error) {
        setUploadError(file.type?.startsWith('video/')
          ? `${error} Videos must be MP4, WebM or MOV under 50MB.`
          : `${error} Images/PDF must be under 5MB.`);
        return;
      }
    }

    setUploadError('');
    const mapped = await Promise.all(files.map(async file => {
      const kind = evidenceKind(file.type);
      return {
        id: evidenceId(),
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        kind,
        dataUrl: await fileToDataUrl(file),
        previewUrl: kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : '',
      };
    }));

    const next = mapped.some(item => item.kind === 'video' || item.kind === 'document')
      ? mapped
      : [...items, ...mapped];
    onItemsChange(next);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeItem = (id) => {
    const target = items.find(item => item.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onItemsChange(items.filter(item => item.id !== id));
  };

  const clearAll = () => {
    items.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    onItemsChange([]);
    setUploadError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const openPicker = () => fileRef.current?.click();
  const canAddMoreImages = !hasVideoOrDocument && imageCount < MAX_IMAGE_COUNT;

  return (
    <div className="form-group">
      <label className="form-label">
        Evidence media
        {required && <span style={{ color: 'var(--color-danger)', marginLeft: 4 }}>*</span>}
      </label>

      <div
        className={`evidence-dropzone${dragOver ? ' is-dragover' : ''}${uploadError ? ' has-error' : ''}`}
        onClick={items.length === 0 || canAddMoreImages ? openPicker : undefined}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload size={28} />
        <div>
          <strong>{items.length ? 'Add more evidence' : 'Drop evidence here or choose files'}</strong>
          <span>Upload up to {MAX_IMAGE_COUNT} photos, or one MP4/WebM/MOV video under 50MB.</span>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={e => { e.stopPropagation(); openPicker(); }}
          disabled={items.length > 0 && !canAddMoreImages}
        >
          {items.length ? 'Add media' : 'Choose media'}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={[...ALLOWED_EVIDENCE_TYPES].join(',')}
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="evidence-media-grid">
          {items.map((item, index) => (
            <div key={item.id} className="evidence-media-card">
              <div className="evidence-media-preview">
                {item.kind === 'image' && <img src={item.previewUrl || item.uploadedUrl} alt={item.fileName} />}
                {item.kind === 'video' && <video src={item.previewUrl || item.uploadedUrl} controls muted />}
                {item.kind === 'document' && <FileText size={30} />}
                {item.kind === 'file' && <Image size={30} />}
              </div>
              <div className="evidence-media-meta">
                <strong>{item.fileName || `Evidence ${index + 1}`}</strong>
                <span>
                  {item.kind === 'image' ? 'Photo evidence' : item.kind === 'video' ? 'Video evidence' : 'Document evidence'}
                  {item.sizeBytes ? ` · ${(item.sizeBytes / 1024 / 1024).toFixed(2)} MB` : ''}
                </span>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeItem(item.id)} title="Remove evidence">
                <X size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
            Clear all evidence
          </button>
        </div>
      )}

      {uploadError && (
        <div className="form-error" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={12} /> {uploadError}
        </div>
      )}
    </div>
  );
}

export default function SubmitActionModal({ isOpen, onClose, studentId, prefillMission }) {
  const toast = useToast();
  const [missions, setMissions] = useState([]);
  const [stations, setStations] = useState([]);
  const [form, setForm] = useState({
    studentId,
    missionId: '',
    stationId: '',
    evidenceItems: [],
  });
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [stationScan, setStationScan] = useState(null);
  const submissionKey = useRef(createClientId('action-submit'));
  useEffect(() => {
    setStationScan(null);
    setForm(f => ({ ...f, stationId: '' }));
    submissionKey.current = createClientId('action-submit');
  }, [isOpen, form.missionId, studentId]);

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setFieldError('');
    Promise.all([getMissions(), getStations()])
      .then(([m, s]) => { setMissions(activeMissions(m)); setStations(s); })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (prefillMission) {
      setForm(f => ({ ...f, missionId: prefillMission.id, stationId: '', evidenceItems: [] }));
    }
  }, [prefillMission]);

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
    if (selectedMission?.evidenceRequired && form.evidenceItems.length === 0) {
      return 'Evidence is required for this mission. Upload multiple photos or one short video.';
    }
    if (selectedMission?.stationRequired && (!stationScan || new Date(stationScan.expiresAt) <= new Date())) {
      return 'Scan an allowed station QR before submitting. Scans are valid for 10 minutes.';
    }
    return '';
  };

  const uploadEvidenceItems = async () => {
    const uploadedItems = [];
    const evidenceUrls = [];

    for (const item of form.evidenceItems) {
      if (item.uploadedUrl) {
        uploadedItems.push(item);
        evidenceUrls.push(item.uploadedUrl);
        continue;
      }
      const uploaded = await uploadEvidence({
        fileName: item.fileName,
        contentType: item.contentType,
        dataUrl: item.dataUrl,
      });
      const nextItem = { ...item, uploadedUrl: uploaded.evidenceUrl, objectKey: uploaded.objectKey };
      uploadedItems.push(nextItem);
      evidenceUrls.push(uploaded.evidenceUrl);
    }

    setForm(f => ({ ...f, evidenceItems: uploadedItems }));
    return evidenceUrls;
  };

  const handleDraft = async () => {
    const err = validate();
    if (err) { setFieldError(err); return; }
    setSavingDraft(true);
    try {
      const evidenceUrls = form.evidenceItems.map(item => item.uploadedUrl || item.dataUrl).filter(Boolean);
      await saveDraft({
        studentId: form.studentId,
        missionId: form.missionId,
        stationId: form.stationId || undefined,
        actionType: selectedMission?.actionType,
        evidenceUrl: evidenceUrls[0],
        evidenceUrls,
      });
      toast({ type: 'success', message: 'Draft saved successfully', sub: 'You can submit it later.' });
    } catch (error) {
      toast({ type: 'error', message: 'Failed to save draft', sub: error.message });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setFieldError(err); return; }
    setSubmitting(true);
    setResult(null);
    try {
      const evidenceUrls = await uploadEvidenceItems();
      const data = await submitAction({
        idempotencyKey: submissionKey.current,
        stationScanReceipt: stationScan?.scanReceipt,
        studentId: form.studentId,
        missionId: form.missionId,
        stationId: form.stationId || undefined,
        actionType: selectedMission?.actionType,
        evidenceUrl: evidenceUrls[0],
        evidenceUrls,
      });
      setResult(data);

      if (data.status === 'ACCEPTED') {
        toast({ type: 'success', message: `Action accepted! +${data.points} points`, sub: 'Wallet and leaderboard will update shortly.' });
        setTimeout(() => { window.__eqRefreshDashboard?.(true); }, 500);
      } else if (data.status === 'PENDING_REVIEW') {
        toast({ type: 'warning', message: 'Sent for moderator review', sub: 'You will earn points after approval.' });
        setTimeout(() => { window.__eqRefreshDashboard?.(); }, 500);
      } else {
        toast({ type: 'error', message: 'Action rejected', sub: data.policyReason || 'Policy check failed.' });
      }
    } catch (e) {
      if (e.response?.status === 409) {
        setFieldError(e.response?.data?.message || e.response?.data?.detail || 'Submission conflict. Check the station scan and mission status.');
      } else if (e.response?.status === 400) {
        setFieldError(e.response?.data?.message || 'Validation error. Please check your inputs.');
      } else if (e.response?.status === 401) {
        toast({ type: 'error', message: 'Session expired', sub: 'Please sign in again before submitting this action.' });
      } else if (e.response?.status === 403) {
        toast({ type: 'error', message: 'Submission not allowed', sub: e.message });
      } else if (e.response?.status === 413) {
        toast({ type: 'error', message: 'Evidence file is too large', sub: 'Use photos under 5MB each or one video under 50MB.' });
      } else if (e.response) {
        toast({
          type: 'error',
          message: 'Submission failed',
          sub: e.response?.data?.message || e.response?.data?.detail || `Backend returned HTTP ${e.response.status}.`,
        });
      } else {
        toast({ type: 'error', message: 'Submission failed', sub: e.message || 'Cannot reach the backend gateway.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const ResultDisplay = () => {
    if (!result) return null;
    const isAccepted = result.status === 'ACCEPTED';
    const isPending = result.status === 'PENDING_REVIEW';
    const isRejected = result.status === 'REJECTED';
    return (
      <div className={`modal-result ${isAccepted ? 'accepted' : isPending ? 'pending' : 'rejected'}`}>
        {isAccepted && <CheckCircle2 size={20} />}
        {isPending && <Clock size={20} />}
        {isRejected && <XCircle size={20} />}
        <div>
          {isAccepted && <><strong>Accepted! +{result.points} points</strong><br /><span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Wallet and leaderboard update in a moment.</span></>}
          {isPending && <><strong>Pending Review</strong><br /><span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>A moderator will review your submission.</span></>}
          {isRejected && <><strong>Rejected</strong><br /><span style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>{result.policyReason}</span></>}
        </div>
      </div>
    );
  };

  const footer = (
    <>
      {!result && (
        <button className="btn btn-secondary" onClick={handleDraft} disabled={savingDraft || submitting}>
          {savingDraft ? 'Saving...' : 'Save Draft'}
        </button>
      )}
      {result ? (
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      ) : (
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || savingDraft}>
          {submitting ? 'Submitting...' : <><Leaf size={16} /> Submit Action</>}
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
          <option value="">Select a mission</option>
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
        <input id="modal-station" className="form-input" readOnly value={stationScan?.station.name || ''} placeholder={selectedMission?.stationRequired ? 'Scan a station QR' : 'No station required'} />
        {selectedMission?.stationRequired && <>
          <p className="form-hint">{stations.filter(s => selectedMission.allowedStationIds?.includes(s.id)).map(s => s.name).join(' / ') || 'No stations assigned'}</p>
          <StationScanner key={form.missionId} missionId={form.missionId} onScanned={scan => { setStationScan(scan); setForm(f => ({ ...f, stationId: scan.station.id })); setFieldError(''); }} />
          {stationScan && <p role="status">Station confirmed until {new Date(stationScan.expiresAt).toLocaleTimeString()}</p>}
        </>}
      </div>

      <EvidenceUpload
        items={form.evidenceItems}
        onItemsChange={val => set('evidenceItems')(val)}
        required={selectedMission?.evidenceRequired}
      />

      <ResultDisplay />
    </Modal>
  );
}
