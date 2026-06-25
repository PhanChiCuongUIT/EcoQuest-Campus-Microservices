import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Flag, ShieldCheck, Target, Users } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import {
  getManagedMissions,
  getPendingReview,
  getReportAnalyticsSummary,
  getReports,
  getUsers,
} from '../api/ecoquestApi.js';

function MiniBarChart({ title, rows, empty = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map(row => Number(row.value) || 0));
  return (
    <div className="mini-chart-card">
      <div className="mini-chart-header">
        <strong>{title}</strong>
      </div>
      <div className="mini-chart-body">
        {rows.length === 0 ? (
          <p className="muted-copy">{empty}</p>
        ) : rows.map(row => (
          <div className="mini-chart-row" key={row.label}>
            <span>{row.label}</span>
            <div className="mini-chart-track">
              <i style={{ width: `${Math.max(8, (Number(row.value) || 0) / max * 100)}%` }} />
            </div>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModeratorDashboard() {
  const [data, setData] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    reports: 0,
    missions: [],
  });

  useEffect(() => {
    Promise.all([getPendingReview(), getReports('OPEN'), getManagedMissions()])
      .then(([actions, reports, missions]) => {
        const actionList = Array.isArray(actions) ? actions : [];
        const reportList = Array.isArray(reports) ? reports : [];
        const missionList = Array.isArray(missions) ? missions : [];
        setData({
          pending: actionList.filter(item => item.status === 'PENDING_REVIEW').length,
          accepted: actionList.filter(item => item.status === 'ACCEPTED').length,
          rejected: actionList.filter(item => item.status === 'REJECTED').length,
          reports: reportList.length,
          missions: missionList,
        });
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

  return (
    <div>
      <div className="panel-context">
        <strong>Moderator panel</strong>
        <span>Review evidence, handle reports, and manage the missions you created without exposing student-only pages.</span>
      </div>
      <div className="stats-grid stats-grid-compact">
        <StatCard icon={<ShieldCheck size={18} />} label="Actions to Review" value={data.pending}
          iconBg="var(--color-warning-bg)" iconColor="var(--color-warning)" />
        <StatCard icon={<Flag size={18} />} label="Open Reports" value={data.reports}
          iconBg="var(--color-danger-bg)" iconColor="var(--color-danger)" />
        <StatCard icon={<Target size={18} />} label="My Missions" value={data.missions.length}
          sub={`${data.missions.filter(m => m.status === 'PENDING').length} pending approval`}
          iconBg="var(--color-primary-light)" iconColor="var(--color-primary)" />
      </div>
      <div className="dashboard-chart-grid">
        <MiniBarChart
          title="Review queue status"
          rows={[
            { label: 'Pending', value: data.pending },
            { label: 'Accepted', value: data.accepted },
            { label: 'Rejected', value: data.rejected },
          ]}
        />
        <MiniBarChart title="My mission status" rows={missionRows} />
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
  });

  useEffect(() => {
    Promise.all([
      getUsers(),
      getPendingReview(),
      getReports('OPEN'),
      getManagedMissions(),
      getReportAnalyticsSummary('monthly'),
    ]).then(([users, actions, reports, missions, analytics]) => {
      const userList = Array.isArray(users) ? users : [];
      const actionList = Array.isArray(actions) ? actions : [];
      const reportList = Array.isArray(reports) ? reports : [];
      const missionList = Array.isArray(missions) ? missions : [];
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
      <div className="dashboard-chart-grid">
        <MiniBarChart title="Users by role" rows={userRows} />
        <MiniBarChart title="Mission lifecycle" rows={missionRows} />
        <MiniBarChart
          title="Monthly action outcomes"
          rows={[
            { label: 'Accepted', value: data.accepted },
            { label: 'Rejected', value: data.rejected },
            { label: 'Pending', value: data.pending },
          ]}
        />
        <MiniBarChart
          title="Action types"
          rows={data.actionTypes.map(item => ({
            label: item.actionType || item.type || 'Action',
            value: item.actionCount ?? item.count ?? 0,
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
