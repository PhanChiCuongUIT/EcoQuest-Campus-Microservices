import React, { useEffect, useState, useCallback } from 'react';
import { Lock, RefreshCw, Save, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import AsyncBanner from '../components/AsyncBanner.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { POLICY_BASE, createPolicyRule, deletePolicyRule, getPolicyRules, updatePolicyRule } from '../api/ecoquestApi.js';

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
  const confirm = useConfirm();
  const [rules, setRules]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [editing, setEditing] = useState(null); // { actionType, form }
  const [createOpen, setCreateOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    actionType: '',
    basePoints: 10,
    evidenceRequired: true,
    stationRequired: false,
    dailyLimit: 1,
    active: true,
  });
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

  const handleCreate = async () => {
    if (!newRule.actionType.trim()) {
      toast({ type: 'error', message: 'Action type is required' });
      return;
    }
    setSaving(true);
    try {
      await createPolicyRule({ ...newRule, actionType: newRule.actionType.trim().toUpperCase() });
      toast({ type: 'success', message: `Policy created: ${newRule.actionType.trim().toUpperCase()}` });
      setNewRule({ actionType: '', basePoints: 10, evidenceRequired: true, stationRequired: false, dailyLimit: 1, active: true });
      setCreateOpen(false);
      load();
    } catch (error) {
      toast({ type: 'error', message: error.response?.data?.detail || 'Failed to create policy rule' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (rule) => {
    if (rule.active) {
      toast({ type: 'warning', message: 'Deactivate the rule before deleting it.' });
      return;
    }
    const accepted = await confirm({
      title: `Delete ${rule.actionType}?`,
      message: 'Deleted policy rules make that action type unsupported until an Admin creates the rule again.',
      confirmLabel: 'Delete rule',
      tone: 'danger',
    });
    if (!accepted) return;
    setSaving(true);
    try {
      await deletePolicyRule(rule.actionType);
      toast({ type: 'success', message: `Policy deleted: ${rule.actionType}` });
      load();
    } catch (error) {
      toast({ type: 'error', message: error.response?.data?.detail || 'Failed to delete policy rule' });
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
        <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} /> Add rule
        </button>
      </div>

      {error && <AsyncBanner type="warning" message={error} />}

      {loading ? <div className="skeleton skeleton-card" /> : (
        <div className="card policy-rules-card">
          <div className="policy-rules-intro">
            <div>
              <strong>Verification policy rules</strong>
              <span>Each rule is owned by the Policy service and used by Action through internal gRPC validation.</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> New policy rule
            </button>
          </div>
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
                            <>
                              <button className="btn btn-outline btn-sm" onClick={() => handleEdit(rule)}>
                                <Lock size={13} /> Edit
                              </button>
                              <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(rule)} disabled={rule.active || saving} title={rule.active ? 'Deactivate before deleting' : 'Delete inactive policy rule'}>
                                <Trash2 size={13} /> Delete
                              </button>
                            </>
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

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add policy rule"
        titleIcon={<Plus size={18} />}
        size="lg"
        footer={(
          <>
            <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              <Plus size={15} /> {saving ? 'Creating...' : 'Create rule'}
            </button>
          </>
        )}
      >
        <div className="policy-create-form">
          <AsyncBanner
            type="info"
            message="Create only action types that Catalog missions can reference. Delete is allowed only after a rule is inactive."
          />
          <div className="form-group">
            <label className="form-label" htmlFor="new-policy-action-type">Action type</label>
            <input
              id="new-policy-action-type"
              className="form-input"
              placeholder="REPAIR_REUSE_WORKSHOP"
              value={newRule.actionType}
              onChange={event => setNewRule(rule => ({ ...rule, actionType: event.target.value.toUpperCase().replace(/\s+/g, '_') }))}
            />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="new-policy-points">Base points</label>
              <input
                id="new-policy-points"
                type="number"
                className="form-input"
                min="0"
                value={newRule.basePoints}
                onChange={event => setNewRule(rule => ({ ...rule, basePoints: Number(event.target.value) }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-policy-limit">Daily limit</label>
              <input
                id="new-policy-limit"
                type="number"
                className="form-input"
                min="0"
                value={newRule.dailyLimit}
                onChange={event => setNewRule(rule => ({ ...rule, dailyLimit: Number(event.target.value) }))}
              />
            </div>
          </div>
          <div className="policy-toggle-grid">
            <label><span>Evidence required</span><Toggle id="new-policy-evidence" checked={newRule.evidenceRequired} onChange={value => setNewRule(rule => ({ ...rule, evidenceRequired: value }))} /></label>
            <label><span>Station required</span><Toggle id="new-policy-station" checked={newRule.stationRequired} onChange={value => setNewRule(rule => ({ ...rule, stationRequired: value }))} /></label>
            <label><span>Active now</span><Toggle id="new-policy-active" checked={newRule.active} onChange={value => setNewRule(rule => ({ ...rule, active: value }))} /></label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
