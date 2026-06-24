/**
 * printCertificate — opens a new browser window with a highly premium,
 * beautifully styled HTML certificate designed specifically for landscape print
 * or save to PDF.
 */
export function printCertificate(cert) {
  const {
    studentId = 'Student',
    seasonId = 'Season',
    rankNumber = 1,
    points = 0,
    certificateType = 'WEEKLY',
    issuedOn,
    displayName,
  } = cert;

  const rankSuffix = { 1: 'st', 2: 'nd', 3: 'rd' }[rankNumber] || 'th';
  const dateStr = issuedOn
    ? new Date(issuedOn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const recipientName = displayName || studentId;
  const seasonLabel = seasonId.replace(/-/g, ' ');
  const typeLabel = certificateType === 'WEEKLY' ? 'Weekly' : certificateType === 'MONTHLY' ? 'Monthly' : certificateType;
  const rankEmoji = { 1: '🥇', 2: '🥈', 3: '🥉' }[rankNumber] || '🏅';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>EcoQuest Certificate — ${recipientName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel:wght@600;700;800&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    /* Reset & Page setup */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    @page {
      size: A4 landscape;
      margin: 0;
    }

    body {
      background-color: #2D3A31;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: 'Montserrat', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Outer dimensions matching A4 Landscape aspect ratio exactly */
    .cert-container {
      width: 297mm;
      height: 210mm;
      background: #FAF7F0;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24mm 32mm;
      box-shadow: 0 20px 50px rgba(0,0,0,0.4);
    }

    /* ── Background Patterns ── */
    .cert-bg-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.04;
      background-image: radial-gradient(circle at 50% 50%, #1c7c54 1px, transparent 1px),
                        radial-gradient(circle at 0 0, #1c7c54 1px, transparent 1px);
      background-size: 20px 20px;
      z-index: 1;
      pointer-events: none;
    }

    .cert-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 320px;
      opacity: 0.035;
      color: #1c7c54;
      z-index: 1;
      user-select: none;
      pointer-events: none;
      font-family: 'Cinzel', serif;
    }

    /* ── Elegant Double Borders ── */
    .border-outer {
      position: absolute;
      inset: 10mm;
      border: 1.5px solid #C59B27;
      z-index: 2;
      pointer-events: none;
    }

    .border-inner {
      position: absolute;
      inset: 13mm;
      border: 3px double #1C7C54;
      z-index: 2;
      pointer-events: none;
    }

    /* Corner Ornaments */
    .corner-ornament {
      position: absolute;
      width: 15mm;
      height: 15mm;
      z-index: 3;
    }
    .corner-tl { top: 12mm; left: 12mm; border-top: 3px solid #C59B27; border-left: 3px solid #C59B27; }
    .corner-tr { top: 12mm; right: 12mm; border-top: 3px solid #C59B27; border-right: 3px solid #C59B27; }
    .corner-bl { bottom: 12mm; left: 12mm; border-bottom: 3px solid #C59B27; border-left: 3px solid #C59B27; }
    .corner-br { bottom: 12mm; right: 12mm; border-bottom: 3px solid #C59B27; border-right: 3px solid #C59B27; }

    /* ── Content Layout ── */
    .cert-content {
      position: relative;
      z-index: 5;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
    }

    /* Header */
    .header-row {
      margin-top: 2mm;
    }

    .org-title {
      font-family: 'Cinzel', serif;
      font-size: 15px;
      font-weight: 700;
      color: #1C7C54;
      letter-spacing: 5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .org-subtitle {
      font-size: 9px;
      color: #7A8F82;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .divider-line {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 10px auto;
      width: 280px;
    }
    .divider-line .line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, transparent, #C59B27 50%, transparent);
    }
    .divider-line .star {
      font-size: 10px;
      color: #C59B27;
    }

    /* Main Certificate Text */
    .cert-label {
      font-family: 'Cinzel', serif;
      font-size: 11px;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #7A8F82;
      font-weight: 600;
      margin-top: 2mm;
    }

    .cert-main-title {
      font-family: 'Cinzel', serif;
      font-size: 32px;
      font-weight: 800;
      color: #1A2E22;
      letter-spacing: 2px;
      margin-top: 1mm;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.05);
    }

    .cert-presented-text {
      font-family: 'Cormorant Garamond', serif;
      font-size: 14px;
      font-style: italic;
      color: #5A6E62;
      margin-top: 3mm;
    }

    .recipient-name {
      font-family: 'Alex Brush', cursive;
      font-size: 52px;
      color: #1C7C54;
      line-height: 1.1;
      margin: 2mm 0;
      text-shadow: 1px 2px 3px rgba(28,124,84,0.15);
    }

    .student-info {
      font-size: 11px;
      color: #7A8F82;
      font-family: monospace;
      letter-spacing: 1px;
    }

    .achievement-description {
      font-family: 'Cormorant Garamond', serif;
      font-size: 16px;
      color: #4A5E51;
      max-width: 720px;
      margin: 4mm auto 0;
      line-height: 1.6;
    }
    .achievement-description strong {
      color: #1A2E22;
      font-weight: 700;
    }

    /* Metrics Strip */
    .metrics-container {
      display: flex;
      border: 1px solid rgba(28,124,84,0.15);
      background: rgba(28,124,84,0.02);
      border-radius: 6px;
      overflow: hidden;
      width: 480px;
      margin-top: 5mm;
    }
    .metric-cell {
      flex: 1;
      padding: 10px 14px;
      border-right: 1px solid rgba(28,124,84,0.15);
    }
    .metric-cell:last-child {
      border-right: none;
    }
    .metric-title {
      font-size: 8px;
      color: #7A8F82;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .metric-value {
      font-size: 15px;
      font-weight: 700;
      color: #1C7C54;
    }

    /* Bottom footer (ribbon seal & signatures) */
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
      margin-top: 6mm;
      padding: 0 10px;
    }

    /* Seal styling */
    .seal-wrap {
      width: 180px;
      text-align: left;
      position: relative;
    }

    /* Signatures */
    .signature-container {
      display: flex;
      gap: 50px;
    }
    .sig-box {
      text-align: center;
      width: 150px;
    }
    .sig-handwritten {
      font-family: 'Alex Brush', cursive;
      font-size: 24px;
      color: #1A2E22;
      height: 30px;
      line-height: 30px;
      opacity: 0.85;
      transform: rotate(-2deg);
    }
    .sig-line {
      width: 100%;
      height: 1px;
      background: #C59B27;
      margin: 4px 0;
    }
    .sig-name {
      font-size: 10px;
      font-weight: 700;
      color: #1A2E22;
    }
    .sig-title {
      font-size: 8px;
      color: #7A8F82;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Registry metadata */
    .registry-box {
      text-align: center;
      font-size: 8px;
      color: #9AAFA2;
      line-height: 1.5;
      max-width: 260px;
    }
    .registry-box strong {
      color: #7A8F82;
    }

    /* Print styles */
    @media print {
      body {
        background: none !important;
        background-color: #FAF7F0 !important;
      }
      .cert-container {
        box-shadow: none !important;
        margin: 0 !important;
        border: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <!-- Ornate background structures -->
    <div class="cert-bg-pattern"></div>
    <div class="cert-watermark">🌿</div>
    <div class="border-outer"></div>
    <div class="border-inner"></div>
    <div class="corner-ornament corner-tl"></div>
    <div class="corner-ornament corner-tr"></div>
    <div class="corner-ornament corner-bl"></div>
    <div class="corner-ornament corner-br"></div>

    <div class="cert-content">
      <!-- Top Title -->
      <div class="header-row">
        <div class="org-title">EcoQuest Campus Initiative</div>
        <div class="org-subtitle">Sustainability & Environmental Stewardship Board</div>
        <div class="divider-line">
          <div class="line"></div>
          <div class="star">★</div>
          <div class="line"></div>
        </div>
      </div>

      <!-- Main certificate content -->
      <div>
        <div class="cert-label">Certificate of Excellence</div>
        <div class="cert-main-title">Sustainability Award</div>
        <div class="cert-presented-text">This certificate of outstanding environmental achievement is proudly presented to</div>
        
        <div class="recipient-name">${recipientName}</div>
        <div class="student-info">Student Identifier: ${studentId}</div>

        <div class="achievement-description">
          In recognition of exemplary commitment and eco-friendly contributions during the 
          <strong>${typeLabel} ${seasonLabel}</strong> season, finishing in 
          <strong>${rankNumber}${rankSuffix} Place</strong> on the leaderboard and accumulating 
          <strong>${Number(points).toLocaleString()} green points</strong> for campus sustainability actions.
        </div>
      </div>

      <!-- Metrics Row -->
      <div class="metrics-container">
        <div class="metric-cell">
          <div class="metric-title">Season Type</div>
          <div class="metric-value" style="text-transform: capitalize;">${typeLabel}</div>
        </div>
        <div class="metric-cell">
          <div class="metric-title">Season Identifier</div>
          <div class="metric-value">${seasonLabel}</div>
        </div>
        <div class="metric-cell">
          <div class="metric-title font-weight-bold">Final Rank</div>
          <div class="metric-value">${rankEmoji} #${rankNumber}</div>
        </div>
        <div class="metric-cell">
          <div class="metric-title">Score</div>
          <div class="metric-value">${Number(points).toLocaleString()} Pts</div>
        </div>
      </div>

      <!-- Bottom elements -->
      <div class="footer-row">
        <!-- SVG Golden Seal -->
        <div class="seal-wrap">
          <svg width="76" height="92" viewBox="0 0 100 120" style="filter: drop-shadow(1px 2px 4px rgba(0,0,0,0.15));">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFE57F" />
                <stop offset="40%" stop-color="#FFC107" />
                <stop offset="70%" stop-color="#FFA000" />
                <stop offset="100%" stop-color="#FF6F00" />
              </linearGradient>
            </defs>
            <!-- Ribbon tails -->
            <path d="M35 60 L15 118 L42 106 L68 118 L50 60" fill="#1C7C54" stroke="#0e4c32" stroke-width="0.8"/>
            <path d="M48 60 L62 120 L76 108 L90 120 L72 60" fill="#C59B27" stroke="#94701e" stroke-width="0.8"/>
            <!-- Golden circular seal -->
            <circle cx="50" cy="50" r="36" fill="url(#goldGrad)" stroke="#C59B27" stroke-width="1.5"/>
            <circle cx="50" cy="50" r="30" fill="none" stroke="#FFF" stroke-width="1" stroke-dasharray="2 1.5" opacity="0.85"/>
            <circle cx="50" cy="50" r="28" fill="none" stroke="#B89047" stroke-width="0.5"/>
            
            <!-- Seal Text -->
            <text x="50" y="44" font-family="'Cinzel', serif" font-size="5" font-weight="bold" fill="#4E342E" text-anchor="middle" letter-spacing="1">EXCELLENCE</text>
            <text x="50" y="52" font-family="'Cinzel', serif" font-size="7" font-weight="bold" fill="#4E342E" text-anchor="middle">AWARD</text>
            <text x="50" y="59" font-family="'Cinzel', serif" font-size="4.5" font-weight="bold" fill="#1C7C54" text-anchor="middle" letter-spacing="0.5">ECOQUEST</text>
          </svg>
        </div>

        <!-- Registry QR / Info -->
        <div class="registry-box">
          <strong>ECOQUEST REGISTRY FOR SUSTAINABILITY</strong><br/>
          Certificate ID: <span>${cert.id || 'EQ-' + Math.random().toString(36).substr(2, 9).toUpperCase()}</span><br/>
          Issued on: <span>${dateStr}</span><br/>
          Secured via EcoQuest Ledger Verification API
        </div>

        <!-- Signature blocks -->
        <div class="signature-container">
          <div class="sig-box">
            <div class="sig-handwritten" style="font-family: 'Alex Brush', cursive;">Dr. Elena Vance</div>
            <div class="sig-line"></div>
            <div class="sig-name">Dr. Elena Vance</div>
            <div class="sig-title">Director of Sustainability</div>
          </div>
          <div class="sig-box">
            <div class="sig-handwritten" style="font-family: 'Alex Brush', cursive; font-size: 23px;">Prof. M. Thorne</div>
            <div class="sig-line"></div>
            <div class="sig-name">Prof. Marcus Thorne</div>
            <div class="sig-title">Office of Academic Affairs</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = () => {
      // Small timeout to ensure fonts load before printing
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=780');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
