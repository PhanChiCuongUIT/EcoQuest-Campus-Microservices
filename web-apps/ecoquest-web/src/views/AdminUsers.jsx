import React, { useEffect, useMemo, useState } from 'react';
import { Ban, Filter, Search, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import { deleteBannedUser, getUsers, updateUserRole, updateUserStatus } from '../api/ecoquestApi.js';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminUsers() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRoleFilter] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = () => getUsers().then(setUsers).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => users.filter(account => {
    const text = `${account.email} ${account.displayName} ${account.studentId || ''}`.toLowerCase();
    return text.includes(query.toLowerCase())
      && (!status || account.status === status)
      && (!role || account.role === role);
  }), [users, query, status, role]);

  const changeRole = async (account, nextRole) => {
    if (account.id === user?.id) {
      toast({ type: 'warning', message: 'You cannot change your own role' });
      return;
    }
    if (account.role === nextRole) return;
    const accepted = await confirm({
      title: 'Change account role?',
      message: `${account.displayName} will receive the ${nextRole} permission set on the next login.`,
      detail: `Current role: ${account.role}`,
      confirmLabel: `Set ${nextRole}`,
      tone: 'warning',
    });
    if (!accepted) return;
    setBusyId(account.id);
    try {
      await updateUserRole(account.id, nextRole);
      await load();
      toast({ type: 'success', message: 'Role updated' });
    } finally {
      setBusyId('');
    }
  };

  const changeStatus = async (account, nextStatus) => {
    if (account.id === user?.id) {
      toast({ type: 'warning', message: 'You cannot change your own account status' });
      return;
    }
    const reason = await confirm({
      title: `${nextStatus === 'BANNED' ? 'Ban' : nextStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} account?`,
      message: `${account.displayName} will be notified by email when SMTP is enabled.`,
      inputLabel: 'Reason',
      inputPlaceholder: 'Explain why this status is being applied',
      inputRequired: true,
      confirmLabel: `Set ${nextStatus}`,
      tone: nextStatus === 'BANNED' ? 'danger' : 'warning',
    });
    if (!reason) return;
    setBusyId(account.id);
    try {
      await updateUserStatus(account.id, nextStatus, reason);
      await load();
      toast({ type: 'success', message: `Status changed to ${nextStatus}` });
    } finally {
      setBusyId('');
    }
  };

  const remove = async account => {
    if (account.id === user?.id) {
      toast({ type: 'warning', message: 'You cannot delete your own account' });
      return;
    }
    const accepted = await confirm({
      title: 'Permanently delete banned user?',
      message: `${account.email} will be removed from Identity service. This cannot be undone.`,
      confirmLabel: 'Delete user',
      tone: 'danger',
    });
    if (!accepted) return;
    setBusyId(account.id);
    try {
      await deleteBannedUser(account.id);
      await load();
      toast({ type: 'success', message: 'Banned user deleted' });
    } finally {
      setBusyId('');
    }
  };

  const activeCount = users.filter(account => account.status === 'ACTIVE').length;
  const moderatorCount = users.filter(account => account.role === 'MODERATOR').length;
  const restrictedCount = users.filter(account => account.status !== 'ACTIVE').length;

  return (
    <div>
      <div className="page-intro">
        <div><h2>User Management</h2><p>Manage campus access, role inheritance, and account restrictions.</p></div>
        <span className="badge badge-neutral">{users.length} accounts</span>
      </div>
      <div className="stats-grid stats-grid-compact">
        <div className="stat-card"><span>Active</span><strong>{activeCount}</strong></div>
        <div className="stat-card"><span>Moderators</span><strong>{moderatorCount}</strong></div>
        <div className="stat-card"><span>Restricted</span><strong>{restrictedCount}</strong></div>
      </div>
      <div className="filter-bar">
        <div className="search-field"><Search size={16} /><input placeholder="Search name, email, student ID" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <div className="select-field"><Filter size={15} /><select value={role} onChange={event => setRoleFilter(event.target.value)}>
          <option value="">All roles</option><option value="STUDENT">Student</option><option value="MODERATOR">Moderator</option><option value="ADMIN">Admin</option>
        </select></div>
        <div className="select-field"><select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BANNED">Banned</option>
        </select></div>
      </div>
      {filtered.length === 0 ? <EmptyState icon={Users} title="No matching users" description="Change the current search or filters." /> : (
        <div className="user-management-list">
          {filtered.map(account => (
            <article className={`user-management-row${account.id === user?.id ? ' is-self' : ''}`} key={account.id}>
              <img src={account.avatarUrl || '/logo.png'} alt="" />
              <div className="user-management-identity">
                <strong>{account.displayName}</strong><span>{account.email}</span><code>{account.studentId || 'No student ID'}</code>
              </div>
              <div className="user-management-state">
                <span className={`badge ${account.status === 'ACTIVE' ? 'badge-accepted' : account.status === 'BANNED' ? 'badge-rejected' : 'badge-pending'}`}>{account.status}</span>
                <span className="badge badge-info">{account.role}</span>
              </div>
              <div className="user-management-actions">
                <label>
                  <UserCog size={15} />
                  <select value={account.role} onChange={event => changeRole(account, event.target.value)} disabled={busyId === account.id || account.id === user?.id}>
                    <option value="STUDENT">Student</option><option value="MODERATOR">Moderator</option><option value="ADMIN">Admin</option>
                  </select>
                </label>
                {account.id === user?.id && <span className="badge badge-neutral">Current admin</span>}
                {account.id !== user?.id && account.status !== 'ACTIVE' && <button className="btn btn-sm btn-outline" onClick={() => changeStatus(account, 'ACTIVE')}><ShieldCheck size={14} /> Activate</button>}
                {account.id !== user?.id && account.status === 'ACTIVE' && <button className="btn btn-sm btn-outline" onClick={() => changeStatus(account, 'INACTIVE')}>Inactive</button>}
                {account.id !== user?.id && account.status !== 'BANNED' && <button className="btn btn-sm btn-outline-danger" onClick={() => changeStatus(account, 'BANNED')}><Ban size={14} /> Ban</button>}
                {account.id !== user?.id && account.status === 'BANNED' && <button className="btn btn-sm btn-danger" onClick={() => remove(account)}><Trash2 size={14} /> Delete</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
