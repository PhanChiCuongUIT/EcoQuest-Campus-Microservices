import React, { useEffect, useState, useCallback } from 'react';
import { Lock, RefreshCw, Save, AlertTriangle } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import { useToast } from '../components/Toast.jsx';
import { POLICY_BASE, getPolicyRules, updatePolicyRule } from '../api/ecoquestApi.js';

function Toggle({ checked, onChange, id }) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track"><div className="toggle-thumb" /></div>
    </label>
  );
}

export default function AdminPolicy() {
  const toast = useToast();
  const [rules, setRules]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [editing, setEditing] = useState(null); // { actionType, form }
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setRules(await getPolicyRules()); }
    catch {
      setError(`Cannot reach Policy service at ${POLICY_BASE} - make sure backend is running locally.`);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = (rule) => {
    setEditing({ actionType: rule.actionType, form: { ...rule } });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updatePolicyRule(editing.actionType, editing.form);
      toast({ type: 'success', message: `Policy updated: ${editing.actionType}` });
      setEditing(null);
      load();
    } catch {
      toast({ type: 'error', message: 'Failed to update policy rule' });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="local-only-badge">
          <AlertTriangle size={12} /> LOCAL ONLY
        </span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Direct access to <code style={{ fontFamily: 'monospace', background: 'var(--color-background-alt)', padding: '1px 4px', borderRadius: 3 }}>{POLICY_BASE}/policies/rules</code> - not routed through Gateway.
        </span>
        <button className="btn btn-ghost btn-sm" onClick={load} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && <AsyncBanner type="warning" message={error} />}

      {loading ? <div className="skeleton skeleton-card" /> : (
        <div className="card">
          <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action Type</th>
                  <th>Points</th>
                  <th>Evidence Req.</th>
                  <th>Station Req.</th>
                  <th>Daily Limit</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState title="No policy rules found" /></td></tr>
                ) : rules.map(rule => {
                  const isEditing = editing?.actionType === rule.actionType;
                  return (
                    <tr key={rule.actionType}>
                      <td><span className="mono">{rule.actionType}</span></td>
                      <td>
                        {isEditing
                          ? <input type="number" className="form-input" style={{ width: 80 }} value={editing.form.basePoints}
                              onChange={e => setEditing(ed => ({ ...ed, form: { ...ed.form, basePoints: +e.target.value } }))} />
                          : <strong>{rule.basePoints}</strong>}
                      </td>
                      <td>
                        {isEditing
                          ? <Toggle id={`ev-${rule.actionType}`} checked={editing.form.evidenceRequired}
                              onChange={v => setEditing(ed => ({ ...ed, form: { ...ed.form, evidenceRequired: v } }))} />
                          : rule.evidenceRequired
                            ? <span className="badge badge-accepted">Yes</span>
                            : <span className="badge badge-neutral">No</span>}
                      </td>
                      <td>
                        {isEditing
                          ? <Toggle id={`st-${rule.actionType}`} checked={editing.form.stationRequired}
                              onChange={v => setEditing(ed => ({ ...ed, form: { ...ed.form, stationRequired: v } }))} />
                          : rule.stationRequired
                            ? <span className="badge badge-accepted">Yes</span>
                            : <span className="badge badge-neutral">No</span>}
                      </td>
                      <td>
                        {isEditing
                          ? <input type="number" className="form-input" style={{ width: 100 }} value={editing.form.dailyLimit}
                              onChange={e => setEditing(ed => ({ ...ed, form: { ...ed.form, dailyLimit: +e.target.value } }))} />
                          : rule.dailyLimit}
                      </td>
                      <td>
                        {isEditing
                          ? <Toggle id={`act-${rule.actionType}`} checked={editing.form.active}
                              onChange={v => setEditing(ed => ({ ...ed, form: { ...ed.form, active: v } }))} />
                          : rule.active
                            ? <span className="badge badge-accepted">Active</span>
                            : <span className="badge badge-rejected">Inactive</span>}
                      </td>
                      <td>
                        <div className="table-actions">
                          {isEditing ? (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                                {saving ? '…' : <><Save size={13} /> Save</>}
                              </button>
                            </>
                          ) : (
                            <button className="btn btn-outline btn-sm" onClick={() => handleEdit(rule)}>
                              <Lock size={13} /> Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
