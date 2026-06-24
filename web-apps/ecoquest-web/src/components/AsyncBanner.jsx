import React from 'react';
import { Info, X } from 'lucide-react';

export default function AsyncBanner({ type = 'info', message, onDismiss }) {
  return (
    <div className={`async-banner ${type}`} role="status" aria-live="polite">
      <Info size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          className="btn btn-ghost btn-icon"
          style={{ width: 24, height: 24, minHeight: 'unset' }}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
