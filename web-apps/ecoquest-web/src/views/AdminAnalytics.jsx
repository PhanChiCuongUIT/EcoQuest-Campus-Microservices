import React, { useEffect, useState } from 'react';
import AsyncBanner from '../components/AsyncBanner.jsx';
import { Award, BarChart3, Download, Leaf, Search, Shield, Target, Users, Zap } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import { AreaChart, ColumnChart, DonutChart } from '../components/DashboardCharts.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  downloadReportAnalytics,
  getManagedMissions,
  getReportAnalyticsSeries,
  getReportAnalyticsSummary,
  getStudentAnalytics,
  getStudentAnalyticsOutcomes,
  getUsers,
} from '../api/ecoquestApi.js';

const PERIODS = ['weekly', 'monthly', 'yearly'];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const DATE_FORMATTER = new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' });
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getIsoWeek = (date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
};
const CURRENT_WEEK = getIsoWeek(new Date());
const maxIsoWeek = (year) => getIsoWeek(new Date(year, 11, 28));
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, index) => CURRENT_YEAR - index);

const formatBucketRange = (row) => {
  if (!row?.from || !row?.to) return '-';
  const from = new Date(row.from);
  const to = new Date(row.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '-';
  to.setDate(to.getDate() - 1);
  return `${DATE_FORMATTER.format(from)} - ${DATE_FORMATTER.format(to)}`;
};

export default function AdminAnalytics() {
  const toast = useToast();
  const [period, setPeriod] = useState('weekly');
  const [seriesPeriod, setSeriesPeriod] = useState('weekly');
  const [seriesYear, setSeriesYear] = useState(CURRENT_YEAR);
  const [fromWeek, setFromWeek] = useState(Math.max(1, CURRENT_WEEK - 3));
  const [toWeek, setToWeek] = useState(CURRENT_WEEK);
  const [fromMonth, setFromMonth] = useState(Math.max(1, CURRENT_MONTH - 2));
  const [toMonth, setToMonth] = useState(CURRENT_MONTH);
  const [fromYear, setFromYear] = useState(CURRENT_YEAR - 2);
  const [toYear, setToYear] = useState(CURRENT_YEAR);
  const [selectedBucketKey, setSelectedBucketKey] = useState('');
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState(null);
  const [trend, setTrend] = useState([]);
  const [missions, setMissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [studentId, setStudentId] = useState('SV001');
  const [student, setStudent] = useState(null);
  const [studentMode, setStudentMode] = useState('all');
  const [studentOutcomes, setStudentOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const maxWeek = seriesYear === CURRENT_YEAR ? CURRENT_WEEK : maxIsoWeek(seriesYear);
  const maxMonth = seriesYear === CURRENT_YEAR ? CURRENT_MONTH : 12;
  const rangeInvalid = seriesPeriod === 'weekly'
    ? fromWeek > toWeek || toWeek > maxWeek
    : seriesPeriod === 'monthly'
      ? fromMonth > toMonth || toMonth > maxMonth
      : fromYear > toYear || toYear > CURRENT_YEAR;
  const seriesOptions = () => {
    if (seriesPeriod === 'weekly') return { year: seriesYear, fromWeek, toWeek };
    if (seriesPeriod === 'monthly') return { year: seriesYear, fromMonth, toMonth };
    return { fromYear, toYear };
  };
  const studentRangeOptions = () => ({ period: seriesPeriod, ...seriesOptions() });

  useEffect(() => {
    if (seriesPeriod === 'weekly') {
      const allowed = seriesYear === CURRENT_YEAR ? CURRENT_WEEK : maxIsoWeek(seriesYear);
      setFromWeek(value => Math.min(value, allowed));
      setToWeek(value => Math.min(Math.max(value, fromWeek), allowed));
    }
    if (seriesPeriod === 'monthly') {
      const allowed = seriesYear === CURRENT_YEAR ? CURRENT_MONTH : 12;
      setFromMonth(value => Math.min(value, allowed));
      setToMonth(value => Math.min(Math.max(value, fromMonth), allowed));
    }
    setFromYear(value => Math.min(value, CURRENT_YEAR));
    setToYear(value => Math.min(Math.max(value, fromYear), CURRENT_YEAR));
  }, [seriesPeriod, seriesYear, fromWeek, fromMonth, fromYear]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getReportAnalyticsSummary(period),
      Promise.all(PERIODS.map(item => getReportAnalyticsSummary(item))),
      getManagedMissions(),
      getUsers(),
    ]).then(([current, summaries, missionList, userList]) => {
      setSummary(current);
      setTrend(PERIODS.map((label, index) => ({ label, value: summaries[index]?.submittedActions ?? 0 })));
      setMissions(Array.isArray(missionList) ? missionList : []);
      setUsers(Array.isArray(userList) ? userList : []);
    }).finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    if (rangeInvalid) return;
    getReportAnalyticsSeries(seriesPeriod, {
      ...seriesOptions(),
    }).then(setSeries).catch(() => setSeries(null));
  }, [seriesPeriod, seriesYear, fromWeek, toWeek, fromMonth, toMonth, fromYear, toYear, rangeInvalid]);

  useEffect(() => {
    if (rangeInvalid) return;
    getStudentAnalyticsOutcomes(studentRangeOptions()).then(setStudentOutcomes).catch(() => setStudentOutcomes([]));
    if (studentMode === 'single' && studentId) {
      getStudentAnalytics(studentId, studentRangeOptions()).then(setStudent).catch(() => setStudent(null));
    }
  }, [seriesPeriod, seriesYear, fromWeek, toWeek, fromMonth, toMonth, fromYear, toYear, rangeInvalid, studentMode, studentId]);

  useEffect(() => {
    const rows = series?.buckets || [];
    const makeKey = (row) => `${seriesPeriod}:${row?.label || ''}`;
    if (!rows.length) {
      setSelectedBucketKey('');
      return;
    }
    if (!rows.some(row => makeKey(row) === selectedBucketKey)) {
      const firstWithData = rows.find(row =>
        row.submittedActions || row.missionsCreated || row.usersRegistered
        || row.totalPoints || row.badgesGranted || row.certificatesIssued || row.openReports
      );
      setSelectedBucketKey(makeKey(firstWithData || rows[0]));
    }
  }, [series, seriesPeriod, selectedBucketKey]);

  const lookup = async () => {
    if (!studentId.trim()) return;
    try { setStudent(await getStudentAnalytics(studentId.trim(), studentRangeOptions())); }
    catch { setStudent(null); }
  };

  const exportPdf = async () => {
    const options = exportOptionsForBucket();
    if (!options) {
      toast({ type: 'error', message: 'Select a reporting period first' });
      return;
    }
    setExporting(true);
    try {
      await downloadReportAnalytics(seriesPeriod, options);
      toast({ type: 'success', message: 'Analytics PDF export started' });
    } catch {
      toast({ type: 'error', message: 'Could not export analytics PDF' });
    } finally {
      setExporting(false);
    }
  };

  const userRows = ['STUDENT', 'MODERATOR', 'ADMIN'].map(role => ({
    label: role,
    value: users.filter(user => user.role === role).length,
  }));
  const missionRows = ['ACTIVE', 'PENDING', 'REJECTED', 'CANCELLED', 'COMPLETED'].map(status => ({
    label: status,
    value: missions.filter(mission => mission.status === status).length,
  }));
  const actionRows = [
    { label: 'Accepted', value: summary?.acceptedActions ?? 0, color: '#1c7c54' },
    { label: 'Rejected', value: summary?.rejectedActions ?? 0, color: '#d45d5d' },
  ];
  const studentNameById = React.useMemo(() => {
    const map = new Map();
    users.forEach(account => {
      if (account.studentId) map.set(account.studentId, account.displayName || account.studentId);
    });
    return map;
  }, [users]);
  const studentOptions = users.filter(account => account.studentId && account.role !== 'ADMIN');
  const seriesRows = series?.buckets || [];
  const selectedBucketIndex = Math.max(0, seriesRows.findIndex(row => `${seriesPeriod}:${row.label}` === selectedBucketKey));
  const selectedBucket = seriesRows[selectedBucketIndex] || null;
  const exportOptionsForBucket = () => {
    if (!selectedBucket) return null;
    if (seriesPeriod === 'weekly') {
      const match = selectedBucket.label.match(/^W(\d{2})\s+(\d{4})$/);
      if (!match) return null;
      return { year: Number(match[2]), week: Number(match[1]) };
    }
    if (seriesPeriod === 'monthly') {
      return { year: seriesYear, month: selectedBucketIndex + 1 };
    }
    return { year: Number(selectedBucket.label) };
  };
  const seriesChartRows = seriesRows
    .filter(row => row.submittedActions || row.missionsCreated || row.usersRegistered || row.totalPoints)
    .slice(-12)
    .map(row => ({ label: row.label, value: row.submittedActions }));

  return (
    <div>
      <div className="page-intro">
        <div><h2>System Analytics</h2><p>Independent Report-service read models for campus activity, users, missions and student outcomes.</p></div>
        <div className="analytics-toolbar">
          <div className="segmented-control">
            {PERIODS.map(item => <button key={item} className={period === item ? 'active' : ''} onClick={() => setPeriod(item)}>{item}</button>)}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={<Target size={18} />} label="Submitted Actions" value={summary?.submittedActions ?? 0} sub={period} />
        <StatCard icon={<Leaf size={18} />} label="Missions Created" value={summary?.missionsCreated ?? 0} sub={period} />
        <StatCard icon={<Users size={18} />} label="Users Registered" value={summary?.usersRegistered ?? 0} sub={period} />
        <StatCard icon={<Zap size={18} />} label="Points Granted" value={summary?.totalPoints ?? 0} sub={period} />
        <StatCard icon={<Shield size={18} />} label="Badges Granted" value={summary?.badgesGranted ?? 0} sub={period} />
        <StatCard icon={<Award size={18} />} label="Certificates" value={summary?.certificatesIssued ?? 0} sub={period} />
      </div>

      <div className={`dashboard-visual-grid${loading ? ' is-loading' : ''}`}>
        <DonutChart title="Action outcomes" rows={actionRows} centerLabel="Actions" />
        <ColumnChart title="Users by role" rows={userRows} />
        <ColumnChart title="Mission lifecycle" rows={missionRows} />
        <AreaChart title="Activity by reporting window" rows={trend} valueLabel="Submitted actions" />
      </div>

      <section className="card analytics-series-panel">
        <div className="card-header">
          <div>
            <h3 className="card-title">Official reporting periods</h3>
            <p className="muted-copy">Choose a past week, month or year below, then export the single-period PDF report layout.</p>
          </div>
          <div className="analytics-toolbar">
            <div className="segmented-control">
              {PERIODS.map(item => <button key={item} className={seriesPeriod === item ? 'active' : ''} onClick={() => setSeriesPeriod(item)}>{item}</button>)}
            </div>
            {seriesPeriod !== 'yearly' ? (
              <>
                <select className="form-select" value={seriesYear} onChange={event => setSeriesYear(Number(event.target.value))}>
                  {YEAR_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                {seriesPeriod === 'weekly' ? (
                  <>
                    <select className="form-select compact-select" value={fromWeek} onChange={event => setFromWeek(Number(event.target.value))}>
                      {Array.from({ length: maxWeek }, (_, index) => index + 1).map(week => <option key={week} value={week}>From W{String(week).padStart(2, '0')}</option>)}
                    </select>
                    <select className="form-select compact-select" value={toWeek} onChange={event => setToWeek(Number(event.target.value))}>
                      {Array.from({ length: maxWeek }, (_, index) => index + 1).map(week => <option key={week} value={week}>To W{String(week).padStart(2, '0')}</option>)}
                    </select>
                  </>
                ) : (
                  <>
                    <select className="form-select compact-select" value={fromMonth} onChange={event => setFromMonth(Number(event.target.value))}>
                      {MONTH_NAMES.slice(0, maxMonth).map((month, index) => <option key={month} value={index + 1}>From {month}</option>)}
                    </select>
                    <select className="form-select compact-select" value={toMonth} onChange={event => setToMonth(Number(event.target.value))}>
                      {MONTH_NAMES.slice(0, maxMonth).map((month, index) => <option key={month} value={index + 1}>To {month}</option>)}
                    </select>
                  </>
                )}
              </>
            ) : (
              <>
                <input className="form-input year-input" type="number" max={CURRENT_YEAR} value={fromYear} onChange={event => setFromYear(Number(event.target.value))} />
                <input className="form-input year-input" type="number" min={fromYear} max={CURRENT_YEAR} value={toYear} onChange={event => setToYear(Number(event.target.value))} />
              </>
            )}
            <button className="btn btn-primary" onClick={exportPdf} disabled={exporting || !selectedBucket || rangeInvalid}>
              <Download size={16} /> {exporting ? 'Exporting...' : `Export ${selectedBucket?.label || 'Period'} PDF`}
            </button>
          </div>
        </div>
        {rangeInvalid && <AsyncBanner type="warning" message="Reporting range must be ordered and cannot include a future period." />}
        <div className="card-body">
          <AreaChart title="Submitted actions by selected periods" rows={seriesChartRows} valueLabel="Submitted actions" />
          <div className="analytics-series-table">
            <table>
              <thead><tr><th>Period</th><th>Date range</th><th>Actions</th><th>Accepted</th><th>Rejected</th><th>Points</th><th>Missions</th><th>Users</th><th>Badges</th><th>Certificates</th><th>Open reports</th></tr></thead>
              <tbody>
                {seriesRows.map(row => (
                  <tr
                    key={row.label}
                    className={`${seriesPeriod}:${row.label}` === selectedBucketKey ? 'selected' : ''}
                    onClick={() => setSelectedBucketKey(`${seriesPeriod}:${row.label}`)}
                  >
                    <td>{row.label}</td>
                    <td>{formatBucketRange(row)}</td>
                    <td>{row.submittedActions}</td>
                    <td>{row.acceptedActions}</td>
                    <td>{row.rejectedActions}</td>
                    <td>{row.totalPoints}</td>
                    <td>{row.missionsCreated}</td>
                    <td>{row.usersRegistered}</td>
                    <td>{row.badgesGranted}</td>
                    <td>{row.certificatesIssued}</td>
                    <td>{row.openReports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="analytics-grid">
        <section className="card">
          <div className="card-header"><h3 className="card-title">Top students</h3></div>
          <div className="card-body metric-list">
            {(summary?.topStudents || []).slice(0, 10).map(item => (
              <div key={item.studentId}><strong>{studentNameById.get(item.studentId) || item.studentId}</strong><span>{item.studentId} | {item.actionCount} accepted</span><b>{item.points} pts</b></div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-header"><h3 className="card-title">Action types</h3></div>
          <div className="card-body metric-list">
            {(summary?.actionTypes || []).map(item => (
              <div key={item.actionType}><strong>{item.actionType}</strong><span>{item.actionCount} actions</span><b>{item.points} pts</b></div>
            ))}
          </div>
        </section>
      </div>

      <section className="student-analytics-lookup">
        <div className="student-analytics-header">
          <div><BarChart3 size={18} /><strong>Student outcome report</strong></div>
          <div className="analytics-toolbar">
            <div className="segmented-control">
              <button className={studentMode === 'all' ? 'active' : ''} onClick={() => setStudentMode('all')}>All students</button>
              <button className={studentMode === 'single' ? 'active' : ''} onClick={() => setStudentMode('single')}>One student</button>
            </div>
            {studentMode === 'single' && (
              <>
                <div className="student-picker-field"><Search size={15} /><select value={studentId} onChange={event => setStudentId(event.target.value)}>
                  {studentOptions.map(account => <option key={account.id} value={account.studentId}>{account.displayName} ({account.studentId})</option>)}
                </select></div>
                <button className="btn btn-outline" onClick={lookup}>View student</button>
              </>
            )}
          </div>
        </div>
        {studentMode === 'single' && student && (
          <div className="student-analytics-result">
            <span><small>Actions</small><strong>{student.actionCount}</strong></span>
            <span><small>Accepted</small><strong>{student.acceptedActions}</strong></span>
            <span><small>Rejected</small><strong>{student.rejectedActions}</strong></span>
            <span><small>Points</small><strong>{student.totalPoints}</strong></span>
            <span><small>Badges</small><strong>{student.badgeCount}</strong></span>
            <span><small>Certificates</small><strong>{student.certificateCount}</strong></span>
          </div>
        )}
        {studentMode === 'all' && (
          <div className="analytics-series-table student-outcomes-table">
            <table>
              <thead><tr><th>Student</th><th>Actions</th><th>Accepted</th><th>Rejected</th><th>Points</th><th>Badges</th><th>Certificates</th><th>Reports</th></tr></thead>
              <tbody>
                {studentOutcomes.map(row => (
                  <tr key={row.studentId}>
                    <td><strong>{studentNameById.get(row.studentId) || row.studentId}</strong><small>{row.studentId}</small></td>
                    <td>{row.actionCount}</td>
                    <td>{row.acceptedActions}</td>
                    <td>{row.rejectedActions}</td>
                    <td>{row.totalPoints}</td>
                    <td>{row.badgeCount}</td>
                    <td>{row.certificateCount}</td>
                    <td>{row.reportsSubmitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
