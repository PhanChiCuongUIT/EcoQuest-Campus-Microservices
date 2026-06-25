import React from 'react';

const PALETTE = ['#1c7c54', '#18a999', '#e0a526', '#d45d5d', '#4f78c4', '#7d5bb4'];

export function DonutChart({ title, rows, centerLabel = 'Total' }) {
  const clean = rows.filter(row => Number(row.value) > 0);
  const total = clean.reduce((sum, row) => sum + Number(row.value), 0);
  let offset = 0;
  const gradient = clean.length
    ? clean.map((row, index) => {
        const start = offset;
        offset += Number(row.value) / total * 100;
        return `${row.color || PALETTE[index % PALETTE.length]} ${start}% ${offset}%`;
      }).join(', ')
    : 'var(--color-border) 0 100%';

  return (
    <section className="dashboard-visual">
      <div className="dashboard-visual-header"><strong>{title}</strong></div>
      <div className="donut-layout">
        <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}>
          <div><strong>{total}</strong><span>{centerLabel}</span></div>
        </div>
        <div className="chart-legend">
          {rows.map((row, index) => (
            <div key={row.label}>
              <i style={{ background: row.color || PALETTE[index % PALETTE.length] }} />
              <span>{row.label}</span><strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ColumnChart({ title, rows }) {
  const max = Math.max(1, ...rows.map(row => Number(row.value) || 0));
  return (
    <section className="dashboard-visual">
      <div className="dashboard-visual-header"><strong>{title}</strong></div>
      <div className={`column-chart${rows.length === 0 ? ' is-empty' : ''}`} aria-label={title}>
        {rows.length === 0 && <p className="muted-copy">No activity yet.</p>}
        {rows.map((row, index) => (
          <div className="column-chart-item" key={row.label}>
            <strong>{row.value}</strong>
            <div><i style={{
              height: `${Math.max(6, (Number(row.value) || 0) / max * 100)}%`,
              background: row.color || PALETTE[index % PALETTE.length],
            }} /></div>
            <span title={row.label}>{row.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AreaChart({ title, rows, valueLabel = 'Activity' }) {
  const width = 560;
  const height = 190;
  const padding = 24;
  const max = Math.max(1, ...rows.map(row => Number(row.value) || 0));
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? width / 2 : padding + index * ((width - padding * 2) / (rows.length - 1));
    const y = height - padding - (Number(row.value) || 0) / max * (height - padding * 2);
    return { ...row, x, y };
  });
  const line = points.map(point => `${point.x},${point.y}`).join(' ');
  const area = points.length
    ? `${padding},${height - padding} ${line} ${width - padding},${height - padding}`
    : '';

  return (
    <section className="dashboard-visual dashboard-visual-wide">
      <div className="dashboard-visual-header"><strong>{title}</strong><span>{valueLabel}</span></div>
      {points.length === 0 ? <p className="muted-copy">No activity yet.</p> : (
        <>
          <svg className="area-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
            <defs>
              <linearGradient id={`area-${title.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c7c54" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#1c7c54" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map(level => (
              <line key={level} x1={padding} x2={width - padding} y1={height * level} y2={height * level} className="area-grid-line" />
            ))}
            <polygon points={area} fill={`url(#area-${title.replace(/\W/g, '')})`} />
            <polyline points={line} className="area-line" />
            {points.map(point => <circle key={point.label} cx={point.x} cy={point.y} r="4" className="area-point" />)}
          </svg>
          <div className="area-labels">
            {rows.map(row => <span key={row.label}>{row.label}<strong>{row.value}</strong></span>)}
          </div>
        </>
      )}
    </section>
  );
}
