import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, ScanLine, Square, Upload } from 'lucide-react';
import { scanStation } from '../api/ecoquestApi.js';
import { stationToken } from '../utils/stationQr.js';

export default function StationScanner({ missionId, onScanned }) {
  const video = useRef(null);
  const scanner = useRef(null);
  const busy = useRef(false);
  const active = useRef(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  useEffect(() => { active.current = true; return () => { active.current = false; scanner.current?.destroy(); }; }, []);
  const stop = () => { scanner.current?.stop(); setRunning(false); };
  const decode = async (value) => {
    if (busy.current) return;
    busy.current = true; setReading(true); setError('');
    try {
      const data = await scanStation(stationToken(value), missionId);
      if (active.current) { stop(); onScanned(data); }
    } catch (e) {
      if (active.current) { stop(); setError(e.response?.data?.message || e.response?.data?.detail || e.message); }
    } finally { busy.current = false; if (active.current) setReading(false); }
  };
  const start = async () => {
    setError('');
    try {
      scanner.current?.destroy();
      scanner.current = new QrScanner(video.current, result => decode(result.data), { preferredCamera: 'environment', maxScansPerSecond: 4, returnDetailedScanResult: true });
      await scanner.current.start(); setRunning(true);
    } catch { setError('Camera unavailable. Allow camera access over HTTPS, or choose a photo of the station QR.'); }
  };
  const file = async e => {
    const image = e.target.files?.[0]; e.target.value = '';
    if (!image) return;
    if (image.size > 10 * 1024 * 1024) { setError('QR photo must be under 10 MB.'); return; }
    try { const result = await QrScanner.scanImage(image, { returnDetailedScanResult: true }); await decode(result.data); }
    catch { setError('No readable QR found. Take a clear photo of the full station QR.'); }
  };
  return <div className="station-scanner">
    <video ref={video} muted playsInline className={running ? 'qr-camera' : 'qr-camera qr-camera-idle'} />
    <div className="qr-controls">
      <button type="button" className="btn btn-outline" disabled={reading} onClick={running ? stop : start}>
        {running ? <Square size={16} /> : <Camera size={16} />} {running ? 'Stop camera' : 'Scan station QR'}
      </button>
      <label className="btn btn-secondary"><Upload size={16} /> QR photo<input className="sr-only" type="file" accept="image/*" onChange={file} disabled={reading} /></label>
    </div>
    {reading && <p role="status"><ScanLine size={16} /> Checking station...</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
