import React from 'react';
import { Camera, MapPin, PlusCircle } from 'lucide-react';
import { canSubmitMission } from '../utils/accessRules.js';

export default function MissionCard({ mission, onSubmit }) {
  const { title, actionType, basePoints, evidenceRequired, stationRequired, description } = mission;
  const canSubmit = canSubmitMission(mission);

  return (
    <div className="mission-card">
      <div className="mission-card-icon" aria-hidden="true">
        <PlusCircle size={20} />
      </div>
      <div className="mission-card-content">
        <div className="mission-card-title">{title}</div>
        <div className="mission-card-type">{actionType}</div>
        <div className="mission-card-meta">
          <span className="mission-points">{basePoints} pts</span>
          {mission.status && mission.status !== 'ACTIVE' && (
            <span className="mission-req-pill">{mission.status}</span>
          )}
          {evidenceRequired && (
            <span className="mission-req-pill">
              <Camera size={11} /> Evidence
            </span>
          )}
          {stationRequired && (
            <span className="mission-req-pill">
              <MapPin size={11} /> Station
            </span>
          )}
        </div>
        {description && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      <div className="mission-card-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onSubmit(mission)}
          disabled={!canSubmit}
          aria-label={`Submit ${title}`}
        >
          <PlusCircle size={14} />
          {canSubmit ? 'Submit' : 'Closed'}
        </button>
      </div>
    </div>
  );
}
