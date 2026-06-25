import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ExternalLink, FileImage, Filter, Flag, Plus, Search, Upload, UserSearch } from 'lucide-react';
import {
  createReport,
  getMyReports,
  getReportAnalyticsSummary,
  getReports,
  getStudentAnalytics,
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
  const [period, setPeriod] = useState('weekly');
  const [analytics, setAnalytics] = useState(null);
  const [studentLookup, setStudentLookup] = useState('SV001');
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const targetOptions = useMemo(() => reportTargetOptions(effectiveRole), [effectiveRole]);
  const [form, setForm] = useState({ targetType: targetOptions[0]?.[0] || 'USER', targetId: '', reason: '', evidenceUrl: '' });

  const load = () => (canReview ? getReports() : getMyReports())
    .then(items => setReports(Array.isArray(items) ? items : []))
    .catch(() => setReports([]));
  useEffect(() => { load(); }, [canReview]);
  useEffect(() => {
    setForm(current => ({ ...current, targetType: targetOptions[0]?.[0] || 'USER' }));
  }, [targetOptions]);
  useEffect(() => {
    if (effectiveRole !== 'ADMIN') return;
    getReportAnalyticsSummary(period).then(setAnalytics).catch(() => setAnalytics(null));
  }, [period, effectiveRole]);

  const filtered = useMemo(() => reports.filter(report => {
    const haystack = `${report.targetType} ${report.targetId} ${report.reason} ${report.reporterStudentId || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (!statusFilter || report.status === statusFilter);
  }), [reports, query, statusFilter]);

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
      message: `Review report about ${report.targetType.toLowerCase()} ${report.targetId}.`,
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

  const lookupStudent = async () => {
    try {
      setStudentAnalytics(await getStudentAnalytics(studentLookup.trim()));
    } catch {
      setStudentAnalytics(null);
    }
  };

  return (
    <div>
      <div className="page-intro">
        <div><h2>{effectiveRole === 'ADMIN' ? 'Reports & Analytics' : 'Campus Reports'}</h2><p>{effectiveRole === 'ADMIN' ? 'Monitor sustainability outcomes and moderation reports.' : 'Report a user, mission, or action for campus review.'}</p></div>
        {canCreate && <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> New report</button>}
      </div>

      {effectiveRole === 'ADMIN' && (
        <>
          <section className="analytics-toolbar">
            <div><BarChart3 size={18} /><strong>Activity analytics</strong></div>
            <select className="form-select" value={period} onChange={event => setPeriod(event.target.value)}>
              <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="all">All time</option>
            </select>
          </section>
          <div className="stats-grid">
            <div className="stat-card"><span>Accepted actions</span><strong>{analytics?.acceptedActions ?? 0}</strong></div>
            <div className="stat-card"><span>Rejected actions</span><strong>{analytics?.rejectedActions ?? 0}</strong></div>
            <div className="stat-card"><span>Points granted</span><strong>{analytics?.totalPoints ?? 0}</strong></div>
            <div className="stat-card"><span>Open reports</span><strong>{analytics?.openReports ?? 0}</strong></div>
            <div className="stat-card"><span>Badges granted</span><strong>{analytics?.badgesGranted ?? 0}</strong></div>
            <div className="stat-card"><span>Certificates issued</span><strong>{analytics?.certificatesIssued ?? 0}</strong></div>
          </div>
          <div className="analytics-grid">
            <section className="card">
              <div className="card-header"><h3 className="card-title">Top students</h3></div>
              <div className="card-body metric-list">
                {(analytics?.topStudents || []).slice(0, 8).map(student => (
                  <div key={student.studentId}><strong>{student.studentId}</strong><span>{student.actionCount} actions</span><b>{student.points} pts</b></div>
                ))}
                {!analytics?.topStudents?.length && <p className="muted-copy">No activity for this period.</p>}
              </div>
            </section>
            <section className="card">
              <div className="card-header"><h3 className="card-title">Mission action types</h3></div>
              <div className="card-body metric-list">
                {(analytics?.actionTypes || []).map(metric => (
                  <div key={metric.actionType}><strong>{metric.actionType}</strong><span>{metric.actionCount} actions</span><b>{metric.points} pts</b></div>
                ))}
              </div>
            </section>
          </div>
          <section className="student-analytics-lookup">
            <div><UserSearch size={18} /><strong>Student activity report</strong></div>
            <div className="search-field"><Search size={15} /><input value={studentLookup} onChange={event => setStudentLookup(event.target.value.toUpperCase())} placeholder="Student ID" /></div>
            <button className="btn btn-outline" onClick={lookupStudent}>View report</button>
            {studentAnalytics && (
              <div className="student-analytics-result">
                <span><small>Actions</small><strong>{studentAnalytics.actionCount}</strong></span>
                <span><small>Accepted</small><strong>{studentAnalytics.acceptedActions}</strong></span>
                <span><small>Rejected</small><strong>{studentAnalytics.rejectedActions}</strong></span>
                <span><small>Points</small><strong>{studentAnalytics.totalPoints}</strong></span>
                <span><small>Badges</small><strong>{studentAnalytics.badgeCount ?? 0}</strong></span>
                <span><small>Certificates</small><strong>{studentAnalytics.certificateCount ?? 0}</strong></span>
                <span><small>Reports</small><strong>{studentAnalytics.reportsSubmitted}</strong></span>
              </div>
            )}
          </section>
        </>
      )}

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
                <div className="report-main"><strong>{report.targetId}</strong><p>{report.reason}</p><small>{new Date(report.createdAt).toLocaleString()} {report.reporterStudentId ? `by ${report.reporterStudentId}` : ''}</small></div>
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
            <label className="form-label">Target ID</label>
            <input className="form-input" value={form.targetId} onChange={event => setForm(current => ({ ...current, targetId: event.target.value }))} placeholder="Mission, user, or action ID" />
          </div>
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
