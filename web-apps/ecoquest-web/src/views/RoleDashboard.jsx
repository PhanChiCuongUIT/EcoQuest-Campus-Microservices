import React, { useEffect, useState } from 'react';
import { Activity, Flag, ShieldCheck, Users } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import {
  getManagedMissions,
  getPendingReview,
  getReportAnalyticsSummary,
  getReports,
  getUsers,
} from '../api/ecoquestApi.js';

export function ModeratorDashboard({ studentId, onSubmitMission }) {
  const [reviewCount, setReviewCount] = useState(0);
  const [openReports, setOpenReports] = useState(0);

  useEffect(() => {
    Promise.all([getPendingReview(), getReports('OPEN')])
      .then(([actions, reports]) => {
        const actionList = Array.isArray(actions) ? actions : [];
        const reportList = Array.isArray(reports) ? reports : [];
        setReviewCount(actionList.filter(item => item.status === 'PENDING_REVIEW').length);
        setOpenReports(reportList.length);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="panel-context">
        <strong>Moderator panel</strong>
        <span>Your student activity remains available below, with moderation work summarized here.</span>
      </div>
      <div className="stats-grid stats-grid-compact">
        <StatCard icon={<ShieldCheck size={18} />} label="Actions to Review" value={reviewCount}
          iconBg="var(--color-warning-bg)" iconColor="var(--color-warning)" />
        <StatCard icon={<Flag size={18} />} label="Open Reports" value={openReports}
          iconBg="var(--color-danger-bg)" iconColor="var(--color-danger)" />
      </div>
      <StudentDashboard studentId={studentId} onSubmitMission={onSubmitMission} featuredOnly />
    </div>
  );
}

export function AdminDashboard() {
  const [data, setData] = useState({ users: 0, pending: 0, reports: 0, missions: 0, accepted: 0, points: 0 });

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
        users: userList.length,
        pending: actionList.filter(item => item.status === 'PENDING_REVIEW').length,
        reports: reportList.length,
        missions: missionList.length,
        accepted: analytics?.acceptedActions || 0,
        points: analytics?.totalPoints || 0,
      });
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="panel-context">
        <strong>Administration panel</strong>
        <span>System operations, moderation workload, and monthly sustainability activity.</span>
      </div>
      <div className="stats-grid">
        <StatCard icon={<Users size={18} />} label="Registered Users" value={data.users}
          iconBg="var(--color-info-bg)" iconColor="var(--color-info)" />
        <StatCard icon={<ShieldCheck size={18} />} label="Pending Reviews" value={data.pending}
          iconBg="var(--color-warning-bg)" iconColor="var(--color-warning)" />
        <StatCard icon={<Flag size={18} />} label="Open Reports" value={data.reports}
          iconBg="var(--color-danger-bg)" iconColor="var(--color-danger)" />
        <StatCard icon={<Activity size={18} />} label="Monthly Accepted" value={data.accepted}
          sub={`${data.points} points granted`}
          iconBg="var(--color-success-bg)" iconColor="var(--color-success)" />
      </div>
      <div className="card">
        <div className="card-header"><h2 className="card-title">System snapshot</h2></div>
        <div className="card-body system-snapshot">
          <div><span>Total missions</span><strong>{data.missions}</strong></div>
          <div><span>Review workload</span><strong>{data.pending + data.reports}</strong></div>
          <div><span>Monthly points</span><strong>{data.points}</strong></div>
        </div>
      </div>
    </div>
  );
}
