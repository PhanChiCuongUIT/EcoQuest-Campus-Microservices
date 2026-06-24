import React, { useEffect, useState, useCallback } from 'react';
import { Settings, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import { useToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import {
  getManagedMissions, createMission, updateMission, updateMissionStatus, deleteMission,
  getStations, createStation, updateStation, uploadStationImage, deleteStation,
  getBadgeDefs, createBadgeDef, deleteBadgeDef,
} from '../api/ecoquestApi.js';

const ACTION_TYPES = [
  'RECYCLE_BOTTLE','CLEANUP_EVENT','GREEN_CHECKIN','REPORT_TRASH',
  'ENERGY_SAVING','TREE_CARE','BIKE_TO_CAMPUS','WATER_REFILL',
];
const STATION_TYPES = ['RECYCLING','REFILL','CHECKIN','GENERAL'];

// Generic toggle switch
function Toggle({ checked, onChange, id }) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track"><div className="toggle-thumb" /></div>
    </label>
  );
}

// ── Mission Tab ─────────────────────────────────────────────────
function MissionsTab({ toast }) {
  const confirm = useConfirm();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ id: '', title: '', actionType: 'RECYCLE_BOTTLE', basePoints: 10, evidenceRequired: false, stationRequired: false, description: '' });
  const [saving, setSaving]   = useState(false);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getManagedMissions()); }
    catch { toast({ type: 'error', message: 'Failed to load missions' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ id: '', title: '', actionType: 'RECYCLE_BOTTLE', basePoints: 10, evidenceRequired: false, stationRequired: false, description: '' });

  const handleSave = async () => {
    if (!form.id || !form.title) { toast({ type: 'warning', message: 'ID and Title are required' }); return; }
    const existing = items.some(item => item.id === form.id);
    const accepted = await confirm({
      title: existing ? 'Save mission changes?' : 'Create mission?',
      message: existing ? `Update ${form.title}.` : `${form.title} will start in PENDING status and require admin approval.`,
      confirmLabel: existing ? 'Save changes' : 'Create mission',
    });
    if (!accepted) return;
    setSaving(true);
    try {
      if (existing) await updateMission(form.id, form);
      else await createMission(form);
      toast({ type: 'success', message: 'Mission saved' });
      resetForm(); setShowForm(false); load();
    } catch { toast({ type: 'error', message: 'Failed to save mission' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const accepted = await confirm({
      title: 'Delete mission?',
      message: `${id} will be permanently removed from Catalog service.`,
      confirmLabel: 'Delete mission',
      tone: 'danger',
    });
    if (!accepted) return;
    try {
      await deleteMission(id);
      toast({ type: 'info', message: 'Mission deleted' });
      load();
    } catch { toast({ type: 'error', message: 'Failed to delete' }); }
  };

  const filtered = items.filter(m => (
    m.id.toLowerCase().includes(search.toLowerCase()) ||
    m.title.toLowerCase().includes(search.toLowerCase())
  ) && (!statusFilter || m.status === statusFilter));

  return (
    <div>
      <div className="flex items-center justify-between mb-4" style={{ gap: 'var(--space-3)' }}>
        <div className="flex items-center gap-2">
          <input className="form-input" style={{ maxWidth: 280 }} placeholder="Search missions…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" style={{ maxWidth: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['PENDING', 'ACTIVE', 'REJECTED', 'CANCELLED', 'COMPLETED'].map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus size={16} /> Create Mission
        </button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-header"><h3 className="card-title">New / Edit Mission</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group mb-0">
              <label className="form-label">Mission ID *</label>
              <input className="form-input" placeholder="MISSION-RECYCLE-01" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="Recycle Bottle" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Action Type</label>
              <select className="form-select" value={form.actionType} onChange={e => setForm(f => ({ ...f, actionType: e.target.value }))}>
                {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Base Points</label>
              <input className="form-input" type="number" min={0} value={form.basePoints} onChange={e => setForm(f => ({ ...f, basePoints: +e.target.value }))} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Evidence Required</label>
              <Toggle id="ev-req" checked={form.evidenceRequired} onChange={v => setForm(f => ({ ...f, evidenceRequired: v }))} />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Station Required</label>
              <Toggle id="st-req" checked={form.stationRequired} onChange={v => setForm(f => ({ ...f, stationRequired: v }))} />
            </div>
            <div className="form-group mb-0" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mission description…" />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Mission'}
            </button>
          </div>
        </div>
      )}

      {loading ? <div className="skeleton skeleton-card" /> : (
        <div className="card">
          <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Action Type</th>
                  <th>Points</th>
                  <th>Evidence</th>
                  <th>Station</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState title="No missions" /></td></tr>
                ) : filtered.map(m => (
                  <tr key={m.id}>
                    <td className="mono">{m.id}</td>
                    <td style={{ fontWeight: 500 }}>{m.title}</td>
                    <td><span className="badge badge-neutral mono">{m.actionType}</span></td>
                    <td><strong>{m.basePoints}</strong></td>
                    <td>{m.evidenceRequired ? <Check size={16} color="var(--color-success)" /> : <X size={16} color="var(--color-text-faint)" />}</td>
                    <td>{m.stationRequired ? <Check size={16} color="var(--color-success)" /> : <X size={16} color="var(--color-text-faint)" />}</td>
                    <td>
                      <select
                        className="form-select"
                        value={m.status || 'PENDING'}
                        onChange={async e => {
                          const nextStatus = e.target.value;
                          const accepted = await confirm({
                            title: 'Change mission status?',
                            message: `${m.title} will change from ${m.status} to ${nextStatus}.`,
                            confirmLabel: `Set ${nextStatus}`,
                            tone: nextStatus === 'REJECTED' || nextStatus === 'CANCELLED' ? 'warning' : 'primary',
                          });
                          if (!accepted) return;
                          try {
                            await updateMissionStatus(m.id, nextStatus);
                            toast({ type: 'success', message: `Mission status changed to ${nextStatus}` });
                            load();
                          } catch {
                            toast({ type: 'error', message: 'Failed to change mission status' });
                          }
                        }}
                      >
                        {['PENDING', 'ACTIVE', 'REJECTED', 'CANCELLED', 'COMPLETED'].map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setForm({ ...m, stationRequired: m.stationRequired ?? false }); setShowForm(true); }} aria-label="Edit"><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(m.id)} aria-label="Delete"><Trash2 size={14} color="var(--color-danger)" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stations Tab ────────────────────────────────────────────────
function StationsTab({ toast }) {
  const confirm = useConfirm();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ id: '', name: '', code: '', stationType: 'RECYCLING', location: '', active: true, imageUrl: '' });
  const [saving, setSaving]   = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getStations()); }
    catch { toast({ type: 'error', message: 'Failed to load stations' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ id: '', name: '', code: '', stationType: 'RECYCLING', location: '', active: true, imageUrl: '' });

  const handleImageFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast({ type: 'warning', message: 'Station image must be an image up to 5MB.' });
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, imageUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.id || !form.name) { toast({ type: 'warning', message: 'ID and Name are required' }); return; }
    const existing = items.some(item => item.id === form.id);
    const accepted = await confirm({
      title: existing ? 'Save station changes?' : 'Create station?',
      message: `${form.name} will be stored in Catalog service${form.imageUrl?.startsWith('data:') ? ' with its image in MinIO' : ''}.`,
      confirmLabel: existing ? 'Save changes' : 'Create station',
    });
    if (!accepted) return;
    setSaving(true);
    try {
      if (existing) await updateStation(form.id, form);
      else await createStation(form);
      if (typeof form.imageUrl === 'string' && form.imageUrl.startsWith('data:image/')) {
        await uploadStationImage(form.id, { fileName: `${form.id}.image`, dataUrl: form.imageUrl });
      }
      toast({ type: 'success', message: 'Station saved' });
      resetForm(); setShowForm(false); load();
    } catch { toast({ type: 'error', message: 'Failed to save station' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const accepted = await confirm({
      title: 'Delete station?',
      message: `${id} will be permanently removed from Catalog service.`,
      confirmLabel: 'Delete station',
      tone: 'danger',
    });
    if (!accepted) return;
    try { await deleteStation(id); toast({ type: 'info', message: 'Station deleted' }); load(); }
    catch { toast({ type: 'error', message: 'Failed to delete' }); }
  };

  const filtered = items.filter(station => {
    const haystack = `${station.id} ${station.name} ${station.code || ''} ${station.location || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (!typeFilter || station.stationType === typeFilter);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input className="form-input" style={{ maxWidth: 280 }} placeholder="Search stations..." value={search} onChange={event => setSearch(event.target.value)} />
          <select className="form-select" style={{ maxWidth: 180 }} value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
            <option value="">All station types</option>
            {STATION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus size={16} /> Create Station
        </button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-header"><h3 className="card-title">New Station</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group mb-0"><label className="form-label">Station ID *</label><input className="form-input" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="STATION-A1" /></div>
            <div className="form-group mb-0"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Station A1" /></div>
            <div className="form-group mb-0"><label className="form-label">Code</label><input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="A1" /></div>
            <div className="form-group mb-0"><label className="form-label">Type</label>
              <select className="form-select" value={form.stationType} onChange={e => setForm(f => ({ ...f, stationType: e.target.value }))}>
                {STATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group mb-0"><label className="form-label">Location</label><input className="form-input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Campus A" /></div>
            <div className="form-group mb-0"><label className="form-label">Image URL</label><input className="form-input" value={form.imageUrl || ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://... or /logo.png" /></div>
            <div className="form-group mb-0"><label className="form-label">Upload Image</label><input className="form-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageFile} /></div>
            <div className="form-group mb-0"><label className="form-label">Active</label><Toggle id="st-active" checked={form.active} onChange={v => setForm(f => ({ ...f, active: v }))} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Station'}</button>
          </div>
        </div>
      )}

      {loading ? <div className="skeleton skeleton-card" /> : (
        <div className="card">
          <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>ID</th><th>Name</th><th>Code</th><th>Type</th><th>Location</th><th>Active</th><th></th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={7}><EmptyState title="No stations" /></td></tr>
                  : filtered.map(s => (
                    <tr key={s.id}>
                      <td className="mono">{s.id}</td>
                      <td style={{ fontWeight: 500 }}>{s.name}</td>
                      <td>{s.code}</td>
                      <td><span className="badge badge-neutral">{s.stationType}</span></td>
                      <td>{s.location}</td>
                      <td>{s.active ? <Check size={16} color="var(--color-success)" /> : <X size={16} color="var(--color-text-faint)" />}</td>
                      <td><div className="table-actions"><button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setForm(s); setShowForm(true); }} aria-label="Edit"><Pencil size={14} /></button><button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(s.id)} aria-label="Delete"><Trash2 size={14} color="var(--color-danger)" /></button></div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Badges Tab ──────────────────────────────────────────────────
function BadgesTab({ toast }) {
  const confirm = useConfirm();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ code: '', name: '', description: '', requiredPoints: 1 });
  const [saving, setSaving]   = useState(false);
  const [search, setSearch] = useState('');
  const [criteriaFilter, setCriteriaFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getBadgeDefs()); }
    catch { toast({ type: 'error', message: 'Failed to load badges' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ code: '', name: '', description: '', requiredPoints: 1 });

  const handleSave = async () => {
    if (!form.code || !form.name) { toast({ type: 'warning', message: 'Code and Name are required' }); return; }
    const accepted = await confirm({
      title: 'Save badge definition?',
      message: `${form.name} will become available to the reward rules.`,
      confirmLabel: 'Save badge',
    });
    if (!accepted) return;
    setSaving(true);
    try {
      await createBadgeDef(form);
      toast({ type: 'success', message: 'Badge saved' });
      resetForm(); setShowForm(false); load();
    } catch { toast({ type: 'error', message: 'Failed to save badge' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (code) => {
    const accepted = await confirm({
      title: 'Delete badge definition?',
      message: `${code} will be removed from Catalog service.`,
      confirmLabel: 'Delete badge',
      tone: 'danger',
    });
    if (!accepted) return;
    try { await deleteBadgeDef(code); toast({ type: 'info', message: 'Badge deleted' }); load(); }
    catch { toast({ type: 'error', message: 'Failed to delete' }); }
  };

  const filtered = items.filter(badge => {
    const haystack = `${badge.code} ${badge.name} ${badge.description || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (!criteriaFilter || badge.criteriaType === criteriaFilter);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input className="form-input" style={{ maxWidth: 280 }} placeholder="Search badges..." value={search} onChange={event => setSearch(event.target.value)} />
          <select className="form-select" style={{ maxWidth: 180 }} value={criteriaFilter} onChange={event => setCriteriaFilter(event.target.value)}>
            <option value="">All criteria</option>
            <option value="POINTS">Points</option>
            <option value="ACTION_COUNT">Action count</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus size={16} /> Create Badge
        </button>
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-header"><h3 className="card-title">New Badge Definition</h3></div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group mb-0"><label className="form-label">Code *</label><input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="GREEN_STARTER" /></div>
            <div className="form-group mb-0"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Green Starter" /></div>
            <div className="form-group mb-0"><label className="form-label">Required Points</label><input className="form-input" type="number" min={0} value={form.requiredPoints} onChange={e => setForm(f => ({ ...f, requiredPoints: +e.target.value }))} /></div>
            <div className="form-group mb-0" style={{ gridColumn: '1/-1' }}><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Badge'}</button>
          </div>
        </div>
      )}

      {loading ? <div className="skeleton skeleton-card" /> : (
        <div className="card">
          <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Code</th><th>Name</th><th>Description</th><th>Required Points</th><th></th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={5}><EmptyState title="No badges" /></td></tr>
                  : filtered.map(b => (
                    <tr key={b.code}>
                      <td className="mono">{b.code}</td>
                      <td style={{ fontWeight: 500 }}>{b.name}</td>
                      <td style={{ color: 'var(--color-text-muted)', maxWidth: 240 }}>{b.description}</td>
                      <td><strong>{b.requiredPoints}</strong></td>
                      <td><div className="table-actions"><button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setForm(b); setShowForm(true); }} aria-label="Edit"><Pencil size={14} /></button><button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(b.code)} aria-label="Delete"><Trash2 size={14} color="var(--color-danger)" /></button></div></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main View ───────────────────────────────────────────────────
export default function AdminCatalog() {
  const toast = useToast();
  const [tab, setTab] = useState('missions');

  return (
    <div>
      <div className="tabs">
        {['missions', 'stations', 'badges'].map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
            aria-selected={tab === t}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'missions'  && <MissionsTab toast={toast} />}
      {tab === 'stations'  && <StationsTab toast={toast} />}
      {tab === 'badges'    && <BadgesTab   toast={toast} />}
    </div>
  );
}
