import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, History, Search, Wallet, Zap } from 'lucide-react';
import { adjustPoints, getTransactions, getUsers, getWallet } from '../api/ecoquestApi.js';
import { useToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import { canApplyPointAdjustment, projectedWalletBalance } from '../utils/workflowRules.js';

export default function AdminAdjust() {
  const toast = useToast();
  const confirm = useConfirm();
  const [studentId, setStudentId] = useState('SV001');
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState('');
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const inspect = async () => {
    if (!studentId.trim()) return;
    setLoadingWallet(true);
    try {
      const [walletData, transactionData] = await Promise.all([
        getWallet(studentId.trim()),
        getTransactions(studentId.trim()),
      ]);
      setWallet(walletData);
      setTransactions(transactionData.filter(item => item.actionType === 'ADMIN_ADJUSTMENT').slice(0, 8));
    } catch (error) {
      toast({ type: 'error', message: 'Student wallet not found', sub: error?.response?.data?.message || error.message });
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    getUsers()
      .then(items => {
        const studentAccounts = (Array.isArray(items) ? items : [])
          .filter(account => account.studentId && account.status === 'ACTIVE')
          .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        setStudents(studentAccounts);
        const firstStudent = studentAccounts.find(account => account.studentId === studentId) || studentAccounts[0];
        if (firstStudent?.studentId) {
          setStudentId(firstStudent.studentId);
        }
      })
      .catch(() => setStudents([]));
  }, []);

  useEffect(() => { inspect(); }, [studentId]);

  const handleAdjust = async () => {
    if (!studentId.trim() || points === 0 || !reason.trim()) return;
    const projected = projectedWalletBalance(wallet?.totalPoints, points);
    const accepted = await confirm({
      title: 'Apply manual point adjustment?',
      message: `${studentId} will change from ${wallet?.totalPoints ?? 0} to ${projected} points.`,
      detail: `Reason: ${reason.trim()}`,
      confirmLabel: points > 0 ? 'Grant points' : 'Deduct points',
      tone: points > 0 ? 'primary' : 'warning',
    });
    if (!accepted) return;
    setSaving(true);
    try {
      await adjustPoints(studentId.trim(), points, reason.trim());
      toast({ type: 'success', message: `${points > 0 ? 'Granted' : 'Deducted'} ${Math.abs(points)} points`, sub: 'The adjustment is stored in the reward ledger audit trail.' });
      setPoints(0);
      setReason('');
      await inspect();
    } catch (error) {
      toast({ type: 'error', message: 'Adjustment failed', sub: error?.response?.data?.message || error.message });
    } finally {
      setSaving(false);
    }
  };

  const projected = projectedWalletBalance(wallet?.totalPoints, points);
  const canApply = canApplyPointAdjustment(wallet?.totalPoints, points, reason);
  const selectedStudent = students.find(account => account.studentId === studentId);
  const filteredStudents = useMemo(() => {
    const text = studentQuery.toLowerCase().trim();
    return students.filter(account => `${account.displayName} ${account.email} ${account.studentId}`.toLowerCase().includes(text)).slice(0, 8);
  }, [students, studentQuery]);

  return (
    <div>
      <div className="page-intro">
        <div><h2>Adjust Student Points</h2><p>Correct verified mistakes or apply approved administrative bonuses with a complete audit reason.</p></div>
      </div>
      <div className="adjust-layout">
        <section className="adjust-form-panel">
          <div className="student-wallet-search">
            <div className="search-field"><Search size={16} /><input value={studentQuery} onChange={event => setStudentQuery(event.target.value)} placeholder="Search student by name, email, or student ID" /></div>
            <button className="btn btn-outline" onClick={inspect} disabled={loadingWallet}>{loadingWallet ? 'Loading...' : 'Inspect wallet'}</button>
          </div>
          <div className="target-picker-list compact">
            {filteredStudents.map(account => (
              <button
                key={account.id}
                type="button"
                className={`target-picker-item${account.studentId === studentId ? ' selected' : ''}`}
                onClick={() => {
                  setStudentId(account.studentId);
                  setStudentQuery(`${account.displayName} (${account.studentId})`);
                }}
              >
                <img src={account.avatarUrl || '/logo.png'} alt="" />
                <span><strong>{account.displayName}</strong><small>{account.email} | {account.studentId}</small></span>
              </button>
            ))}
          </div>
          <div className="adjust-balance">
            <div><Wallet size={18} /><span>{selectedStudent?.displayName || studentId}</span><strong>{wallet?.totalPoints ?? 0}</strong></div>
            <div className={points < 0 ? 'negative' : ''}><Zap size={18} /><span>Projected balance</span><strong>{projected}</strong></div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="adjust-points">Adjustment</label>
            <div className="adjust-presets">
              {[-50, -10, 10, 25, 50, 100].map(value => <button key={value} className={`btn btn-sm ${points === value ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPoints(value)}>{value > 0 ? '+' : ''}{value}</button>)}
            </div>
            <input id="adjust-points" className="form-input" type="number" value={points} onChange={event => setPoints(Number(event.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="adjust-reason">Audit reason</label>
            <textarea id="adjust-reason" className="form-input" rows={4} value={reason} onChange={event => setReason(event.target.value)} placeholder="Example: Duplicate event correction approved by sustainability office" />
          </div>
          <button className="btn btn-primary w-full" onClick={handleAdjust} disabled={saving || !canApply}>
            {points < 0 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
            {saving ? 'Applying...' : 'Review and apply adjustment'}
          </button>
          {projected < 0 && <p className="form-error">A wallet balance cannot become negative.</p>}
        </section>
        <section className="adjust-history-panel">
          <h3><History size={17} /> Recent manual adjustments</h3>
          {transactions.length === 0 && <p className="muted-copy">No manual adjustments for this student.</p>}
          {transactions.map(transaction => (
            <div className="adjust-history-item" key={transaction.id}>
              <span className={transaction.points < 0 ? 'negative' : 'positive'}>{transaction.points > 0 ? '+' : ''}{transaction.points}</span>
              <div><strong>{transaction.reason || 'Legacy adjustment'}</strong><small>{new Date(transaction.occurredOn).toLocaleString()}</small></div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
