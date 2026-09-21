import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer } from 'lucide-react';
import Modal from './Modal.jsx';
import { getStationQr } from '../api/ecoquestApi.js';
import { stationLink } from '../utils/stationQr.js';

export default function StationQrLabel({ station, onClose }) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    getStationQr(station.id).then(qr => QRCode.toDataURL(stationLink(qr.qrToken), { width: 900, margin: 4, errorCorrectionLevel: 'M' }))
      .then(url => { if (!disposed) setImage(url); }).catch(() => { if (!disposed) setError('Could not load station QR.'); });
    return () => { disposed = true; };
  }, [station.id]);
  const print = () => {
    const page = window.open('', '_blank', 'width=700,height=800');
    if (!page) { setError('Allow popups to print the station label.'); return; }
    page.document.title = 'EcoQuest Station';
    page.document.body.style.cssText = 'font-family:Arial,sans-serif;text-align:center;padding:30px;color:#172b22';
    const title = page.document.createElement('h1'); title.textContent = station.name; page.document.body.append(title);
    const location = page.document.createElement('p'); location.textContent = station.location; page.document.body.append(location);
    const img = page.document.createElement('img'); img.style.cssText = 'width:100%;max-width:400px'; img.alt = 'Station QR'; img.onload = () => { page.focus(); page.print(); }; img.src = image; page.document.body.append(img);
    const footer = page.document.createElement('p'); footer.textContent = 'EcoQuest Campus - Scan for station details and missions'; page.document.body.append(footer);
  };
  return <Modal isOpen onClose={onClose} title={`Station QR: ${station.name}`} footer={<>
    <a className={`btn btn-primary${image ? '' : ' disabled'}`} href={image || undefined} download={`ecoquest-${station.id}-qr.png`}><Download size={16} /> Download PNG</a>
    <button className="btn btn-outline" onClick={print} disabled={!image}><Printer size={16} /> Print label</button>
  </>}><div className="qr-label">{image && <img src={image} alt={`QR for ${station.name}`} />}<strong>{station.name}</strong><p>{station.location}</p>{error && <p role="alert">{error}</p>}</div></Modal>;
}
