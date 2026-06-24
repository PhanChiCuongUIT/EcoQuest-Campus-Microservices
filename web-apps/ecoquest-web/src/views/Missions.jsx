import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Leaf, Search } from 'lucide-react';
import { getMissions } from '../api/ecoquestApi.js';
import MissionCard from '../components/MissionCard.jsx';
import Modal from '../components/Modal.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { visibleMissions } from '../utils/accessRules.js';

export default function Missions({ onSubmitMission }) {
  const [missions, setMissions] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMissions()
      .then(items => setMissions(visibleMissions(items)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => missions.filter(mission => {
    const haystack = `${mission.title} ${mission.description || ''} ${mission.actionType}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (!status || mission.status === status);
  }), [missions, query, status]);

  if (loading) return <div className="skeleton skeleton-card" />;

  return (
    <div>
      <div className="page-intro">
        <div>
          <h2>Campus Missions</h2>
          <p>Browse available sustainability activities and submit evidence from the mission you choose.</p>
        </div>
        <span className="badge badge-neutral">{filtered.length} missions</span>
      </div>

      <div className="filter-bar">
        <div className="search-field">
          <Search size={16} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search missions" />
        </div>
        <div className="select-field">
          <Filter size={15} />
          <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">All visible statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Leaf} title="No missions match" description="Try another search or status filter." />
      ) : (
        <div className="mission-list-grid">
          {filtered.map(mission => (
            <div key={mission.id} onDoubleClick={() => setSelected(mission)}>
              <MissionCard mission={mission} onSubmit={onSubmitMission} />
              <button className="btn btn-ghost btn-sm mission-detail-button" onClick={() => setSelected(mission)}>
                View details
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
        titleIcon={<Leaf size={18} color="var(--color-primary)" />}
        size="lg"
        footer={selected && (
          <>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            <button
              className="btn btn-primary"
              disabled={selected.status !== 'ACTIVE'}
              onClick={() => { setSelected(null); onSubmitMission(selected); }}
            >
              Submit Action
            </button>
          </>
        )}
      >
        {selected && (
          <div className="mission-detail">
            <div className="mission-detail-meta">
              <StatusBadge status={selected.status} />
              <span className="mission-points">{selected.basePoints} pts</span>
              <code>{selected.actionType}</code>
            </div>
            <p>{selected.description || 'No additional description.'}</p>
            <dl>
              <div><dt>Evidence</dt><dd>{selected.evidenceRequired ? 'Required' : 'Optional'}</dd></div>
              <div><dt>Station check-in</dt><dd>{selected.stationRequired ? 'Required' : 'Not required'}</dd></div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
