import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import StationScanner from '../components/StationScanner.jsx';
import { scanStation } from '../api/ecoquestApi.js';

export default function Stations({ initialToken }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    if (initialToken) scanStation(initialToken).then(r => { if (!disposed) setResult(r); }).catch(() => { if (!disposed) setError('Station QR not found.'); });
    return () => { disposed = true; };
  }, [initialToken]);
  return <section><h2>Station lookup</h2><StationScanner onScanned={r => { setResult(r); setError(''); }} />
    {error && <p role="alert">{error}</p>}
    {result && <div className="station-result">
      <div className="station-summary">
        {result.station.imageUrl && <img className="station-photo" src={result.station.imageUrl} alt={result.station.name} />}
        <div><h3>{result.station.name}</h3><p className="station-location"><MapPin size={16} /> {result.station.location}</p>
          <p className="text-muted">{(result.station.stationType || 'Station').replaceAll('_', ' ')}</p>
          <span className={`badge ${result.station.active ? 'badge-success' : 'badge-neutral'}`}>{result.station.active ? 'Active' : 'Unavailable'}</span>
        </div>
      </div>
      <h3>Missions at this station</h3>
      {!result.missions.length && <p>No active missions at this station.</p>}
      <ul>{result.missions.map(m => <li key={m.id}><strong>{m.title}</strong><p>{m.description}</p><span>{m.basePoints} points</span></li>)}</ul>
    </div>}
  </section>;
}
