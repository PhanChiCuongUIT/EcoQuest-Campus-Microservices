import React, { useEffect, useRef, useState } from 'react';
import { Bell, BookOpen, ChevronDown, LogOut, Moon, Sun, Menu, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  openNotificationStream,
} from '../api/ecoquestApi.js';
import Modal from './Modal.jsx';
import { useConfirm } from './ConfirmDialog.jsx';

export default function TopBar({ title, studentId, setStudentId, theme, toggleTheme, onMenuClick, onNavigate }) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getNotifications()
      .then(items => {
        if (!cancelled) {
          setNotifications(items || []);
          setUnread((items || []).filter(n => !n.read).length);
        }
      })
      .catch(() => {});
    const stream = openNotificationStream((notification) => {
      setNotifications(items => [notification, ...items]);
      if (!notification?.read) setUnread(count => count + 1);
    });
    return () => {
      cancelled = true;
      if (stream) stream.close();
    };
  }, [user?.id]);

  useEffect(() => {
    const close = event => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openInbox = async () => {
    setNotificationOpen(true);
    try {
      const items = await getNotifications();
      setNotifications(items || []);
      setUnread((items || []).filter(n => !n.read).length);
    } catch {
      // The existing list remains available while the backend reconnects.
    }
  };

  const markRead = async notification => {
    if (!notification.read) await markNotificationRead(notification.id);
    setNotifications(items => items.map(item => item.id === notification.id ? { ...item, read: true } : item));
    setUnread(count => Math.max(0, count - (notification.read ? 0 : 1)));
    if (notification.link?.startsWith('/')) onNavigate?.(notification.link.slice(1));
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    setNotifications(items => items.map(item => ({ ...item, read: true })));
    setUnread(0);
  };

  const handleLogout = async () => {
    const accepted = await confirm({
      title: 'Sign out of EcoQuest?',
      message: 'Your current session on this device will end.',
      confirmLabel: 'Sign out',
      tone: 'danger',
    });
    if (accepted) logout();
  };

  return (
    <header className="topbar">
      <button
        className="topbar-mobile-menu btn btn-ghost btn-icon"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Logo on mobile (hidden on desktop via CSS — sidebar shows it) */}
      <div className="topbar-logo-mobile" aria-hidden="true">
        <img src="/logo.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain', borderRadius: 4 }} />
      </div>

      <h1 className="topbar-title">{title}</h1>

      <div className="topbar-controls">
        {/* Student ID Selector (visible for relevant views) */}
        {setStudentId && (
          <div className="student-selector">
            <span className="student-selector-label">Student:</span>
            <input
              type="text"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              aria-label="Student ID"
              placeholder="SV001"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        {/* Theme Toggle */}
        <button
          className="theme-toggle"
          onClick={openInbox}
          aria-label="Notifications"
          title="Notifications"
          type="button"
          style={{ position: 'relative' }}
        >
          <Bell size={16} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16,
              padding: '0 4px', borderRadius: 8, background: 'var(--color-danger)',
              color: 'white', fontSize: 10, lineHeight: '16px', textAlign: 'center',
            }}>{unread}</span>
          )}
        </button>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Dark mode' : 'Light mode'}
          title={theme === 'dark' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {user && (
          <div className="account-menu-wrap" ref={accountRef}>
            <button className="account-trigger" onClick={() => setAccountOpen(open => !open)}>
            <img
              src={user.avatarUrl || '/logo.png'}
              alt={user.displayName || 'User avatar'}
            />
            <div>
              <strong>{user.displayName || user.email}</strong>
              <span>{user.role}</span>
            </div>
            <ChevronDown size={14} />
            </button>
            {accountOpen && (
              <div className="account-popover">
                <button onClick={() => { onNavigate?.('profile'); setAccountOpen(false); }}>
                  <User size={16} /> Profile
                </button>
                <button onClick={() => { setHelpOpen(true); setAccountOpen(false); }}>
                  <Shield size={16} /> Policy & privacy
                </button>
                <button onClick={() => { setHelpOpen(true); setAccountOpen(false); }}>
                  <BookOpen size={16} /> Application guide
                </button>
                <div className="account-popover-divider" />
                <button className="danger" onClick={handleLogout}>
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        title="Notifications"
        titleIcon={<Bell size={18} color="var(--color-primary)" />}
        size="lg"
        footer={<button className="btn btn-outline" onClick={markAll} disabled={unread === 0}>Mark all as read</button>}
      >
        <div className="notification-list">
          {notifications.length === 0 && <p className="muted-copy">No notifications yet.</p>}
          {notifications.map(notification => (
            <button
              key={notification.id}
              className={`notification-item${notification.read ? '' : ' unread'}`}
              onClick={() => markRead(notification)}
            >
              <span className="notification-dot" />
              <span>
                <strong>{notification.title}</strong>
                <small>{notification.message}</small>
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="EcoQuest guide & policy" size="lg">
        <div className="help-copy">
          <h3>Using EcoQuest responsibly</h3>
          <p>Submit only actions you performed and attach clear, relevant evidence. Moderators review pending evidence and reports; administrators manage policy, users, catalog, and system analytics.</p>
          <h3>Privacy</h3>
          <p>Uploaded evidence, avatars, station images, reports, points, badges, and certificates are stored by their owning microservice for the campus demonstration environment.</p>
        </div>
      </Modal>
    </header>
  );
}
