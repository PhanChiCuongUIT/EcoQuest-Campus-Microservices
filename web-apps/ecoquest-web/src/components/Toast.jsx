import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 size={18} color="var(--color-success)" />,
  error:   <XCircle size={18} color="var(--color-danger)" />,
  warning: <AlertTriangle size={18} color="var(--color-warning)" />,
  info:    <Info size={18} color="var(--color-info)" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback(({ type = 'info', message, sub, duration = 5000 }) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message, sub }]);
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-label="Notifications">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`} role="alert">
            <span className="toast-icon">{ICONS[t.type]}</span>
            <div className="toast-content">
              <div className="toast-message">{t.message}</div>
              {t.sub && <div className="toast-sub">{t.sub}</div>}
            </div>
            <button
              className="btn btn-ghost btn-icon"
              style={{ width: 28, height: 28, minHeight: 'unset', flexShrink: 0 }}
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
