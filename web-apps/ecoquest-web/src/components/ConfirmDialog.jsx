import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import Modal from './Modal.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const resolver = useRef(null);
  const [state, setState] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const confirm = useCallback((options) => new Promise(resolve => {
    resolver.current = resolve;
    setInputValue(options?.defaultValue || '');
    setState({
      title: 'Confirm action',
      message: 'Please confirm this action.',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      tone: 'primary',
      ...options,
    });
  }), []);

  const close = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
    setInputValue('');
  };

  const confirmedValue = state?.inputLabel ? inputValue.trim() : true;
  const disabled = state?.inputRequired && !inputValue.trim();
  const Icon = state?.tone === 'danger' ? Trash2 : state?.tone === 'warning' ? AlertTriangle : CheckCircle2;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        isOpen={!!state}
        onClose={() => close(state?.inputLabel ? null : false)}
        title={state?.title}
        titleIcon={state ? <Icon size={18} color={`var(--color-${state.tone === 'primary' ? 'primary' : state.tone})`} /> : null}
        size="sm"
        footer={state && (
          <>
            <button className="btn btn-ghost" onClick={() => close(state.inputLabel ? null : false)}>
              {state.cancelLabel}
            </button>
            <button
              className={`btn ${state.tone === 'danger' ? 'btn-danger' : state.tone === 'warning' ? 'btn-warning' : 'btn-primary'}`}
              disabled={disabled}
              onClick={() => close(confirmedValue)}
            >
              {state.confirmLabel}
            </button>
          </>
        )}
      >
        {state && (
          <div className="confirm-dialog-content">
            <p>{state.message}</p>
            {state.detail && <div className="confirm-dialog-detail">{state.detail}</div>}
            {state.inputLabel && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label" htmlFor="confirm-input">{state.inputLabel}</label>
                <textarea
                  id="confirm-input"
                  className="form-input"
                  rows={3}
                  value={inputValue}
                  onChange={event => setInputValue(event.target.value)}
                  placeholder={state.inputPlaceholder || ''}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
}
