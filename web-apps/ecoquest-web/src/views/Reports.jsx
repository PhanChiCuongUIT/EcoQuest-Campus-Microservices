import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileImage, Filter, Flag, Plus, Search, Upload } from 'lucide-react';
import {
  createReport,
  getMissions,
  getMyReports,
  getPendingReview,
  getReportTargetUsers,
  getReports,
  reviewReport,
  uploadReportEvidence,
} from '../api/ecoquestApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { reportTargetOptions } from '../utils/workflowRules.js';

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

export default function Reports({ panelRole }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const effectiveRole = (panelRole || user?.role || 'STUDENT').toUpperCase();
  const canReview = effectiveRole === 'MODERATOR' || effectiveRole === 'ADMIN';
  const canCreate = effectiveRole === 'STUDENT' || (effectiveRole === 'MODERATOR' && Boolean(user?.studentId));
  const [reports, setReports] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [targets, setTargets] = useState([]);
  const [directoryTargets, setDirectoryTargets] = useState([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetQuery, setTargetQuery] = useState('');
  const targetOptions = useMemo(() => reportTargetOptions(effectiveRole), [effectiveRole]);
  const [form, setForm] = useState({ targetType: targetOptions[0]?.[0] || 'USER', targetId: '', reason: '', evidenceUrl: '' });

  const load = () => (canReview ? getReports() : getMyReports())
    .then(items => setReports(Array.isArray(items) ? items : []))
    .catch(() => setReports([]));
  useEffect(() => { load(); }, [canReview]);
  useEffect(() => {
    setForm(current => ({ ...current, targetType: targetOptions[0]?.[0] || 'USER', targetId: '' }));
  }, [targetOptions]);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getReportTargetUsers(), getMissions(), getPendingReview()]).then(results => {
      if (cancelled) return;
      const [userResult, missionResult, actionResult] = results;
      const users = userResult.status === 'fulfilled' ? userResult.value : [];
      const missions = missionResult.status === 'fulfilled' ? missionResult.value : [];
      const actions = actionResult.status === 'fulfilled' ? actionResult.value : [];
      setDirectoryTargets([
        ...users.map(account => ({
          id: account.id,
          type: 'USER',
          title: account.displayName || account.email,
          subtitle: [account.email, account.studentId, account.role].filter(Boolean).join(' | '),
          avatarUrl: account.avatarUrl,
        })),
        ...missions.map(mission => ({
          id: mission.id,
          type: 'MISSION',
          title: mission.title || mission.id,
          subtitle: [mission.actionType, mission.status, `${mission.basePoints ?? 0} pts`].filter(Boolean).join(' | '),
          avatarUrl: mission.imageUrl,
        })),
        ...actions.map(action => ({
          id: action.id,
          type: 'ACTION',
          title: `Submission by ${action.studentId}`,
          subtitle: [action.missionId, action.status, action.actionType].filter(Boolean).join(' | '),
          avatarUrl: null,
        })),
      ]);
    });
    return () => { cancelled = true; };
  }, [reports.length]);
  useEffect(() => {
    let cancelled = false;
    setTargetsLoading(true);
    setTargetQuery('');
    const loadTargets = async () => {
      try {
        let items = [];
        if (form.targetType === 'USER') {
          items = (await getReportTargetUsers()).map(account => ({
            id: account.id,
            title: account.displayName || account.email,
            subtitle: [account.email, account.studentId, account.role].filter(Boolean).join(' | '),
            avatarUrl: account.avatarUrl,
          }));
        } else if (form.targetType === 'MISSION') {
          items = (await getMissions()).map(mission => ({
            id: mission.id,
            title: mission.title || mission.id,
            subtitle: [mission.actionType, mission.status, `${mission.basePoints ?? 0} pts`].filter(Boolean).join(' | '),
            avatarUrl: mission.imageUrl,
          }));
        } else if (form.targetType === 'ACTION') {
          items = (await getPendingReview()).map(action => ({
            id: action.id,
            title: `Submission by ${action.studentId}`,
            subtitle: [action.missionId, action.status, action.actionType].filter(Boolean).join(' | '),
            avatarUrl: null,
          }));
        }
        if (!cancelled) setTargets(items);
      } catch {
        if (!cancelled) setTargets([]);
      } finally {
        if (!cancelled) setTargetsLoading(false);
      }
    };
    loadTargets();
    return () => { cancelled = true; };
  }, [form.targetType]);

  const targetLabels = useMemo(() => {
    const map = new Map();
    directoryTargets.forEach(item => map.set(item.id, item));
    targets.forEach(item => map.set(item.id, item));
    reports.forEach(report => {
      if (!map.has(report.targetId)) {
        map.set(report.targetId, { id: report.targetId, title: report.targetId, subtitle: report.targetType });
      }
    });
    return map;
  }, [directoryTargets, targets, reports]);

  const filtered = useMemo(() => reports.filter(report => {
    const target = targetLabels.get(report.targetId);
    const haystack = `${report.targetType} ${report.targetId} ${target?.title || ''} ${target?.subtitle || ''} ${report.reason} ${report.reporterStudentId || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (!statusFilter || report.status === statusFilter);
  }), [reports, query, statusFilter, targetLabels]);

  const filteredTargets = useMemo(() => {
    const normalized = targetQuery.toLowerCase().trim();
    return targets
      .filter(item => `${item.title} ${item.subtitle} ${item.id}`.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [targets, targetQuery]);

  const submit = async () => {
    if (!form.targetId.trim() || !form.reason.trim()) return;
    const accepted = await confirm({
      title: 'Submit this report?',
      message: `The campus moderation team will review the ${form.targetType.toLowerCase()} report.`,
      detail: form.reason.trim(),
      confirmLabel: 'Submit report',
      tone: 'warning',
    });
    if (!accepted) return;
    try {
      await createReport({ ...form, targetId: form.targetId.trim(), reason: form.reason.trim() });
      setForm({ targetType: targetOptions[0]?.[0] || 'USER', targetId: '', reason: '', evidenceUrl: '' });
      setCreateOpen(false);
      await load();
      toast({ type: 'success', message: 'Report submitted' });
    } catch (error) {
      toast({ type: 'error', message: 'Report submission failed', sub: error?.response?.data?.message || error.message });
    }
  };

  const review = async (report, status) => {
    const note = await confirm({
      title: `${status === 'ACCEPTED' ? 'Accept' : 'Reject'} report?`,
      message: `Review report about ${report.targetType.toLowerCase()} ${targetLabels.get(report.targetId)?.title || report.targetId}.`,
      inputLabel: 'Moderation note',
      inputPlaceholder: 'Record the review decision',
      inputRequired: true,
      confirmLabel: status === 'ACCEPTED' ? 'Accept report' : 'Reject report',
      tone: status === 'ACCEPTED' ? 'primary' : 'danger',
    });
    if (!note) return;
    try {
      await reviewReport(report.id, status, note);
      await load();
      toast({ type: 'success', message: `Report ${status.toLowerCase()}` });
    } catch (error) {
      toast({ type: 'error', message: 'Report review failed', sub: error?.response?.data?.message || error.message });
    }
  };

  const uploadEvidence = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_EVIDENCE_BYTES) {
      toast({ type: 'warning', message: 'Evidence is too large', sub: 'Maximum size is 5MB.' });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const uploaded = await uploadReportEvidence({ fileName: file.name, dataUrl });
      setForm(current => ({ ...current, evidenceUrl: uploaded.evidenceUrl }));
      toast({ type: 'success', message: 'Report evidence uploaded' });
    } catch (error) {
      toast({ type: 'error', message: 'Evidence upload failed', sub: error?.response?.data?.message || error.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="page-intro">
        <div><h2>Campus Reports</h2><p>{effectiveRole === 'ADMIN' ? 'Review reported users, missions and actions. System metrics are available in Analytics.' : 'Report a user, mission, or action for campus review.'}</p></div>
        {canCreate && <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New report</button>}
      </div>

      <section className="report-queue">
        <div className="report-queue-header">
          <div><Flag size={18} /><strong>{canReview ? 'Moderation report queue' : 'My reports'}</strong></div>
          <div className="filter-bar compact">
            <div className="search-field"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search reports" /></div>
            <div className="select-field"><Filter size={14} /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option><option value="OPEN">Open</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option>
            </select></div>
          </div>
        </div>
        {filtered.length === 0 ? <EmptyState icon={Flag} title="No reports found" description="There are no reports matching the current filters." /> : (
          <div className="report-list">
            {filtered.map(report => (
              <article className="report-row" key={report.id}>
                <div className="report-type">{report.targetType}</div>
                <div className="report-main">
                  <strong>{targetLabels.get(report.targetId)?.title || report.targetId}</strong>
                  <p>{report.reason}</p>
                  <small>{new Date(report.createdAt).toLocaleString()} {report.reporterStudentId ? `by ${report.reporterStudentId}` : ''} | ID: {report.targetId}</small>
                </div>
                <span className={`badge ${report.status === 'OPEN' ? 'badge-pending' : report.status === 'ACCEPTED' ? 'badge-accepted' : 'badge-rejected'}`}>{report.status}</span>
                {report.evidenceUrl && <a className="btn btn-ghost btn-icon" href={report.evidenceUrl} target="_blank" rel="noreferrer" title="View evidence"><ExternalLink size={15} /></a>}
                {canReview && report.status === 'OPEN' && (
                  <div className="report-actions">
                    <button className="btn btn-sm btn-primary" onClick={() => review(report, 'ACCEPTED')}>Accept</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => review(report, 'REJECTED')}>Reject</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create campus report"
        titleIcon={<Flag size={18} color="var(--color-warning)" />}
        size="lg"
        footer={<><button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={!form.targetId.trim() || !form.reason.trim()}>Review report</button></>}
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Target type</label>
            <select className="form-select" value={form.targetType} onChange={event => setForm(current => ({ ...current, targetType: event.target.value }))}>
              {targetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Report target</label>
            <div className="search-field target-picker-search">
              <Search size={15} />
              <input value={targetQuery} onChange={event => setTargetQuery(event.target.value)} placeholder={`Search ${form.targetType.toLowerCase()} by name, email, title, or code`} />
            </div>
          </div>
        </div>
        <div className="target-picker-list">
          {targetsLoading && <div className="target-picker-empty">Loading targets...</div>}
          {!targetsLoading && filteredTargets.length === 0 && <div className="target-picker-empty">No matching target found.</div>}
          {!targetsLoading && filteredTargets.map(item => (
            <button
              key={item.id}
              type="button"
              className={`target-picker-item${form.targetId === item.id ? ' selected' : ''}`}
              onClick={() => setForm(current => ({ ...current, targetId: item.id }))}
            >
              <img src={item.avatarUrl || '/logo.png'} alt="" />
              <span><strong>{item.title}</strong><small>{item.subtitle || item.id}</small></span>
            </button>
          ))}
        </div>
        <div className="form-group">
          <label className="form-label">Reason</label>
          <textarea className="form-input" rows={4} value={form.reason} onChange={event => setForm(current => ({ ...current, reason: event.target.value }))} placeholder="Describe the issue clearly and objectively" />
        </div>
        <div className="report-evidence-upload">
          <FileImage size={20} />
          <div><strong>Supporting evidence</strong><span>{form.evidenceUrl ? 'File uploaded and stored by Report service.' : 'PNG, JPG, WebP, GIF, or PDF up to 5MB.'}</span></div>
          <label className="btn btn-outline btn-sm"><Upload size={14} /> {uploading ? 'Uploading...' : 'Choose file'}<input type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={uploadEvidence} disabled={uploading} /></label>
        </div>
      </Modal>
    </div>
  );
}
