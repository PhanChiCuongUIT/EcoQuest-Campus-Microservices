import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Flag, ShieldCheck, Target, Users } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import { AreaChart, ColumnChart, DonutChart } from '../components/DashboardCharts.jsx';
import {
  getManagedMissions,
  getPendingReview,
  getReportAnalyticsSummary,
  getReports,
  getUsers,
} from '../api/ecoquestApi.js';

function dateTrend(items, dateField, days = 7) {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (days - index - 1));
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return {
      label: day.toLocaleDateString([], { weekday: 'short' }),
      value: items.filter(item => {
        const value = new Date(item?.[dateField]);
        return Number.isFinite(value.getTime()) && value >= day && value < next;
      }).length,
    };
  });
}

export function ModeratorDashboard() {
  const [data, setData] = useState({
    actions: [],
    reports: 0,
    missions: [],
  });

  useEffect(() => {
    Promise.allSettled([getPendingReview(), getReports('OPEN'), getManagedMissions()])
      .then(([actions, reports, missions]) => {
        const actionList = actions.status === 'fulfilled' && Array.isArray(actions.value) ? actions.value : [];
        const reportList = reports.status === 'fulfilled' && Array.isArray(reports.value) ? reports.value : [];
        const missionList = missions.status === 'fulfilled' && Array.isArray(missions.value) ? missions.value : [];
        setData({ actions: actionList, reports: reportList.length, missions: missionList });
      })
      .catch(() => {});
  }, []);

  const missionRows = useMemo(() => {
    const grouped = data.missions.reduce((acc, mission) => {
      const status = mission.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [data.missions]);
  const reviewRows = [
    { label: 'Pending', value: data.actions.filter(item => item.status === 'PENDING_REVIEW').length, color: '#e0a526' },
    { label: 'Accepted', value: data.actions.filter(item => item.status === 'ACCEPTED').length, color: '#1c7c54' },
    { label: 'Rejected', value: data.actions.filter(item => item.status === 'REJECTED').length, color: '#d45d5d' },
  ];
  const pending = reviewRows[0].value;

  return (
    <div>
      <div className="panel-context">
        <strong>Moderator panel</strong>
        <span>Review evidence, handle reports, and manage the missions you created without exposing student-only pages.</span>
      </div>
      <div className="stats-grid stats-grid-compact">
        <StatCard icon={<ShieldCheck size={18} />} label="Actions to Review" value={pending}
          iconBg="var(--color-warning-bg)" iconColor="var(--color-warning)" />
        <StatCard icon={<Flag size={18} />} label="Open Reports" value={data.reports}
          iconBg="var(--color-danger-bg)" iconColor="var(--color-danger)" />
        <StatCard icon={<Target size={18} />} label="My Missions" value={data.missions.length}
          sub={`${data.missions.filter(m => m.status === 'PENDING').length} pending approval`}
          iconBg="var(--color-primary-light)" iconColor="var(--color-primary)" />
      </div>
      <div className="dashboard-visual-grid">
        <DonutChart title="Review decisions" rows={reviewRows} centerLabel="Reviews" />
        <ColumnChart title="My mission lifecycle" rows={missionRows} />
        <AreaChart
          title="Seven-day review workload"
          rows={dateTrend(data.actions, 'submittedAt')}
          valueLabel="Submissions entering review"
        />
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState({
    users: [],
    pending: 0,
    reports: 0,
    missions: [],
    accepted: 0,
    rejected: 0,
    points: 0,
    certificates: 0,
    badges: 0,
    actionTypes: [],
    summaries: [],
  });

  useEffect(() => {
    Promise.allSettled([
      getUsers(),
      getPendingReview(),
      getReports('OPEN'),
      getManagedMissions(),
      Promise.allSettled(['weekly', 'monthly', 'yearly'].map(period => getReportAnalyticsSummary(period))),
    ]).then(([users, actions, reports, missions, summaries]) => {
      const userList = users.status === 'fulfilled' && Array.isArray(users.value) ? users.value : [];
      const actionList = actions.status === 'fulfilled' && Array.isArray(actions.value) ? actions.value : [];
      const reportList = reports.status === 'fulfilled' && Array.isArray(reports.value) ? reports.value : [];
      const missionList = missions.status === 'fulfilled' && Array.isArray(missions.value) ? missions.value : [];
      const summaryValues = summaries.status === 'fulfilled'
        ? summaries.value.map(result => result.status === 'fulfilled' ? result.value : {})
        : [{}, {}, {}];
      const analytics = summaryValues[1] || {};
      setData({
        users: userList,
        pending: actionList.filter(item => item.status === 'PENDING_REVIEW').length,
        reports: reportList.length,
        missions: missionList,
        accepted: analytics?.acceptedActions || 0,
        rejected: analytics?.rejectedActions || 0,
        points: analytics?.totalPoints || 0,
        certificates: analytics?.certificatesIssued ?? 0,
        badges: analytics?.badgesGranted ?? 0,
        actionTypes: analytics?.actionTypes || [],
        summaries: summaryValues,
      });
    }).catch(() => {});
  }, []);

  const userRows = useMemo(() => {
    const grouped = data.users.reduce((acc, user) => {
      const role = user.role || 'UNKNOWN';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [data.users]);

  const missionRows = useMemo(() => {
    const grouped = data.missions.reduce((acc, mission) => {
      const status = mission.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [data.missions]);

  return (
    <div>
      <div className="panel-context">
        <strong>Administration panel</strong>
        <span>System operations, moderation workload, and monthly sustainability activity.</span>
      </div>
      <div className="stats-grid">
        <StatCard icon={<Users size={18} />} label="Registered Users" value={data.users.length}
          iconBg="var(--color-info-bg)" iconColor="var(--color-info)" />
        <StatCard icon={<ShieldCheck size={18} />} label="Pending Reviews" value={data.pending}
          iconBg="var(--color-warning-bg)" iconColor="var(--color-warning)" />
        <StatCard icon={<Flag size={18} />} label="Open Reports" value={data.reports}
          iconBg="var(--color-danger-bg)" iconColor="var(--color-danger)" />
        <StatCard icon={<Activity size={18} />} label="Monthly Accepted" value={data.accepted}
          sub={`${data.points} points granted`}
          iconBg="var(--color-success-bg)" iconColor="var(--color-success)" />
      </div>
      <div className="dashboard-visual-grid">
        <DonutChart
          title="Monthly action outcomes"
          centerLabel="Actions"
          rows={[
            { label: 'Accepted', value: data.accepted, color: '#1c7c54' },
            { label: 'Rejected', value: data.rejected, color: '#d45d5d' },
            { label: 'Pending', value: data.pending, color: '#e0a526' },
          ]}
        />
        <ColumnChart title="Users by role" rows={userRows} />
        <ColumnChart title="Mission lifecycle" rows={missionRows} />
        <AreaChart
          title="Sustainability activity"
          valueLabel="Submitted actions by reporting window"
          rows={['Weekly', 'Monthly', 'Yearly'].map((label, index) => ({
            label,
            value: data.summaries[index]?.submittedActions ?? 0,
          }))}
        />
      </div>
      <div className="card">
        <div className="card-header"><h2 className="card-title">System snapshot</h2></div>
        <div className="card-body system-snapshot">
          <div><span>Total missions</span><strong>{data.missions.length}</strong></div>
          <div><span>Review workload</span><strong>{data.pending + data.reports}</strong></div>
          <div><span>Monthly points</span><strong>{data.points}</strong></div>
          <div><span>Certificates</span><strong>{data.certificates}</strong></div>
          <div><span>Badges granted</span><strong>{data.badges}</strong></div>
          <div><span>Open reports</span><strong>{data.reports}</strong></div>
        </div>
      </div>
    </div>
  );
}
